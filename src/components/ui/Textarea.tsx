import { useId, type TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function Textarea({ label, error, hint, className = "", ...props }: TextareaProps) {
  const fieldId = useId();

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldId} className="text-sm font-bold text-text">
        {label}
      </label>
      <textarea
        id={fieldId}
        rows={3}
        className={[
          "w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-base text-text outline-none focus-visible:ring-2 focus-visible:ring-sky-blue",
          className,
        ].join(" ")}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        {...props}
      />
      {error ? (
        <p id={`${fieldId}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
