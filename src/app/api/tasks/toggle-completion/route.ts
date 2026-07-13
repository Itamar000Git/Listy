import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminFirestore } from "@/lib/firebase/admin";
import { badRequest, internalError } from "@/lib/api/respond";
import { authenticateFamily } from "@/lib/api/authenticate";
import { listPath, profilePath, taskPath } from "@/lib/firestore/paths";
import { taskToggleCompletionSchema } from "@/lib/validation/schemas";
import { computeLazyReset } from "@/lib/reset/apply-lazy-reset";

export const runtime = "nodejs";

type TransactionResult =
  | { status: "profile_not_found" }
  | { status: "list_not_found" }
  | { status: "task_not_found" }
  | {
      status: "ok";
      completed: boolean;
      completedCount: number;
      taskCount: number;
      allCompleted: boolean;
      celebrationTriggered: boolean;
      currentCycle: number;
    };

/**
 * Atomically completes or uncompletes a task (specification §20). This
 * is a pure toggle: the transaction reads the task's current
 * completion state (relative to the list's — possibly just-reset —
 * currentCycle) and flips it, so the client never has to guess or race
 * on "next state". A completed task is one where
 * task.completedCycle === list.currentCycle; there is no separate
 * isCompleted field.
 */
export async function POST(request: Request) {
  const auth = await authenticateFamily(request);
  if ("errorResponse" in auth) return auth.errorResponse;
  const { familyId } = auth;

  let body: unknown;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return badRequest("invalid_json");
  }

  const parsed = taskToggleCompletionSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("invalid_input");
  }

  const { profileId, listId, taskId } = parsed.data;
  const profileRef = adminFirestore.doc(profilePath(familyId, profileId));
  const listRef = adminFirestore.doc(listPath(familyId, profileId, listId));
  const taskRef = adminFirestore.doc(taskPath(familyId, profileId, listId, taskId));

  try {
    const result = await adminFirestore.runTransaction<TransactionResult>(async (transaction) => {
      const [profileSnapshot, listSnapshot, taskSnapshot] = await Promise.all([
        transaction.get(profileRef),
        transaction.get(listRef),
        transaction.get(taskRef),
      ]);

      if (!profileSnapshot.exists || profileSnapshot.data()?.isDeleted) {
        return { status: "profile_not_found" };
      }
      if (!listSnapshot.exists || listSnapshot.data()?.isDeleted) {
        return { status: "list_not_found" };
      }
      if (!taskSnapshot.exists || taskSnapshot.data()?.isDeleted) {
        return { status: "task_not_found" };
      }

      const listData = listSnapshot.data()!;
      const taskData = taskSnapshot.data()!;
      const now = new Date();

      const resetOutcome = computeLazyReset(
        {
          resetType: listData.resetType,
          resetTime: listData.resetTime,
          weeklyResetDay: listData.weeklyResetDay,
          timezone: listData.timezone,
          nextResetAt: listData.nextResetAt,
          currentCycle: listData.currentCycle,
          completedCount: listData.completedCount,
          celebrationCycle: listData.celebrationCycle,
        },
        now,
      );

      const currentCycle = resetOutcome.currentCycle;
      const taskCount: number = listData.taskCount ?? 0;
      const isCurrentlyCompleted = taskData.completedCycle === currentCycle;

      let newCompletedCount: number;
      let allCompleted = false;
      let celebrationTriggered = false;
      let newCelebrationCycle = resetOutcome.celebrationCycle;

      if (!isCurrentlyCompleted) {
        // Complete
        newCompletedCount = Math.min(resetOutcome.completedCount + 1, taskCount);
        transaction.update(taskRef, {
          completedCycle: currentCycle,
          updatedAt: FieldValue.serverTimestamp(),
        });

        allCompleted = taskCount > 0 && newCompletedCount === taskCount;
        celebrationTriggered = allCompleted && resetOutcome.celebrationCycle !== currentCycle;
        if (celebrationTriggered) newCelebrationCycle = currentCycle;
      } else {
        // Uncomplete — never replays the celebration, never clears celebrationCycle.
        newCompletedCount = Math.max(resetOutcome.completedCount - 1, 0);
        transaction.update(taskRef, {
          completedCycle: null,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      transaction.update(listRef, {
        ...(resetOutcome.update ?? {}),
        completedCount: newCompletedCount,
        celebrationCycle: newCelebrationCycle,
        updatedAt: Timestamp.fromDate(now),
      });

      return {
        status: "ok",
        completed: !isCurrentlyCompleted,
        completedCount: newCompletedCount,
        taskCount,
        allCompleted,
        celebrationTriggered,
        currentCycle,
      };
    });

    if (result.status === "profile_not_found") return badRequest("profile_not_found");
    if (result.status === "list_not_found") return badRequest("list_not_found");
    if (result.status === "task_not_found") return badRequest("task_not_found");

    return Response.json({
      ok: true,
      completed: result.completed,
      completedCount: result.completedCount,
      taskCount: result.taskCount,
      allCompleted: result.allCompleted,
      celebrationTriggered: result.celebrationTriggered,
      currentCycle: result.currentCycle,
    });
  } catch {
    return internalError();
  }
}
