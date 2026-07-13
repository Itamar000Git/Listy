import type { ReactNode } from "react";
import { OfflineBanner } from "@/components/shell/OfflineBanner";

type MobileAppShellProps = {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

/**
 * Three-region mobile layout: sticky header, scrollable content, sticky
 * bottom action area. Safe-area insets are applied on the header/footer so
 * content never sits under a phone's notch or gesture bar. The offline
 * banner renders on every screen that uses this shell.
 */
export function MobileAppShell({ header, footer, children }: MobileAppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {header}
      <OfflineBanner />
      <main className="flex-1 overflow-y-auto">{children}</main>
      {footer}
    </div>
  );
}
