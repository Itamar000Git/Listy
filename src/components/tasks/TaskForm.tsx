"use client";

import { useState, type FormEvent } from "react";
import { GenericImageSelector } from "@/components/board/GenericImageSelector";
import { TextField } from "@/components/ui/TextField";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { useOnlineStatus } from "@/lib/use-online-status";
import type { GenericTaskImageKey } from "@/lib/images/generic-task-images";

const DESCRIPTION_MAX_LENGTH = 500;

export type TaskFormValues = {
  title: string;
  description: string | null;
  imageKey: GenericTaskImageKey;
};

type TaskFormProps = {
  initialValues?: TaskFormValues;
  submitLabel: string;
  submitting: boolean;
  error?: string | null;
  onSubmit: (values: TaskFormValues) => void;
};

export function TaskForm({ initialValues, submitLabel, submitting, error, onSubmit }: TaskFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [imageKey, setImageKey] = useState<GenericTaskImageKey>(initialValues?.imageKey ?? "generic");
  const isOnline = useOnlineStatus();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedDescription = description.trim();
    onSubmit({
      title: title.trim(),
      description: trimmedDescription.length === 0 ? null : trimmedDescription,
      imageKey,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <TextField
        label="שם המשימה"
        required
        maxLength={60}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />

      <Textarea
        label="תיאור נוסף — לא חובה"
        placeholder="אפשר להוסיף הסבר קצר או הנחיה למשימה"
        maxLength={DESCRIPTION_MAX_LENGTH}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />

      <GenericImageSelector value={imageKey} onChange={setImageKey} />

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <Button type="submit" disabled={submitting || !title.trim() || !isOnline} fullWidth>
        {submitLabel}
      </Button>
    </form>
  );
}
