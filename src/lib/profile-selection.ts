import "client-only";

const STORAGE_KEY = "listy:selected-profile-id";

/** The active profile is a client-only convenience, not server state. */
export function getSelectedProfileId(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setSelectedProfileId(profileId: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, profileId);
  } catch {
    // Ignore storage failures (e.g. private browsing) — the app still
    // works, it just re-prompts for profile selection more often.
  }
}

export function clearSelectedProfileId(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // See above.
  }
}
