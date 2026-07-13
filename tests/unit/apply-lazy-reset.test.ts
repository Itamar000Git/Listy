import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import { computeLazyReset } from "@/lib/reset/apply-lazy-reset";

describe("computeLazyReset", () => {
  it("is a no-op for resetType 'never'", () => {
    const outcome = computeLazyReset(
      {
        resetType: "never",
        resetTime: null,
        weeklyResetDay: null,
        timezone: "Asia/Jerusalem",
        nextResetAt: null,
        currentCycle: 3,
        completedCount: 2,
        celebrationCycle: 3,
      },
      new Date("2024-01-07T00:00:00Z"),
    );

    expect(outcome.wasReset).toBe(false);
    expect(outcome.currentCycle).toBe(3);
    expect(outcome.update).toBeNull();
  });

  it("is a no-op when nextResetAt is still in the future", () => {
    const outcome = computeLazyReset(
      {
        resetType: "daily",
        resetTime: "04:00",
        weeklyResetDay: null,
        timezone: "Asia/Jerusalem",
        nextResetAt: Timestamp.fromDate(new Date("2024-01-08T02:00:00Z")),
        currentCycle: 5,
        completedCount: 2,
        celebrationCycle: null,
      },
      new Date("2024-01-07T00:00:00Z"),
    );

    expect(outcome.wasReset).toBe(false);
    expect(outcome.currentCycle).toBe(5);
    expect(outcome.update).toBeNull();
  });

  it("advances the cycle by exactly one and clears counters when due", () => {
    const outcome = computeLazyReset(
      {
        resetType: "daily",
        resetTime: "04:00",
        weeklyResetDay: null,
        timezone: "Asia/Jerusalem",
        nextResetAt: Timestamp.fromDate(new Date("2024-01-06T02:00:00Z")), // already past
        currentCycle: 5,
        completedCount: 3,
        celebrationCycle: 5,
      },
      new Date("2024-01-07T00:00:00Z"),
    );

    expect(outcome.wasReset).toBe(true);
    expect(outcome.currentCycle).toBe(6);
    expect(outcome.completedCount).toBe(0);
    expect(outcome.celebrationCycle).toBeNull();
    expect(outcome.update).toMatchObject({
      currentCycle: 6,
      completedCount: 0,
      celebrationCycle: null,
    });
  });

  it("advances only one cycle even if several periods were missed", () => {
    const outcome = computeLazyReset(
      {
        resetType: "daily",
        resetTime: "04:00",
        weeklyResetDay: null,
        timezone: "Asia/Jerusalem",
        // Five days overdue.
        nextResetAt: Timestamp.fromDate(new Date("2024-01-02T02:00:00Z")),
        currentCycle: 1,
        completedCount: 4,
        celebrationCycle: null,
      },
      new Date("2024-01-07T00:00:00Z"),
    );

    expect(outcome.wasReset).toBe(true);
    expect(outcome.currentCycle).toBe(2);
    // nextResetAt should be scheduled in the future relative to `now`, not
    // replayed once per missed day.
    const nextResetAt = (outcome.update?.nextResetAt as Timestamp).toDate().getTime();
    expect(nextResetAt).toBeGreaterThan(new Date("2024-01-07T00:00:00Z").getTime());
  });
});
