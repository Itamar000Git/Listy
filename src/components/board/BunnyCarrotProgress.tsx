"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

const IDLE_SRC = "/images/brand/listy-bunny_2_trimmed.png";
const BITE_SRC = "/images/brand/listy-bunny_bite_trimmed.png";
const CARROT_SRC = "/images/brand/listy-carrot_2_trimmed.png";

// Native pixel dimensions of the trimmed derivative assets (see
// public/images/brand — *_trimmed.png files are alpha-trimmed copies of
// the approved listy-bunny_2.png / listy-bunny_bite.png /
// listy-carrot_2.png, transparent-padding removed only, never resized
// or distorted).
const IDLE_NATIVE_W = 809;
const IDLE_NATIVE_H = 1343;
const BITE_NATIVE_W = 1192;
const BITE_NATIVE_H = 1328;
const CARROT_NATIVE_W = 2339;
const CARROT_NATIVE_H = 888;

// The idle and bite source photos are not framed identically (different
// canvas content, different mouth/paw position), so they can't share a
// single top/left. These fractional anchors were located by rendering
// each trimmed asset with a movable marker and reading off where the
// mouth (idle) / bite point (bite) actually falls, then locked in here.
const IDLE_MOUTH_FRACTION = { x: 0.6, y: 0.4 };
const BITE_MOUTH_FRACTION = { x: 0.48, y: 0.42 };

// Display geometry, tuned by rendering the composition at 320–430px and
// checking visually: a compact bunny "stage" box (bunny always anchored
// at its own mouth point regardless of which frame is showing) sitting
// directly beside a clipped carrot, with the carrot's vertical center
// aligned to the bunny's mouth height.
const BUNNY_BOX_W = 70;
const BUNNY_BOX_H = 110;
const CARROT_GAP = 2;
const CARROT_BOX_H = 76;
const CARROT_BOX_W = Math.round(CARROT_BOX_H * (CARROT_NATIVE_W / CARROT_NATIVE_H));

const BUNNY_SCALE = BUNNY_BOX_H / IDLE_NATIVE_H;
const IDLE_RENDER_W = IDLE_NATIVE_W * BUNNY_SCALE;
const BITE_RENDER_W = BITE_NATIVE_W * BUNNY_SCALE;
const BITE_RENDER_H = BITE_NATIVE_H * BUNNY_SCALE;

// Idle sits flush at the box's top-left; that fixes the shared anchor
// point every other frame must line up with.
const ANCHOR_X = IDLE_RENDER_W * IDLE_MOUTH_FRACTION.x;
const ANCHOR_Y = BUNNY_BOX_H * IDLE_MOUTH_FRACTION.y;
const BITE_OFFSET_X = ANCHOR_X - BITE_RENDER_W * BITE_MOUTH_FRACTION.x;
const BITE_OFFSET_Y = ANCHOR_Y - BITE_RENDER_H * BITE_MOUTH_FRACTION.y;

const CARROT_LEFT = BUNNY_BOX_W + CARROT_GAP;
const CARROT_TOP = ANCHOR_Y - CARROT_BOX_H / 2;
const STAGE_WIDTH = CARROT_LEFT + CARROT_BOX_W;
const STAGE_HEIGHT = Math.max(BUNNY_BOX_H, CARROT_TOP + CARROT_BOX_H);

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
   * so the bite frame only shows for an action this device just
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
      className="relative mx-auto"
      style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}
    >
      <div
        className={["absolute left-0 top-0 overflow-hidden", biting ? "animate-bunny-bite-pulse" : ""].join(
          " ",
        )}
        style={{ width: BUNNY_BOX_W, height: BUNNY_BOX_H }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny bundled static brand image */}
        <img
          src={IDLE_SRC}
          alt=""
          width={IDLE_NATIVE_W}
          height={IDLE_NATIVE_H}
          className="absolute"
          style={{
            width: IDLE_RENDER_W,
            height: BUNNY_BOX_H,
            left: 0,
            top: 0,
            opacity: biting ? 0 : 1,
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny bundled static brand image */}
        <img
          src={BITE_SRC}
          alt=""
          width={BITE_NATIVE_W}
          height={BITE_NATIVE_H}
          className="absolute"
          style={{
            width: BITE_RENDER_W,
            height: BITE_RENDER_H,
            left: BITE_OFFSET_X,
            top: BITE_OFFSET_Y,
            opacity: biting ? 1 : 0,
          }}
        />
      </div>

      <div
        className="absolute overflow-hidden"
        style={{ left: CARROT_LEFT, top: CARROT_TOP, width: CARROT_BOX_W, height: CARROT_BOX_H }}
      >
        <div
          className="absolute inset-0"
          style={{
            clipPath: `inset(0 0 0 ${eatenPercent}%)`,
            transition: prefersReducedMotion ? "none" : "clip-path 400ms ease",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny bundled static brand image */}
          <img
            src={CARROT_SRC}
            alt=""
            width={CARROT_NATIVE_W}
            height={CARROT_NATIVE_H}
            className="absolute left-0 top-0"
            style={{ width: CARROT_BOX_W, height: CARROT_BOX_H }}
          />
        </div>
      </div>
    </div>
  );
}
