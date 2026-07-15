/**
 * Background-music tracks (distinct from the mark_task/end_list sound
 * *effects* in src/lib/audio/sound-manager.ts — these are looped
 * ambient tracks the family can choose, not completion feedback).
 * Exact existing files under /public/audio — never renamed or replaced.
 */
export type BundledTrack = {
  id: string;
  name: string;
  src: string;
};

export const BUNDLED_TRACKS: readonly BundledTrack[] = [
  { id: "goodmorning", name: "בוקר טוב", src: "/audio/goodmorning.mp3" },
  { id: "happykids", name: "ילדים שמחים", src: "/audio/happykids.mp3" },
  { id: "morningmusic", name: "מוזיקת בוקר", src: "/audio/morningmusic.mp3" },
] as const;

export const DEFAULT_TRACK_ID = "goodmorning";

export function isBundledTrackId(id: string): boolean {
  return BUNDLED_TRACKS.some((track) => track.id === id);
}
