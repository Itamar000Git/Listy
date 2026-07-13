"use client";

import { useState, type FormEvent } from "react";
import { ResetSelector } from "@/components/lists/ResetSelector";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { useOnlineStatus } from "@/lib/use-online-status";
import type { ResetType } from "@/lib/types/domain";

export type TaskListFormValues = {
  name: string;
  resetType: ResetType;
  resetTime: string;
  weeklyResetDay: number;
};

type TaskListFormProps = {
  initialValues?: TaskListFormValues;
  submitLabel: string;
  submitting: boolean;
  error?: string | null;
  onSubmit: (values: TaskListFormValues) => void;
};

const DEFAULT_RESET_TIME = "04:00";

export function TaskListForm({
  initialValues,
  submitLabel,
  submitting,
  error,
  onSubmit,
}: TaskListFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [resetType, setResetType] = useState<ResetType>(initialValues?.resetType ?? "daily");
  const [resetTime, setResetTime] = useState(initialValues?.resetTime ?? DEFAULT_RESET_TIME);
  const [weeklyResetDay, setWeeklyResetDay] = useState(initialValues?.weeklyResetDay ?? 0);
  const isOnline = useOnlineStatus();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit({ name: name.trim(), resetType, resetTime, weeklyResetDay });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <TextField
        label="שם הרשימה"
        required
        maxLength={40}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />

      <ResetSelector
        resetType={resetType}
        resetTime={resetTime}
        weeklyResetDay={weeklyResetDay}
        onResetTypeChange={setResetType}
        onResetTimeChange={setResetTime}
        onWeeklyResetDayChange={setWeeklyResetDay}
      />

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <Button type="submit" disabled={submitting || !name.trim() || !isOnline} fullWidth>
        {submitLabel}
      </Button>
    </form>
  );
}
