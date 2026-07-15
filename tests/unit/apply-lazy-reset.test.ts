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

  it("a daily list does not reset again once nextResetAt has already been moved to the future", () => {
    const first = computeLazyReset(
      {
        resetType: "daily",
        resetTime: "04:00",
        weeklyResetDay: null,
        timezone: "Asia/Jerusalem",
        nextResetAt: Timestamp.fromDate(new Date("2024-01-06T02:00:00Z")),
        currentCycle: 5,
        completedCount: 3,
        celebrationCycle: 5,
      },
      new Date("2024-01-07T00:00:00Z"),
    );
    expect(first.wasReset).toBe(true);

    // Simulate the same boundary being checked again (e.g. a concurrent
    // request, or the client asking again shortly after) using the
    // list state AS IT NOW STANDS after the first reset — this is what
    // the transaction's re-read would see.
    const second = computeLazyReset(
      {
        resetType: "daily",
        resetTime: "04:00",
        weeklyResetDay: null,
        timezone: "Asia/Jerusalem",
        nextResetAt: first.update!.nextResetAt as Timestamp,
        currentCycle: first.currentCycle,
        completedCount: first.completedCount,
        celebrationCycle: first.celebrationCycle,
      },
      new Date("2024-01-07T00:00:01Z"), // a moment later
    );

    expect(second.wasReset).toBe(false);
    expect(second.currentCycle).toBe(first.currentCycle);
    expect(second.update).toBeNull();
  });

  describe("weekly", () => {
    it("does not reset before the configured weekday/time", () => {
      // 2024-01-07 is a Sunday; weeklyResetDay 3 = Wednesday, still ahead.
      const outcome = computeLazyReset(
        {
          resetType: "weekly",
          resetTime: "04:00",
          weeklyResetDay: 3,
          timezone: "Asia/Jerusalem",
          nextResetAt: Timestamp.fromDate(new Date("2024-01-10T02:00:00Z")),
          currentCycle: 2,
          completedCount: 3,
          celebrationCycle: null,
        },
        new Date("2024-01-07T00:00:00Z"),
      );

      expect(outcome.wasReset).toBe(false);
      expect(outcome.currentCycle).toBe(2);
    });

    it("resets at or after the configured weekday/time", () => {
      const outcome = computeLazyReset(
        {
          resetType: "weekly",
          resetTime: "04:00",
          weeklyResetDay: 3,
          timezone: "Asia/Jerusalem",
          nextResetAt: Timestamp.fromDate(new Date("2024-01-10T02:00:00Z")), // Wed 04:00 local, already past
          currentCycle: 2,
          completedCount: 3,
          celebrationCycle: 2,
        },
        new Date("2024-01-10T03:00:00Z"),
      );

      expect(outcome.wasReset).toBe(true);
      expect(outcome.currentCycle).toBe(3);
      expect(outcome.completedCount).toBe(0);
      expect(outcome.celebrationCycle).toBeNull();
    });

    it("moves several missed weekly boundaries safely into exactly one new cycle with a valid future nextResetAt", () => {
      const outcome = computeLazyReset(
        {
          resetType: "weekly",
          resetTime: "04:00",
          weeklyResetDay: 0, // Sunday
          timezone: "Asia/Jerusalem",
          // Three weeks overdue.
          nextResetAt: Timestamp.fromDate(new Date("2023-12-17T02:00:00Z")),
          currentCycle: 1,
          completedCount: 5,
          celebrationCycle: 1,
        },
        new Date("2024-01-07T12:00:00Z"),
      );

      expect(outcome.wasReset).toBe(true);
      expect(outcome.currentCycle).toBe(2);
      const nextResetAt = (outcome.update?.nextResetAt as Timestamp).toDate().getTime();
      expect(nextResetAt).toBeGreaterThan(new Date("2024-01-07T12:00:00Z").getTime());
    });

    it("the same weekly boundary cannot reset twice", () => {
      const first = computeLazyReset(
        {
          resetType: "weekly",
          resetTime: "04:00",
          weeklyResetDay: 3,
          timezone: "Asia/Jerusalem",
          nextResetAt: Timestamp.fromDate(new Date("2024-01-10T02:00:00Z")),
          currentCycle: 2,
          completedCount: 3,
          celebrationCycle: 2,
        },
        new Date("2024-01-10T03:00:00Z"),
      );
      expect(first.wasReset).toBe(true);

      const second = computeLazyReset(
        {
          resetType: "weekly",
          resetTime: "04:00",
          weeklyResetDay: 3,
          timezone: "Asia/Jerusalem",
          nextResetAt: first.update!.nextResetAt as Timestamp,
          currentCycle: first.currentCycle,
          completedCount: first.completedCount,
          celebrationCycle: first.celebrationCycle,
        },
        new Date("2024-01-10T03:00:01Z"),
      );

      expect(second.wasReset).toBe(false);
      expect(second.currentCycle).toBe(first.currentCycle);
    });
  });
});
