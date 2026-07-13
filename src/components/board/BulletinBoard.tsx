import type { ReactNode } from "react";

/**
 * `minmax(150px, 1fr)` with `auto-fill` naturally collapses to one
 * column at ~320px viewport width and expands to two around ~360px+,
 * then further on tablet/desktop — matching specification §11/§12
 * without hand-written breakpoints. Bottom padding keeps the last row
 * clear of the sticky action bar.
 */
export function BulletinBoard({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 p-4 pb-6">
      {children}
    </div>
  );
}
