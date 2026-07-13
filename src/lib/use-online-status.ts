"use client";

import { useEffect, useState } from "react";

/**
 * Tracks browser connectivity for the offline read-only mode
 * (specification: offline behavior). This only reflects whether the
 * device has a network interface up — not whether Firestore/the API is
 * actually reachable — which is the same signal `navigator.onLine`
 * always provides, and is sufficient for proactively disabling mutation
 * controls rather than letting every one of them fail individually.
 *
 * Always starts as `true` (matching what SSR renders, since
 * `navigator` doesn't exist on the server) and syncs to the real value
 * in an effect. Reading `navigator.onLine` in the initial render
 * instead — even guarded — causes a hydration mismatch whenever a
 * client genuinely loads the page while already offline, because the
 * server-rendered HTML always assumed "online".
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Intentional one-time sync to a browser-only value right after
    // mount — the alternative (reading navigator.onLine during the
    // initial render/useState initializer) causes a hydration mismatch
    // whenever the client's real connectivity differs from the
    // server's "always online" assumption.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
