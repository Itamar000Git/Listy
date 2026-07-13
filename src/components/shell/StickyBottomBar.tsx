import type { ReactNode } from "react";

type StickyBottomBarProps = {
  children: ReactNode;
};

/**
 * Generic sticky bottom action region. Respects the phone's bottom safe
 * area (home-indicator / gesture bar) so buttons stay reachable and are
 * never obscured by the browser chrome.
 */
export function StickyBottomBar({ children }: StickyBottomBarProps) {
  return (
    <div
      className="sticky bottom-0 z-20 border-t border-border bg-surface/95 px-3 pt-3 backdrop-blur"
      style={{ paddingBottom: "max(0.75rem, var(--safe-bottom))" }}
    >
      {children}
    </div>
  );
}
