import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminFirestore } from "@/lib/firebase/admin";
import { badRequest, internalError } from "@/lib/api/respond";
import { authenticateFamily } from "@/lib/api/authenticate";
import { listPath, profilePath, taskPath } from "@/lib/firestore/paths";
import { taskDeleteSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

/**
 * Soft-deletes a task and keeps the list's taskCount/completedCount
 * counters consistent (specification §19/§21) — counters are never
 * allowed to go negative, and deleting a task never replays the
 * celebration (celebrationCycle is left untouched).
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

  const parsed = taskDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("invalid_input");
  }

  const { profileId, listId, taskId } = parsed.data;
  const profileRef = adminFirestore.doc(profilePath(familyId, profileId));
  const listRef = adminFirestore.doc(listPath(familyId, profileId, listId));
  const taskRef = adminFirestore.doc(taskPath(familyId, profileId, listId, taskId));

  try {
    const result = await adminFirestore.runTransaction(async (transaction) => {
      const [profileSnapshot, listSnapshot, taskSnapshot] = await Promise.all([
        transaction.get(profileRef),
        transaction.get(listRef),
        transaction.get(taskRef),
      ]);

      if (!profileSnapshot.exists || profileSnapshot.data()?.isDeleted) {
        return { notFound: true as const };
      }
      if (!listSnapshot.exists || listSnapshot.data()?.isDeleted) {
        return { notFound: true as const };
      }
      if (!taskSnapshot.exists) return { notFound: true as const };

      const taskData = taskSnapshot.data()!;
      if (taskData.isDeleted) return { notFound: false as const, alreadyDeleted: true as const };

      const listData = listSnapshot.data()!;
      const wasCompletedThisCycle = taskData.completedCycle === listData.currentCycle;

      transaction.update(taskRef, {
        isDeleted: true,
        deletedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      const listUpdates: Record<string, unknown> = {
        taskCount: Math.max(0, (listData.taskCount ?? 0) - 1),
        updatedAt: Timestamp.now(),
      };
      if (wasCompletedThisCycle) {
        listUpdates.completedCount = Math.max(0, (listData.completedCount ?? 0) - 1);
      }
      transaction.update(listRef, listUpdates);

      return { notFound: false as const, alreadyDeleted: false as const };
    });

    if (result.notFound) {
      return badRequest("task_not_found");
    }

    return Response.json({ ok: true });
  } catch {
    return internalError();
  }
}
