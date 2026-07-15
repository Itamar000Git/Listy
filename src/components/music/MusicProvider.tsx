"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BUNDLED_TRACKS, DEFAULT_TRACK_ID, isBundledTrackId } from "@/lib/music/bundled-tracks";
import {
  addLocalTrack,
  deleteLocalTrack,
  getLocalTrackBlob,
  listLocalTracks,
  type LocalTrackMeta,
} from "@/lib/music/local-tracks-db";
import { MAX_IMPORTED_TRACKS, displayNameFromFileName, validateMp3File } from "@/lib/music/validate-mp3";
import {
  readMusicMuted,
  readSelectedTrackId,
  writeMusicMuted,
  writeSelectedTrackId,
} from "@/lib/music/music-preferences";

const BACKGROUND_MUSIC_VOLUME = 0.28;

export type MusicTrackOption = {
  id: string;
  name: string;
  isLocal: boolean;
};

export type ImportResult = { ok: true } | { ok: false; message: string };

type MusicContextValue = {
  tracks: MusicTrackOption[];
  selectedTrackId: string;
  isPlaying: boolean;
  isMuted: boolean;
  isLoadingLocalTracks: boolean;
  play: () => void;
  pause: () => void;
  selectTrack: (trackId: string) => void;
  toggleMuted: () => void;
  importTrack: (file: File) => Promise<ImportResult>;
  deleteTrack: (trackId: string) => Promise<void>;
};

const MusicContext = createContext<MusicContextValue | undefined>(undefined);

function resolveBundledSrc(trackId: string): string | null {
  return BUNDLED_TRACKS.find((t) => t.id === trackId)?.src ?? null;
}

export function MusicProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const loadedTrackIdRef = useRef<string | null>(null);

  const [selectedTrackId, setSelectedTrackId] = useState(DEFAULT_TRACK_ID);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [localTracks, setLocalTracks] = useState<LocalTrackMeta[]>([]);
  const [isLoadingLocalTracks, setIsLoadingLocalTracks] = useState(true);

  // Restore preferences + local track list on mount. Never autoplays.
  // Reading localStorage/IndexedDB is a browser-only side effect that
  // can't happen during the initial render (SSR has neither), so the
  // sync-on-mount pattern here is intentional, same as useOnlineStatus.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedTrackId(readSelectedTrackId());
    setIsMuted(readMusicMuted());

    listLocalTracks()
      .then(setLocalTracks)
      .catch(() => setLocalTracks([]))
      .finally(() => setIsLoadingLocalTracks(false));

    const audio = new Audio();
    audio.loop = true;
    audio.preload = "none";
    audio.volume = BACKGROUND_MUSIC_VOLUME;
    audio.muted = readMusicMuted();
    audioRef.current = audio;

    const handlePause = () => setIsPlaying(false);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handlePause);

    return () => {
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handlePause);
      audio.pause();
      audio.src = "";
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      audioRef.current = null;
    };
  }, []);

  const resolveTrackSrc = useCallback(async (trackId: string): Promise<string | null> => {
    const bundledSrc = resolveBundledSrc(trackId);
    if (bundledSrc) return bundledSrc;

    const blob = await getLocalTrackBlob(trackId);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }, []);

  /** Loads `trackId` into the shared <audio> element if not already loaded, swapping out any local-track object URL. */
  const ensureTrackLoaded = useCallback(
    async (trackId: string): Promise<boolean> => {
      const audio = audioRef.current;
      if (!audio) return false;
      if (loadedTrackIdRef.current === trackId && audio.src) return true;

      const src = await resolveTrackSrc(trackId);
      if (!src) return false;

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      if (!isBundledTrackId(trackId)) {
        objectUrlRef.current = src;
      }

      audio.src = src;
      loadedTrackIdRef.current = trackId;
      return true;
    },
    [resolveTrackSrc],
  );

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    ensureTrackLoaded(selectedTrackId).then((loaded) => {
      if (!loaded) return;
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          // Autoplay blocked or another playback failure — fail safely,
          // never claim playback that didn't actually start.
          setIsPlaying(false);
        });
    });
  }, [ensureTrackLoaded, selectedTrackId]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const selectTrack = useCallback(
    (trackId: string) => {
      setSelectedTrackId(trackId);
      writeSelectedTrackId(trackId);
      const wasPlaying = isPlaying;
      const audio = audioRef.current;
      if (audio && !audio.paused) audio.pause();
      ensureTrackLoaded(trackId).then((loaded) => {
        if (!loaded || !wasPlaying || !audioRef.current) return;
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      });
    },
    [ensureTrackLoaded, isPlaying],
  );

  const toggleMuted = useCallback(() => {
    setIsMuted((current) => {
      const next = !current;
      writeMusicMuted(next);
      if (audioRef.current) audioRef.current.muted = next;
      return next;
    });
  }, []);

  const importTrack = useCallback(async (file: File): Promise<ImportResult> => {
    const validation = validateMp3File(file);
    if (!validation.ok) return validation;

    const currentCount = await listLocalTracks().then((t) => t.length);
    if (currentCount >= MAX_IMPORTED_TRACKS) {
      return { ok: false, message: `אפשר להוסיף עד ${MAX_IMPORTED_TRACKS} שירים מקומיים.` };
    }

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      await addLocalTrack({
        id,
        displayName: displayNameFromFileName(file.name),
        originalFileName: file.name,
        mimeType: file.type || "audio/mpeg",
        size: file.size,
        addedAt: Date.now(),
        blob: file,
      });
    } catch {
      return { ok: false, message: "לא ניתן היה לשמור את השיר במכשיר. נסו לפנות מקום ולנסות שוב." };
    }

    const updated = await listLocalTracks().catch(() => []);
    setLocalTracks(updated);
    return { ok: true };
  }, []);

  const deleteTrack = useCallback(
    async (trackId: string) => {
      if (isBundledTrackId(trackId)) return; // bundled tracks can never be deleted

      if (selectedTrackId === trackId) {
        audioRef.current?.pause();
        setIsPlaying(false);
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
        loadedTrackIdRef.current = null;
        if (audioRef.current) audioRef.current.src = "";
        setSelectedTrackId(DEFAULT_TRACK_ID);
        writeSelectedTrackId(DEFAULT_TRACK_ID);
      }

      await deleteLocalTrack(trackId);
      const updated = await listLocalTracks().catch(() => []);
      setLocalTracks(updated);
    },
    [selectedTrackId],
  );

  const tracks = useMemo<MusicTrackOption[]>(
    () => [
      ...BUNDLED_TRACKS.map((t) => ({ id: t.id, name: t.name, isLocal: false })),
      ...localTracks.map((t) => ({ id: t.id, name: t.displayName, isLocal: true })),
    ],
    [localTracks],
  );

  const value: MusicContextValue = {
    tracks,
    selectedTrackId,
    isPlaying,
    isMuted,
    isLoadingLocalTracks,
    play,
    pause,
    selectTrack,
    toggleMuted,
    importTrack,
    deleteTrack,
  };

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}

export function useMusic(): MusicContextValue {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error("useMusic must be used within a MusicProvider");
  }
  return context;
}
