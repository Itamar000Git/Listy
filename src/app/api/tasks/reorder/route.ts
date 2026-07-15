import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminFirestore } from "@/lib/firebase/admin";
import { badRequest, internalError } from "@/lib/api/respond";
import { authenticateFamily } from "@/lib/api/authenticate";
import { listPath, profilePath, tasksCollectionPath, taskPath } from "@/lib/firestore/paths";
import { taskReorderSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

/**
 * Persists a new top-to-bottom display order for a list's active tasks
 * (specification: task reordering). The client stages the reorder
 * locally and submits the full ordered set of active task IDs in one
 * request; this route only ever accepts that submission if it is
 * exactly the server's own current active-task set for this list — a
 * mismatch (stale client data, a task completed/deleted on another
 * device mid-reorder, a task ID from a different list) fails the whole
 * request rather than moving anything, so a reorder can never partially
 * apply or touch a task it wasn't authorized to touch.
 *
 * Only `displayOrder`/`updatedAt` are written — completion state,
 * counters, title, description, and imageKey are never touched here.
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

  const parsed = taskReorderSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("invalid_input");
  }

  const { profileId, listId, orderedTaskIds } = parsed.data;
  const profileRef = adminFirestore.doc(profilePath(familyId, profileId));
  const listRef = adminFirestore.doc(listPath(familyId, profileId, listId));
  const tasksCollection = adminFirestore.collection(tasksCollectionPath(familyId, profileId, listId));

  try {
    const result = await adminFirestore.runTransaction(async (transaction) => {
      const [profileSnapshot, listSnapshot, activeTasksSnapshot] = await Promise.all([
        transaction.get(profileRef),
        transaction.get(listRef),
        transaction.get(tasksCollection.where("isDeleted", "==", false)),
      ]);

      if (!profileSnapshot.exists || profileSnapshot.data()?.isDeleted) {
        return { status: "profile_not_found" as const };
      }
      if (!listSnapshot.exists || listSnapshot.data()?.isDeleted) {
        return { status: "list_not_found" as const };
      }

      const activeIds = activeTasksSnapshot.docs.map((doc) => doc.id);
      const activeIdSet = new Set(activeIds);
      const submittedIdSet = new Set(orderedTaskIds);

      // The submitted set must exactly match the server's active set —
      // no unknown IDs, no cross-list/cross-family IDs (they simply
      // won't be in activeIdSet), no soft-deleted task submitted as
      // active, and no active task silently dropped/omitted.
      const isExactMatch =
        activeIdSet.size === submittedIdSet.size &&
        orderedTaskIds.every((id) => activeIdSet.has(id));

      if (!isExactMatch) {
        return { status: "stale_task_set" as const };
      }

      orderedTaskIds.forEach((taskId, index) => {
        transaction.update(adminFirestore.doc(taskPath(familyId, profileId, listId, taskId)), {
          displayOrder: index,
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      return { status: "ok" as const };
    });

    if (result.status === "profile_not_found") return badRequest("profile_not_found");
    if (result.status === "list_not_found") return badRequest("list_not_found");
    if (result.status === "stale_task_set") return badRequest("stale_task_set");

    return Response.json({ ok: true });
  } catch {
    return internalError();
  }
}
