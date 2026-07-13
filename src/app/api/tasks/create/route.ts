import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminFirestore } from "@/lib/firebase/admin";
import { badRequest, internalError } from "@/lib/api/respond";
import { authenticateFamily } from "@/lib/api/authenticate";
import { listPath, profilePath, tasksCollectionPath } from "@/lib/firestore/paths";
import { taskCreateSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

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

  const parsed = taskCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("invalid_input");
  }

  const { profileId, listId, title, imageKey } = parsed.data;
  const profileRef = adminFirestore.doc(profilePath(familyId, profileId));
  const listRef = adminFirestore.doc(listPath(familyId, profileId, listId));
  const taskRef = adminFirestore.collection(tasksCollectionPath(familyId, profileId, listId)).doc();

  try {
    const result = await adminFirestore.runTransaction(async (transaction) => {
      const [profileSnapshot, listSnapshot] = await Promise.all([
        transaction.get(profileRef),
        transaction.get(listRef),
      ]);

      if (!profileSnapshot.exists || profileSnapshot.data()?.isDeleted) {
        return { notFound: true as const };
      }
      if (!listSnapshot.exists || listSnapshot.data()?.isDeleted) {
        return { notFound: true as const };
      }

      const listData = listSnapshot.data()!;
      const displayOrder = listData.taskCount ?? 0;

      transaction.create(taskRef, {
        title,
        imageKey,
        completedCycle: null,
        displayOrder,
        isDeleted: false,
        deletedAt: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      transaction.update(listRef, {
        taskCount: FieldValue.increment(1),
        updatedAt: Timestamp.now(),
      });

      return { notFound: false as const, displayOrder };
    });

    if (result.notFound) {
      return badRequest("list_not_found");
    }

    return Response.json({
      ok: true,
      task: { id: taskRef.id, title, imageKey, displayOrder: result.displayOrder },
    });
  } catch {
    return internalError();
  }
}
