"use client";

import { useOnlineStatus } from "@/lib/use-online-status";

/**
 * Persistent, non-blocking banner while offline. Offline mode is
 * read-only: previously loaded data (Firestore's in-memory cache) may
 * still render, but no write is attempted or claimed to be queued.
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="border-b border-border bg-light-pink/50 px-4 py-2 text-center text-sm font-bold text-text"
    >
      אין חיבור לאינטרנט. אפשר לצפות בנתונים, אך לא ניתן לשמור שינויים כרגע.
    </div>
  );
}
