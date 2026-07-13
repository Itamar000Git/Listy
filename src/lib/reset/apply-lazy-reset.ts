import "server-only";

import { Timestamp } from "firebase-admin/firestore";
import { computeNextReset } from "@/lib/reset/compute-next-reset";
import type { ResetType } from "@/lib/types/domain";

type ListResetFields = {
  resetType: ResetType;
  resetTime: string | null;
  weeklyResetDay: number | null;
  timezone: string;
  nextResetAt: Timestamp | null;
  currentCycle: number;
  completedCount: number;
  celebrationCycle: number | null;
};

export type LazyResetOutcome = {
  wasReset: boolean;
  /** The list's currentCycle after this potential reset. */
  currentCycle: number;
  /** The list's completedCount after this potential reset (0 if reset occurred). */
  completedCount: number;
  /** The list's celebrationCycle after this potential reset (null if reset occurred). */
  celebrationCycle: number | null;
  /** Fields to merge into the list document's transaction.update(), or null if no reset was needed. */
  update: Record<string, unknown> | null;
};

/**
 * Pure computation of the lazy, cycle-based reset (specification
 * §16-19): if the list's `nextResetAt` has passed, advances
 * `currentCycle` by exactly one, clears `completedCount`/
 * `celebrationCycle`, and recomputes the next future reset instant.
 * Returns a plain update object rather than writing directly, so a
 * caller that also needs to write other fields on the same list
 * document in the same transaction (toggle-completion) can merge them
 * into a single `transaction.update()` call instead of issuing two.
 */
export function computeLazyReset(listData: ListResetFields, now: Date): LazyResetOutcome {
  const noReset: LazyResetOutcome = {
    wasReset: false,
    currentCycle: listData.currentCycle,
    completedCount: listData.completedCount,
    celebrationCycle: listData.celebrationCycle,
    update: null,
  };

  if (listData.resetType === "never") return noReset;
  if (!listData.nextResetAt || listData.nextResetAt.toDate().getTime() > now.getTime()) {
    return noReset;
  }

  const newCycle = listData.currentCycle + 1;
  const nextResetDate = computeNextReset({
    resetType: listData.resetType,
    resetTime: listData.resetTime ?? "04:00",
    weeklyResetDay: listData.weeklyResetDay,
    timezone: listData.timezone,
    now,
  });

  return {
    wasReset: true,
    currentCycle: newCycle,
    completedCount: 0,
    celebrationCycle: null,
    update: {
      currentCycle: newCycle,
      completedCount: 0,
      celebrationCycle: null,
      lastResetAt: Timestamp.fromDate(now),
      nextResetAt: nextResetDate ? Timestamp.fromDate(nextResetDate) : null,
      updatedAt: Timestamp.fromDate(now),
    },
  };
}
