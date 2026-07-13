import type { ButtonHTMLAttributes, HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: CardProps) {
  return (
    <div
      className={[
        "rounded-2xl border border-border bg-surface p-4 shadow-sm",
        className,
      ].join(" ")}
      {...props}
    />
  );
}

type TappableCardProps = ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * A card that is itself the touch target (profile cards, list cards).
 * Minimum 44px touch height is guaranteed by min-h-11 + card padding.
 */
export function TappableCard({ className = "", ...props }: TappableCardProps) {
  return (
    <button
      className={[
        "min-h-11 w-full rounded-2xl border border-border bg-surface p-4 text-start shadow-sm transition-transform active:scale-[0.98]",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
