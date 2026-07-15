import "client-only";
import { DEFAULT_TRACK_ID } from "@/lib/music/bundled-tracks";

const SELECTED_TRACK_KEY = "listy:music-selected-track";
const MUTED_KEY = "listy:music-muted";

/**
 * Background-music preferences are a distinct concept from the
 * mark_task/end_list sound-effects mute flag (src/lib/audio/sound-manager.ts's
 * own localStorage key) — muting one must never affect the other.
 */
export function readSelectedTrackId(): string {
  try {
    return window.localStorage.getItem(SELECTED_TRACK_KEY) ?? DEFAULT_TRACK_ID;
  } catch {
    return DEFAULT_TRACK_ID;
  }
}

export function writeSelectedTrackId(trackId: string): void {
  try {
    window.localStorage.setItem(SELECTED_TRACK_KEY, trackId);
  } catch {
    // Ignore storage failures (e.g. private browsing).
  }
}

export function readMusicMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTED_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeMusicMuted(muted: boolean): void {
  try {
    window.localStorage.setItem(MUTED_KEY, String(muted));
  } catch {
    // Ignore storage failures.
  }
}
