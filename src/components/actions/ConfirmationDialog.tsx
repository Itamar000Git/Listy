"use client";

import { Button } from "@/components/ui/Button";

type ConfirmationDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  confirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Centered modal (not a bottom sheet) to signal higher severity for
 * destructive confirmations, per specification §11.15. Cancel is the
 * visually default action; confirm requires a deliberate reach.
 */
export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "ביטול",
  destructive = false,
  confirming = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-text/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-dialog-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-lg">
        <h2 id="confirmation-dialog-title" className="text-lg font-bold text-text">
          {title}
        </h2>
        {description ? <p className="mt-2 text-sm text-text-muted">{description}</p> : null}

        <div className="mt-5 flex flex-col gap-2">
          <Button variant="secondary" onClick={onCancel} fullWidth>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={confirming}
            fullWidth
          >
            {confirming ? "מבצעים..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
