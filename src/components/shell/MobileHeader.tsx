import type { ReactNode } from "react";
import Link from "next/link";

type MobileHeaderProps = {
  title: string;
  backHref?: string;
  end?: ReactNode;
};

/**
 * Sticky top header. In RTL, "back" reads right-to-left, so the back
 * chevron points toward the right edge of the screen.
 */
export function MobileHeader({ title, backHref, end }: MobileHeaderProps) {
  return (
    <header
      className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-surface/95 px-3 backdrop-blur"
      style={{
        paddingTop: "max(0.75rem, var(--safe-top))",
        paddingBottom: "0.75rem",
      }}
    >
      {backHref ? (
        <Link
          href={backHref}
          aria-label="חזרה"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text active:bg-lavender/30"
        >
          <BackChevron />
        </Link>
      ) : (
        <div className="w-11 shrink-0" aria-hidden />
      )}

      <h1 className="min-w-0 flex-1 truncate text-lg font-bold text-text">{title}</h1>

      <div className="flex shrink-0 items-center justify-end gap-1" style={{ minWidth: "2.75rem" }}>
        {end}
      </div>
    </header>
  );
}

function BackChevron() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
