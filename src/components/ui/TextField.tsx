import { useId, type InputHTMLAttributes } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function TextField({ label, error, hint, className = "", ...props }: TextFieldProps) {
  const inputId = useId();

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-bold text-text">
        {label}
      </label>
      <input
        id={inputId}
        className={[
          "min-h-12 w-full rounded-2xl border border-border bg-surface px-4 text-base text-text outline-none focus-visible:ring-2 focus-visible:ring-sky-blue",
          className,
        ].join(" ")}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
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
