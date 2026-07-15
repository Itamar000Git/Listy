import { describe, expect, it } from "vitest";
import { BUNDLED_TRACKS, DEFAULT_TRACK_ID, isBundledTrackId } from "@/lib/music/bundled-tracks";

describe("BUNDLED_TRACKS", () => {
  it("registers the exact three approved asset paths", () => {
    const srcs = BUNDLED_TRACKS.map((t) => t.src);
    expect(srcs).toContain("/audio/goodmorning.mp3");
    expect(srcs).toContain("/audio/happykids.mp3");
    expect(srcs).toContain("/audio/morningmusic.mp3");
    expect(srcs).toHaveLength(3);
  });

  it("uses friendly Hebrew display names for each track", () => {
    const byId = Object.fromEntries(BUNDLED_TRACKS.map((t) => [t.id, t.name]));
    expect(byId.goodmorning).toBe("בוקר טוב");
    expect(byId.happykids).toBe("ילדים שמחים");
    expect(byId.morningmusic).toBe("מוזיקת בוקר");
  });

  it("the default selected track is one of the bundled tracks", () => {
    expect(isBundledTrackId(DEFAULT_TRACK_ID)).toBe(true);
  });

  it("isBundledTrackId returns false for an imported-track ID", () => {
    expect(isBundledTrackId("some-random-uuid")).toBe(false);
  });
});
