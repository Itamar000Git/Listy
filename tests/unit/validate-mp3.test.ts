import { describe, expect, it } from "vitest";
import {
  MAX_IMPORTED_TRACK_BYTES,
  displayNameFromFileName,
  validateMp3File,
} from "@/lib/music/validate-mp3";

function makeFile(name: string, size: number, type: string): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

describe("validateMp3File", () => {
  it("accepts a valid .mp3 file with the expected MIME type", () => {
    const file = makeFile("song.mp3", 1024, "audio/mpeg");
    expect(validateMp3File(file)).toEqual({ ok: true });
  });

  it("accepts a .mp3 file with no MIME type (some browsers omit it)", () => {
    const file = makeFile("song.mp3", 1024, "");
    expect(validateMp3File(file)).toEqual({ ok: true });
  });

  it("is case-insensitive about the .mp3 extension", () => {
    const file = makeFile("SONG.MP3", 1024, "audio/mpeg");
    expect(validateMp3File(file)).toEqual({ ok: true });
  });

  it("rejects a non-mp3 file", () => {
    const file = makeFile("song.wav", 1024, "audio/wav");
    const result = validateMp3File(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toBe("אפשר להוסיף קובצי MP3 בלבד.");
  });

  it("rejects a non-audio file even with a .mp3 name (MIME type mismatch)", () => {
    const file = makeFile("fake.mp3", 1024, "text/plain");
    expect(validateMp3File(file).ok).toBe(false);
  });

  it("rejects an empty file", () => {
    const file = makeFile("empty.mp3", 0, "audio/mpeg");
    const result = validateMp3File(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toBe("הקובץ ריק.");
  });

  it("rejects a file larger than the configured limit", () => {
    const file = makeFile("huge.mp3", MAX_IMPORTED_TRACK_BYTES + 1, "audio/mpeg");
    const result = validateMp3File(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toBe("הקובץ גדול מדי. ניתן להוסיף שיר בגודל של עד 20MB.");
  });

  it("accepts a file exactly at the size limit", () => {
    const file = makeFile("exact.mp3", MAX_IMPORTED_TRACK_BYTES, "audio/mpeg");
    expect(validateMp3File(file).ok).toBe(true);
  });
});

describe("displayNameFromFileName", () => {
  it("strips the .mp3 extension", () => {
    expect(displayNameFromFileName("My Favorite Song.mp3")).toBe("My Favorite Song");
  });

  it("falls back to a placeholder for an empty name", () => {
    expect(displayNameFromFileName(".mp3")).toBe("שיר ללא שם");
  });

  it("renders as plain text — never interprets HTML/script content in the filename", () => {
    const name = displayNameFromFileName("<script>alert(1)</script>.mp3");
    // The function must not strip or execute markup — it's just text;
    // the UI is responsible for rendering it as text, not HTML.
    expect(name).toBe("<script>alert(1)</script>");
    expect(typeof name).toBe("string");
  });
});
