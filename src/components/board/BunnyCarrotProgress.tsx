"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

const BUNNY_SRC = "/images/brand/listy-bunny.png";
const CARROT_SRC = "/images/brand/listy-carrot.png";

// Native asset dimensions (see public/images/brand) — used only to size
// the elements before CSS transforms are applied, never edited.
const BUNNY_NATIVE_SIZE = 1280;
const CARROT_NATIVE_WIDTH = 620;
const CARROT_NATIVE_HEIGHT = 800;

const STAGE_HEIGHT_PX = 72;
const STAGE_WIDTH_PX = 200;

// The source carrot artwork is drawn on a diagonal (pointed tip toward
// the bottom-left, leaves toward the top-right). These transform values
// were tuned by visually rendering the composition (rotate the diagonal
// down to horizontal, tip-left/leaves-right, then scale+nudge to fill
// the stage). Adjust together if the source asset ever changes.
const CARROT_ROTATE_DEG = 60;
const CARROT_SCALE = 0.26;
const CARROT_OFFSET_X_PX = -6;

const BITE_DURATION_MS = 350;

/**
 * Fraction of the carrot still visible, clamped to [0, 1]. An empty list
 * (taskCount === 0) is treated as "full carrot, nothing eaten yet" —
 * callers hide the composition entirely in that case instead (see
 * BunnyCarrotProgress below), so this value is moot there, but stays
 * well-defined rather than dividing by zero.
 */
export function computeRemainingCarrotRatio(taskCount: number, completedCount: number): number {
  if (taskCount <= 0) return 1;
  return Math.max(0, Math.min(1, (taskCount - completedCount) / taskCount));
}

export type BunnyCarrotProgressProps = {
  taskCount: number;
  completedCount: number;
  /**
   * Bumped by the caller only immediately after a server-confirmed
   * incomplete→complete transition (see the task board's handleToggle).
   * Any other change — marking a task incomplete, a failed/offline
   * mutation, the initial Firestore snapshot on mount, or a remote
   * device's update arriving over the listener — must NOT bump this,
   * so the bite animation only plays for an action this device just
   * confirmed, never for historical or remote progress.
   */
  completionEventId: number | string;
};

/**
 * Decorative bunny-eats-the-carrot progress visual, additional to (not a
 * replacement for) TaskProgress's numeric text. Purely presentational —
 * the actual "did this complete" and "is a celebration due" logic lives
 * entirely in the task board and toggle-completion API; this component
 * only reacts to already-confirmed props.
 */
export function BunnyCarrotProgress({
  taskCount,
  completedCount,
  completionEventId,
}: BunnyCarrotProgressProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const previousEventId = useRef(completionEventId);
  const [biting, setBiting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (completionEventId === previousEventId.current) return;
    previousEventId.current = completionEventId;

    if (prefersReducedMotion) return;

    // Intentional: this effect exists specifically to react to the
    // caller's confirmed-completion signal (an external event, not
    // derived state) and kick off a one-shot animation timer — the
    // alternative (deriving `biting` during render) can't express "run
    // once per prop change, then reset after N ms."
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBiting(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setBiting(false), BITE_DURATION_MS);
  }, [completionEventId, prefersReducedMotion]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (taskCount <= 0) return null;

  const remainingRatio = computeRemainingCarrotRatio(taskCount, completedCount);
  const eatenPercent = (1 - remainingRatio) * 100;

  return (
    <div
      aria-hidden="true"
      dir="ltr"
      className="mx-auto flex items-center justify-center overflow-hidden"
      style={{ width: STAGE_WIDTH_PX, height: STAGE_HEIGHT_PX }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny bundled static brand image */}
      <img
        src={BUNNY_SRC}
        alt=""
        width={BUNNY_NATIVE_SIZE}
        height={BUNNY_NATIVE_SIZE}
        className={["shrink-0 object-contain", biting ? "animate-bunny-bite" : ""].join(" ")}
        style={{ height: STAGE_HEIGHT_PX, width: STAGE_HEIGHT_PX }}
      />

      <div className="relative h-full flex-1 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            clipPath: `inset(0 0 0 ${eatenPercent}%)`,
            transition: prefersReducedMotion ? "none" : "clip-path 400ms ease",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny bundled static brand image, positioned via CSS transform */}
          <img
            src={CARROT_SRC}
            alt=""
            width={CARROT_NATIVE_WIDTH}
            height={CARROT_NATIVE_HEIGHT}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: CARROT_NATIVE_WIDTH,
              height: CARROT_NATIVE_HEIGHT,
              transform: `translate(-50%, -50%) translate(${CARROT_OFFSET_X_PX}px, 0px) rotate(${CARROT_ROTATE_DEG}deg) scale(${CARROT_SCALE})`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
