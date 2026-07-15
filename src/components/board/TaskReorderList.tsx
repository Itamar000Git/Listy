"use client";

import { resolveTaskImagePath } from "@/lib/images/generic-task-images";
import type { TaskWithId } from "@/lib/types/domain";

type TaskReorderListProps = {
  tasks: TaskWithId[];
  onMoveUp: (taskId: string) => void;
  onMoveDown: (taskId: string) => void;
};

/**
 * Dedicated reorder-mode list (task reordering feature): a plain
 * top-to-bottom list rather than the normal tap-to-complete grid, so
 * "first"/"last" and the up/down controls read unambiguously on a
 * small screen. Tapping a card here never toggles completion — only
 * the explicit move buttons mutate anything, and only locally until
 * the caller saves.
 */
export function TaskReorderList({ tasks, onMoveUp, onMoveDown }: TaskReorderListProps) {
  return (
    <ul className="flex flex-col gap-2 p-4 pb-6">
      {tasks.map((task, index) => {
        const isFirst = index === 0;
        const isLast = index === tasks.length - 1;
        return (
          <li
            key={task.id}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-2 pe-3 shadow-sm"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny bundled static SVG icon */}
            <img
              src={resolveTaskImagePath(task.imageKey)}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 shrink-0"
            />
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-text">{task.title}</span>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => onMoveUp(task.id)}
                disabled={isFirst}
                aria-label={`העברת המשימה ${task.title} למעלה`}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-text disabled:opacity-30"
              >
                <ArrowUpIcon />
              </button>
              <button
                type="button"
                onClick={() => onMoveDown(task.id)}
                disabled={isLast}
                aria-label={`העברת המשימה ${task.title} למטה`}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-text disabled:opacity-30"
              >
                <ArrowDownIcon />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 5v14" />
      <path d="M19 12l-7 7-7-7" />
    </svg>
  );
}
