"use client";

import { useState } from "react";
import { soundManager } from "@/lib/audio/sound-manager";

export function SoundToggle() {
  const [muted, setMuted] = useState(() => soundManager.isMuted());

  function handleClick() {
    const next = !muted;
    soundManager.setMuted(next);
    setMuted(next);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={muted}
      aria-label={muted ? "הפעלת צליל" : "השתקת צליל"}
      className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-text active:bg-lavender/20"
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
