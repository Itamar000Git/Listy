import type { ReactNode } from "react";

type EmptyStateProps = {
  emoji?: string;
  message: string;
  action?: ReactNode;
};

export function EmptyState({ emoji = "✨", message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="text-4xl" aria-hidden>
        {emoji}
      </span>
      <p className="text-base text-text-muted">{message}</p>
      {action}
    </div>
  );
}
