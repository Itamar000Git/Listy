import "client-only";

export const MAX_IMPORTED_TRACK_BYTES = 20 * 1024 * 1024; // 20MB
export const MAX_IMPORTED_TRACKS = 10;

const ACCEPTED_MIME_TYPES = new Set(["audio/mpeg", "audio/mp3"]);

export type Mp3ValidationResult = { ok: true } | { ok: false; message: string };

/**
 * Local, client-side-only validation (specification: MP3 import) —
 * extension + MIME type (when the browser supplies one; not all do) +
 * a bounded size. Never trusts the filename beyond checking its
 * extension; the display name is rendered as plain text elsewhere, never
 * interpreted as markup.
 */
export function validateMp3File(file: File): Mp3ValidationResult {
  if (file.size === 0) {
    return { ok: false, message: "הקובץ ריק." };
  }
  if (file.size > MAX_IMPORTED_TRACK_BYTES) {
    return { ok: false, message: "הקובץ גדול מדי. ניתן להוסיף שיר בגודל של עד 20MB." };
  }

  const hasMp3Extension = /\.mp3$/i.test(file.name);
  const hasAcceptedMimeType = file.type === "" || ACCEPTED_MIME_TYPES.has(file.type.toLowerCase());

  if (!hasMp3Extension || !hasAcceptedMimeType) {
    return { ok: false, message: "אפשר להוסיף קובצי MP3 בלבד." };
  }

  return { ok: true };
}

/** Strips any path/extension noise from a filename for display — plain text only, never rendered as markup. */
export function displayNameFromFileName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.mp3$/i, "");
  const trimmed = withoutExtension.trim();
  return trimmed.length > 0 ? trimmed : "שיר ללא שם";
}
