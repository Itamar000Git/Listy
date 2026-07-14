"use client";

import { HeartExplosion } from "@/components/celebration/HeartExplosion";

/**
 * Orchestrates the full-list celebration visuals (specification §13-14).
 * The "once per cycle" guarantee is enforced server-side — this
 * component only renders when the caller has already observed
 * `celebrationTriggered: true` from the toggle-completion API response,
 * so it never needs its own replay-tracking logic.
 *
 * The end-of-list sound is deliberately NOT played here — it plays only
 * when the user presses "סיימתי את המשימות" (see StickyListActions'
 * onFinish), not automatically when the last task is ticked off.
 */
export function VictoryOverlay({ onDismiss }: { onDismiss: () => void }) {
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
