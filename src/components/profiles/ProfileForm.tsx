"use client";

import { useState, type FormEvent } from "react";
import { THEME_COLOR_BG_CLASS, THEME_COLOR_OPTIONS } from "@/lib/theme-colors";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { useOnlineStatus } from "@/lib/use-online-status";

const AVATAR_OPTIONS = ["🙂", "👧", "👦", "🐻", "🐱", "🦄", "🌟", "🚀"];

export type ProfileFormValues = {
  name: string;
  avatar: string;
  themeColor: (typeof THEME_COLOR_OPTIONS)[number]["value"];
};

type ProfileFormProps = {
  initialValues?: ProfileFormValues;
  submitLabel: string;
  submitting: boolean;
  error?: string | null;
  onSubmit: (values: ProfileFormValues) => void;
};

export function ProfileForm({
  initialValues,
  submitLabel,
  submitting,
  error,
  onSubmit,
}: ProfileFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [avatar, setAvatar] = useState(initialValues?.avatar ?? AVATAR_OPTIONS[0]);
  const [themeColor, setThemeColor] = useState<ProfileFormValues["themeColor"]>(
    initialValues?.themeColor ?? "lavender",
  );
  const isOnline = useOnlineStatus();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit({ name: name.trim(), avatar, themeColor });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <TextField
        label="שם"
        required
        maxLength={20}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />

      <div className="flex flex-col gap-2">
        <span className="text-sm font-bold text-text">תמונה</span>
        <div className="flex flex-wrap gap-2">
          {AVATAR_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setAvatar(emoji)}
              aria-pressed={avatar === emoji}
              className={[
                "flex h-12 w-12 items-center justify-center rounded-full border-2 text-2xl",
                avatar === emoji ? "border-pink" : "border-transparent bg-surface",
              ].join(" ")}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-bold text-text">צבע</span>
        <div className="flex flex-wrap gap-2">
          {THEME_COLOR_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setThemeColor(option.value)}
              aria-pressed={themeColor === option.value}
              aria-label={option.label}
              className={[
                "h-11 w-11 rounded-full border-2",
                THEME_COLOR_BG_CLASS[option.value],
                themeColor === option.value ? "border-text" : "border-transparent",
              ].join(" ")}
            />
          ))}
        </div>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <Button type="submit" disabled={submitting || !name.trim() || !isOnline} fullWidth>
        {submitLabel}
      </Button>
    </form>
  );
}
