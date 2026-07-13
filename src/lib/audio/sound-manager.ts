import "client-only";

const MUTE_STORAGE_KEY = "listy:sound-muted";

/**
 * Placeholder audio — synthesized tones under /public/audio, not real
 * applause/crowd/trumpet recordings. Swap for licensed royalty-free
 * assets before real use; the playback mechanics below don't change.
 */
const APPLAUSE_SRC = "/audio/applause.mp3";
const CELEBRATION_SRC = "/audio/celebration.mp3";

let applauseEl: HTMLAudioElement | null = null;
let celebrationEl: HTMLAudioElement | null = null;
let unlocked = false;

function readMutedPreference(): boolean {
  try {
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

let muted = typeof window !== "undefined" ? readMutedPreference() : false;

function ensureElements() {
  if (typeof window === "undefined") return;
  if (!applauseEl) {
    applauseEl = new Audio(APPLAUSE_SRC);
    applauseEl.preload = "auto";
  }
  if (!celebrationEl) {
    celebrationEl = new Audio(CELEBRATION_SRC);
    celebrationEl.preload = "auto";
  }
}

/**
 * Mobile browsers (Safari in particular) only allow audio playback
 * that originates from a user gesture's call stack. Playing-then-
 * immediately-pausing each element on the first tap "unlocks" them so
 * a later programmatic play() (e.g. after an async server response)
 * is allowed to produce sound.
 */
function unlock() {
  if (unlocked || typeof window === "undefined") return;
  unlocked = true;
  ensureElements();

  for (const el of [applauseEl, celebrationEl]) {
    if (!el) continue;
    const playPromise = el.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(() => {
          el.pause();
          el.currentTime = 0;
        })
        .catch(() => {
          // Autoplay was blocked even for the silent unlock attempt —
          // playback will simply fail silently later too, which is fine.
        });
    }
  }
}

function attachUnlockListeners() {
  if (typeof window === "undefined") return;
  const events: Array<keyof WindowEventMap> = ["pointerdown", "touchend", "keydown"];
  const handler = () => {
    unlock();
    events.forEach((event) => window.removeEventListener(event, handler));
  };
  events.forEach((event) => window.addEventListener(event, handler, { once: true }));
}

attachUnlockListeners();

function play(el: HTMLAudioElement | null) {
  if (!el || muted) return;
  try {
    el.currentTime = 0;
    const playPromise = el.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        // Playback failure (blocked, not yet unlocked, network hiccup)
        // must never block or roll back the task completion it
        // accompanies — fail silently.
      });
    }
  } catch {
    // See above.
  }
}

export const soundManager = {
  playApplause() {
    ensureElements();
    play(applauseEl);
  },
  playCelebration() {
    ensureElements();
    play(celebrationEl);
  },
  isMuted(): boolean {
    return muted;
  },
  setMuted(value: boolean) {
    muted = value;
    try {
      window.localStorage.setItem(MUTE_STORAGE_KEY, String(value));
    } catch {
      // Ignore storage failures (e.g. private browsing).
    }
  },
};
