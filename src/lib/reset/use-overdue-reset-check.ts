"use client";

import { useEffect, useRef } from "react";
import type { Timestamp } from "firebase/firestore";
import { callApi } from "@/lib/auth/get-auth-header";

export type ResettableList = {
  id: string;
  profileId: string;
  nextResetAt: Timestamp | null;
};

function isOverdue(list: ResettableList, nowMs: number): boolean {
  return list.nextResetAt !== null && list.nextResetAt.toMillis() <= nowMs;
}

/**
 * Fires POST /api/lists/check-reset for any list whose `nextResetAt` has
 * already passed (specification §19) — the server re-validates and
 * performs the actual reset transactionally; this hook only decides
 * *when* to ask.
 *
 * Runs once per (listId, nextResetAt) pair: a `checkedRef` set keyed on
 * both means a list that's already been asked about for its current
 * boundary won't be asked again until the listener reports a new
 * `nextResetAt` (i.e. after a real reset happened) — this is what
 * prevents a request loop even though the effect reruns on every
 * Firestore snapshot. A `pendingRef` additionally prevents two
 * in-flight requests for the same list. Also re-checks on window focus
 * / tab visibility return, per the "reopening after the tab was hidden"
 * requirement — still gated by the same dedup so it's a no-op unless a
 * boundary is genuinely still overdue.
 */
export function useOverdueResetCheck(isOnline: boolean, lists: ResettableList[]): void {
  const checkedRef = useRef<Set<string>>(new Set());
  const pendingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    function runOverdueChecks() {
      if (!isOnline) return;
      const now = Date.now();
      for (const list of lists) {
        if (!isOverdue(list, now)) continue;
        const key = `${list.id}:${list.nextResetAt!.toMillis()}`;
        if (checkedRef.current.has(key) || pendingRef.current.has(list.id)) continue;

        pendingRef.current.add(list.id);
        checkedRef.current.add(key);
        callApi("/api/lists/check-reset", { body: { profileId: list.profileId, listId: list.id } })
          .catch(() => {
            // Allow a future retry for this same boundary since we don't
            // know whether the reset actually happened.
            checkedRef.current.delete(key);
          })
          .finally(() => {
            pendingRef.current.delete(list.id);
          });
      }
    }

    runOverdueChecks();

    function handleVisibility() {
      if (document.visibilityState === "visible") runOverdueChecks();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", runOverdueChecks);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", runOverdueChecks);
    };
  }, [isOnline, lists]);
}
