"use client";

import { useId, useState } from "react";

type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "new-password" | "current-password";
  error?: string;
  hint?: string;
};

/**
 * Password input with a show/hide toggle. Never logs or exposes the
 * value outside onChange — no analytics, no console output.
 */
export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  error,
  hint,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-bold text-text">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          className="min-h-12 w-full rounded-2xl border border-border bg-surface px-4 pe-14 text-base text-text outline-none focus-visible:ring-2 focus-visible:ring-sky-blue"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "הסתרת הסיסמה" : "הצגת הסיסמה"}
          className="absolute inset-y-0 end-1 flex w-12 items-center justify-center text-text-muted"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9.9 4.24A9.4 9.4 0 0 1 12 4c7 0 11 8 11 8a17.2 17.2 0 0 1-3.06 4.06M6.6 6.6C3.4 8.6 1 12 1 12s4 8 11 8a9.5 9.5 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M2 2l20 20" />
    </svg>
  );
}
