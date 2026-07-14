import "client-only";

const MUTE_STORAGE_KEY = "listy:sound-muted";

const MARK_TASK_SRC = "/audio/mark_task.mp3";
const END_LIST_SRC = "/audio/end_list.mp3";

let markTaskEl: HTMLAudioElement | null = null;
let endListEl: HTMLAudioElement | null = null;
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
  if (!markTaskEl) {
    markTaskEl = new Audio(MARK_TASK_SRC);
    markTaskEl.preload = "auto";
  }
  if (!endListEl) {
    endListEl = new Audio(END_LIST_SRC);
    endListEl.preload = "auto";
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

  for (const el of [markTaskEl, endListEl]) {
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
  /** Plays when an individual task is marked as completed. */
  playTaskCompleted() {
    ensureElements();
    play(markTaskEl);
  },
  /** Plays once when the entire list is completed and the celebration triggers. */
  playListCompleted() {
    ensureElements();
    play(endListEl);
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
