"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useMusic } from "@/components/music/MusicProvider";
import { ConfirmationDialog } from "@/components/actions/ConfirmationDialog";

/**
 * Compact corner music button + panel (background-music feature).
 * Deliberately its own small overlay rather than reusing
 * ConfirmationDialog's centered-modal styling, since this needs to stay
 * open across multiple interactions (track switches, mute toggles,
 * import) rather than close after a single confirm/cancel.
 */
export function MusicMenu() {
  const music = useMusic();
  const [open, setOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function handlePointerDown(event: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setImportError(null);
    setImporting(true);
    try {
      const result = await music.importTrack(file);
      if (!result.ok) setImportError(result.message);
    } finally {
      setImporting(false);
    }
  }

  const selectedTrack = music.tracks.find((t) => t.id === music.selectedTrackId);
  const trackPendingDelete = music.tracks.find((t) => t.id === confirmDeleteId);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="פתיחת תפריט מוזיקת רקע"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-text active:bg-lavender/20"
      >
        🎵
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="fixed inset-x-4 top-16 z-30 mx-auto flex max-h-[70vh] max-w-sm flex-col gap-3 overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-lg"
        >
          <h2 id={titleId} className="text-base font-bold text-text">
            מוזיקת רקע
          </h2>

          <div className="flex items-center justify-between gap-2 rounded-2xl bg-light-blue/30 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-text">{selectedTrack?.name ?? "אין שיר נבחר"}</p>
              <p className="text-xs text-text-muted">{music.isPlaying ? "מתנגן" : "מושהה"}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => (music.isPlaying ? music.pause() : music.play())}
                aria-label={music.isPlaying ? "השהיית מוזיקת רקע" : "הפעלת מוזיקת רקע"}
                aria-pressed={music.isPlaying}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-lg shadow-sm"
              >
                {music.isPlaying ? "⏸️" : "▶️"}
              </button>
              <button
                type="button"
                onClick={music.toggleMuted}
                aria-label={music.isMuted ? "ביטול השתקת מוזיקת רקע" : "השתקת מוזיקת רקע"}
                aria-pressed={music.isMuted}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-lg shadow-sm"
              >
                {music.isMuted ? "🔇" : "🔊"}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-text-muted">שירים מובנים</span>
            {music.tracks
              .filter((t) => !t.isLocal)
              .map((track) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  isSelected={track.id === music.selectedTrackId}
                  onSelect={() => music.selectTrack(track.id)}
                  onDelete={null}
                />
              ))}
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-text-muted">שירים מקומיים</span>
            {music.isLoadingLocalTracks ? (
              <p className="text-xs text-text-muted">טוענים...</p>
            ) : music.tracks.filter((t) => t.isLocal).length === 0 ? (
              <p className="text-xs text-text-muted">עדיין לא נוספו שירים.</p>
            ) : (
              music.tracks
                .filter((t) => t.isLocal)
                .map((track) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    isSelected={track.id === music.selectedTrackId}
                    onSelect={() => music.selectTrack(track.id)}
                    onDelete={() => setConfirmDeleteId(track.id)}
                  />
                ))
            )}

            <p className="mt-1 text-xs text-text-muted">
              שירים שהוספת נשמרים רק במכשיר ובדפדפן הזה.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="audio/mpeg,.mp3"
              className="hidden"
              onChange={handleFileSelected}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="mt-1 flex min-h-11 items-center justify-center rounded-2xl border-2 border-dashed border-border text-sm font-bold text-text-muted disabled:opacity-50"
            >
              {importing ? "טוענים..." : "הוספת שיר MP3"}
            </button>
            {importError ? <p className="text-xs text-danger">{importError}</p> : null}
          </div>
        </div>
      ) : null}

      <ConfirmationDialog
        open={confirmDeleteId !== null}
        title={`למחוק את "${trackPendingDelete?.name ?? ""}"?`}
        description="השיר יימחק מהמכשיר הזה בלבד."
        confirmLabel="מחיקה"
        destructive
        onConfirm={async () => {
          if (confirmDeleteId) await music.deleteTrack(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}

function TrackRow({
  track,
  isSelected,
  onSelect,
  onDelete,
}: {
  track: { id: string; name: string };
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (() => void) | null;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        className={[
          "flex min-h-11 flex-1 items-center justify-between rounded-2xl border-2 px-3 text-start text-sm font-bold",
          isSelected ? "border-pink bg-pink/20 text-text" : "border-border bg-surface text-text-muted",
        ].join(" ")}
      >
        <span className="min-w-0 truncate">{track.name}</span>
        {isSelected ? <span aria-hidden>🎶</span> : null}
      </button>
      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`מחיקת השיר ${track.name}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-danger"
        >
          🗑️
        </button>
      ) : null}
    </div>
  );
}
