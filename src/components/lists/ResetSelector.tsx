import type { ResetType } from "@/lib/types/domain";

const RESET_TYPE_OPTIONS: { value: ResetType; label: string }[] = [
  { value: "daily", label: "איפוס יומי" },
  { value: "weekly", label: "איפוס שבועי" },
  { value: "never", label: "ללא איפוס" },
];

const WEEKDAY_LABELS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

type ResetSelectorProps = {
  resetType: ResetType;
  resetTime: string;
  weeklyResetDay: number;
  onResetTypeChange: (value: ResetType) => void;
  onResetTimeChange: (value: string) => void;
  onWeeklyResetDayChange: (value: number) => void;
};

export function ResetSelector({
  resetType,
  resetTime,
  weeklyResetDay,
  onResetTypeChange,
  onResetTimeChange,
  onWeeklyResetDayChange,
}: ResetSelectorProps) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-bold text-text">איפוס הרשימה</span>

      <div className="flex flex-wrap gap-2">
        {RESET_TYPE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onResetTypeChange(option.value)}
            aria-pressed={resetType === option.value}
            className={[
              "min-h-11 rounded-full border-2 px-4 text-sm font-bold",
              resetType === option.value
                ? "border-pink bg-pink text-text"
                : "border-border bg-surface text-text-muted",
            ].join(" ")}
          >
            {option.label}
          </button>
        ))}
      </div>

      {resetType !== "never" ? (
        <div className="flex flex-col gap-1">
          <label htmlFor="reset-time" className="text-sm font-bold text-text">
            שעת האיפוס
          </label>
          <input
            id="reset-time"
            type="time"
            value={resetTime}
            onChange={(event) => onResetTimeChange(event.target.value)}
            className="min-h-12 w-full rounded-2xl border border-border bg-surface px-4 text-base text-text outline-none focus-visible:ring-2 focus-visible:ring-sky-blue"
          />
        </div>
      ) : null}

      {resetType === "weekly" ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-bold text-text">יום האיפוס</span>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_LABELS.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => onWeeklyResetDayChange(index)}
                aria-pressed={weeklyResetDay === index}
                className={[
                  "min-h-11 min-w-11 rounded-full border-2 px-3 text-sm font-bold",
                  weeklyResetDay === index
                    ? "border-pink bg-pink text-text"
                    : "border-border bg-surface text-text-muted",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
