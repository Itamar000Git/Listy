import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-pink text-text shadow-sm active:scale-[0.98] disabled:bg-border disabled:text-text-muted disabled:shadow-none disabled:active:scale-100",
  secondary:
    "bg-surface text-text border border-border active:scale-[0.98] disabled:text-text-muted disabled:active:scale-100",
  danger: "bg-danger text-white active:scale-[0.98]",
  ghost: "bg-transparent text-text active:bg-lavender/20",
};

/**
 * Base button primitive. Meets the 48x48px minimum touch target for
 * primary actions (h-12 = 48px) via generous vertical padding.
 */
export function Button({
  variant = "primary",
  fullWidth = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        "flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-base font-bold transition-transform",
        "disabled:cursor-not-allowed",
        variantClasses[variant],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
      disabled={disabled}
      {...props}
    />
  );
}
