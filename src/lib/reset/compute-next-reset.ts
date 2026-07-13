import type { ResetType } from "@/lib/types/domain";

type ComputeNextResetParams = {
  resetType: ResetType;
  /** "HH:mm" local time, e.g. "04:00". Ignored when resetType is "never". */
  resetTime: string;
  /** 0 (Sunday) - 6 (Saturday). Required when resetType is "weekly". */
  weeklyResetDay: number | null;
  timezone: string;
  now: Date;
};

type ZonedParts = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0 (Sunday) - 6 (Saturday)
};

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Reads the wall-clock date/time (and weekday) that `date` corresponds to
 * in `timeZone`, via Intl rather than manual offset tables — this is
 * what stays correct across DST transitions without a timezone database
 * dependency.
 */
function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) map[part.type] = part.value;

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    // Some locales format midnight as "24"; normalize to 0.
    hour: map.hour === "24" ? 0 : Number(map.hour),
    minute: Number(map.minute),
    weekday: WEEKDAY_INDEX[map.weekday] ?? 0,
  };
}

/** The timezone's current UTC offset in minutes (e.g. Asia/Jerusalem in summer: +180). */
function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  });
  const offsetPart = formatter.formatToParts(date).find((p) => p.type === "timeZoneName");
  const match = offsetPart?.value.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = match[3] ? Number(match[3]) : 0;
  return sign * (hours * 60 + minutes);
}

/**
 * Converts a wall-clock date/time in `timeZone` to the corresponding
 * instant (UTC Date). Resolves the offset using a guess-then-correct
 * pass so DST boundaries resolve to the intended local time rather than
 * silently shifting by an hour.
 */
function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const guessUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offsetMinutes = getTimeZoneOffsetMinutes(new Date(guessUtcMs), timeZone);
  return new Date(guessUtcMs - offsetMinutes * 60_000);
}

/** Adds whole calendar days to a Y/M/D grid (pure calendar math, timezone-independent). */
function addCalendarDays(year: number, month: number, day: number, days: number) {
  const ms = Date.UTC(year, month - 1, day) + days * 86_400_000;
  const shifted = new Date(ms);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

/**
 * Computes the next reset instant for a list (specification §18-19).
 * Daily/weekly resets mean "once per calendar day/week at a chosen local
 * time", not "N hours after the last reset" — see the spec's rationale
 * for why this is the more understandable option for families. Returns
 * null for resetType "never".
 */
export function computeNextReset({
  resetType,
  resetTime,
  weeklyResetDay,
  timezone,
  now,
}: ComputeNextResetParams): Date | null {
  if (resetType === "never") return null;

  const [hourStr, minuteStr] = resetTime.split(":");
  const targetHour = Number(hourStr);
  const targetMinute = Number(minuteStr);

  const zonedNow = getZonedParts(now, timezone);

  let candidateDate = { year: zonedNow.year, month: zonedNow.month, day: zonedNow.day };
  let candidateUtc = zonedTimeToUtc(
    candidateDate.year,
    candidateDate.month,
    candidateDate.day,
    targetHour,
    targetMinute,
    timezone,
  );

  if (resetType === "daily") {
    if (candidateUtc.getTime() <= now.getTime()) {
      candidateDate = addCalendarDays(candidateDate.year, candidateDate.month, candidateDate.day, 1);
      candidateUtc = zonedTimeToUtc(
        candidateDate.year,
        candidateDate.month,
        candidateDate.day,
        targetHour,
        targetMinute,
        timezone,
      );
    }
    return candidateUtc;
  }

  // resetType === "weekly"
  const targetWeekday = weeklyResetDay ?? 0;
  let daysUntilTarget = (targetWeekday - zonedNow.weekday + 7) % 7;

  if (daysUntilTarget === 0 && candidateUtc.getTime() <= now.getTime()) {
    daysUntilTarget = 7;
  }

  if (daysUntilTarget > 0) {
    candidateDate = addCalendarDays(
      candidateDate.year,
      candidateDate.month,
      candidateDate.day,
      daysUntilTarget,
    );
    candidateUtc = zonedTimeToUtc(
      candidateDate.year,
      candidateDate.month,
      candidateDate.day,
      targetHour,
      targetMinute,
      timezone,
    );
  }

  return candidateUtc;
}
