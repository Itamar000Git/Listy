"use client";

import { useState } from "react";
import { StickyBottomBar } from "@/components/shell/StickyBottomBar";
import { ConfirmationDialog } from "@/components/actions/ConfirmationDialog";
import { Button } from "@/components/ui/Button";

type StickyListActionsProps = {
  taskCount: number;
  completedCount: number;
  onFinish: () => void;
  onExitWithoutFinishing: () => void;
};

/**
 * Sticky bottom action pair (specification §14/§16). The two actions
 * are visually distinct (filled primary vs. outlined secondary) to
 * reduce accidental taps between "finish" and "leave without finishing".
 */
export function StickyListActions({
  taskCount,
  completedCount,
  onFinish,
  onExitWithoutFinishing,
}: StickyListActionsProps) {
  const [confirmingExit, setConfirmingExit] = useState(false);
  const allCompleted = taskCount > 0 && completedCount === taskCount;

  return (
    <>
      <StickyBottomBar>
        <div className="flex flex-col gap-2">
          {!allCompleted ? (
            <p className="text-center text-sm text-text-muted">נשארו עוד משימות לסיום</p>
          ) : null}
          <Button onClick={onFinish} disabled={!allCompleted} fullWidth>
            סיימתי את המשימות
          </Button>
          <Button variant="secondary" onClick={() => setConfirmingExit(true)} fullWidth>
            יציאה בלי לסיים
          </Button>
        </div>
      </StickyBottomBar>

      <ConfirmationDialog
        open={confirmingExit}
        title="לצאת עכשיו?"
        description="המשימות שסימנת יישמרו."
        confirmLabel="יציאה"
        cancelLabel="המשך במשימות"
        onConfirm={onExitWithoutFinishing}
        onCancel={() => setConfirmingExit(false)}
      />
    </>
  );
}
