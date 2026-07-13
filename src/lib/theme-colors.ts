/**
 * Static mapping from a profile's themeColor value to a Tailwind class.
 * Written out literally (not built with a template string) so
 * Tailwind's build-time scanner can find each class name in source —
 * `bg-${themeColor}` would not be detected since the scanner only sees
 * literal text, not runtime values.
 */
export const THEME_COLOR_BG_CLASS: Record<string, string> = {
  lavender: "bg-lavender",
  "light-pink": "bg-light-pink",
  pink: "bg-pink",
  "light-blue": "bg-light-blue",
  "sky-blue": "bg-sky-blue",
};

export const THEME_COLOR_OPTIONS = [
  { value: "lavender", label: "סגול בהיר" },
  { value: "light-pink", label: "ורוד בהיר" },
  { value: "pink", label: "ורוד" },
  { value: "light-blue", label: "כחול בהיר" },
  { value: "sky-blue", label: "תכלת" },
] as const;
