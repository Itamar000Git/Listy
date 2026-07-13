import { describe, expect, it } from "vitest";
import { computeNextReset } from "@/lib/reset/compute-next-reset";

// Asia/Jerusalem is UTC+2 (standard time, no DST) throughout January.
// 2024-01-01 was a Monday, so 2024-01-07 is a Sunday (weekday 0) and
// 2024-01-10 is a Wednesday (weekday 3) — used as fixed reference dates
// so the test doesn't need to compute weekdays at runtime.
const TZ = "Asia/Jerusalem";

describe("computeNextReset", () => {
  it("returns null for resetType 'never'", () => {
    const result = computeNextReset({
      resetType: "never",
      resetTime: "04:00",
      weeklyResetDay: null,
      timezone: TZ,
      now: new Date("2024-01-07T00:00:00Z"),
    });
    expect(result).toBeNull();
  });

  it("daily: schedules today's occurrence when it hasn't passed yet", () => {
    // 2024-01-07T00:00:00Z = 02:00 local (before the 04:00 reset time)
    const result = computeNextReset({
      resetType: "daily",
      resetTime: "04:00",
      weeklyResetDay: null,
      timezone: TZ,
      now: new Date("2024-01-07T00:00:00Z"),
    });
    expect(result?.toISOString()).toBe("2024-01-07T02:00:00.000Z");
  });

  it("daily: rolls over to tomorrow once today's time has passed", () => {
    // 2024-01-07T05:00:00Z = 07:00 local (after the 04:00 reset time)
    const result = computeNextReset({
      resetType: "daily",
      resetTime: "04:00",
      weeklyResetDay: null,
      timezone: TZ,
      now: new Date("2024-01-07T05:00:00Z"),
    });
    expect(result?.toISOString()).toBe("2024-01-08T02:00:00.000Z");
  });

  it("weekly: schedules this week's occurrence when the target weekday hasn't passed", () => {
    // Sunday 02:00 local, target = Sunday (0), reset time 04:00 → today
    const result = computeNextReset({
      resetType: "weekly",
      resetTime: "04:00",
      weeklyResetDay: 0,
      timezone: TZ,
      now: new Date("2024-01-07T00:00:00Z"),
    });
    expect(result?.toISOString()).toBe("2024-01-07T02:00:00.000Z");
  });

  it("weekly: rolls over to next week once this week's occurrence has passed", () => {
    // Sunday 05:00 local, target = Sunday (0), reset time 04:00 already passed → next Sunday
    const result = computeNextReset({
      resetType: "weekly",
      resetTime: "04:00",
      weeklyResetDay: 0,
      timezone: TZ,
      now: new Date("2024-01-07T03:00:00Z"),
    });
    expect(result?.toISOString()).toBe("2024-01-14T02:00:00.000Z");
  });

  it("weekly: schedules a future weekday later in the same week", () => {
    // Sunday → next Wednesday (3 days later)
    const result = computeNextReset({
      resetType: "weekly",
      resetTime: "04:00",
      weeklyResetDay: 3,
      timezone: TZ,
      now: new Date("2024-01-07T00:00:00Z"),
    });
    expect(result?.toISOString()).toBe("2024-01-10T02:00:00.000Z");
  });
});
