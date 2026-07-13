"use client";

import { useState } from "react";
import Link from "next/link";
import { CompletionHeart } from "@/components/board/CompletionHeart";
import { resolveTaskImagePath } from "@/lib/images/generic-task-images";

export type TaskImageCardProps = {
  taskId: string;
  title: string;
  imageKey: string;
  isCompleted: boolean;
  isPending: boolean;
  onToggle: () => void;
  editHref: string;
};

/**
 * The entire card is the tap target for completion (specification §12).
 * A small edit affordance sits in the opposite (top-start) corner from
 * the completion heart so the two never overlap. A brief local "just
 * tapped" pop animation is independent from the server-confirmed
 * `isCompleted` prop, which is what actually drives the heart overlay —
 * if the server call fails and the caller rolls the optimistic state
 * back, the heart disappears again on its own via the prop change.
 */
export function TaskImageCard({
  title,
  imageKey,
  isCompleted,
  isPending,
  onToggle,
  editHref,
}: TaskImageCardProps) {
  const [popKey, setPopKey] = useState(0);

  function handleClick() {
    if (isPending) return;
    setPopKey((current) => current + 1);
    onToggle();
  }

  const ariaLabel = isCompleted ? `ביטול סימון המשימה ${title} כהושלמה` : `סימון המשימה ${title} כהושלמה`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-pressed={isCompleted}
        aria-label={ariaLabel}
        key={popKey}
        className="animate-card-pop relative flex min-h-40 w-full flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-3 text-center shadow-sm disabled:opacity-90"
      >
        {isCompleted ? <CompletionHeart /> : null}

        {/* eslint-disable-next-line @next/next/no-img-element -- tiny bundled static SVG icon */}
        <img
          src={resolveTaskImagePath(imageKey)}
          alt=""
          width={96}
          height={96}
          className="h-24 w-24 shrink-0"
        />

        <span className="line-clamp-2 text-sm font-bold text-text">{title}</span>
      </button>

      <Link
        href={editHref}
        aria-label={`עריכת המשימה ${title}`}
        className="absolute -top-1 start-1 flex h-9 w-9 items-center justify-center rounded-full bg-surface text-text-muted shadow-sm active:bg-lavender/20"
      >
        <EditIcon />
      </Link>
    </div>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </svg>
  );
}
