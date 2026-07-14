"use client";

import { useEffect } from "react";
import { HeartExplosion } from "@/components/celebration/HeartExplosion";
import { soundManager } from "@/lib/audio/sound-manager";

/**
 * Orchestrates the full-list celebration (specification §13-14). The
 * "once per cycle" guarantee is enforced server-side — this component
 * only renders when the caller has already observed
 * `celebrationTriggered: true` from the toggle-completion API response,
 * so it never needs its own replay-tracking logic.
 */
export function VictoryOverlay({ onDismiss }: { onDismiss: () => void }) {
  useEffect(() => {
    soundManager.playListCompleted();
  }, []);

  return (
    <>
      <HeartExplosion onDone={onDismiss} />
      <div
        className="pointer-events-none fixed inset-x-4 top-1/3 z-40 flex justify-center"
        role="status"
      >
        <div className="animate-heart-pop-in rounded-2xl bg-surface/95 px-6 py-4 text-center shadow-lg">
          <p className="text-xl font-bold text-text">כל הכבוד!</p>
          <p className="mt-1 text-base text-text-muted">סיימת את כל המשימות!</p>
        </div>
      </div>
    </>
  );
}
