import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminFirestore } from "@/lib/firebase/admin";
import { badRequest, internalError } from "@/lib/api/respond";
import { authenticateFamily } from "@/lib/api/authenticate";
import { taskPath } from "@/lib/firestore/paths";
import { taskUpdateSchema } from "@/lib/validation/schemas";
import { isListActive, isProfileActive } from "@/lib/api/ownership";

export const runtime = "nodejs";

/**
 * Updates title/imageKey only (specification §21) — must not touch
 * completion or list counters. Completion goes through
 * /api/tasks/toggle-completion instead.
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

  const parsed = taskUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("invalid_input");
  }

  const { profileId, listId, taskId, title, description, imageKey } = parsed.data;

  if (title === undefined && description === undefined && imageKey === undefined) {
    return badRequest("no_fields_to_update");
  }

  try {
    if (!(await isProfileActive(adminFirestore, familyId, profileId))) {
      return badRequest("profile_not_found");
    }
    if (!(await isListActive(adminFirestore, familyId, profileId, listId))) {
      return badRequest("list_not_found");
    }

    const taskRef = adminFirestore.doc(taskPath(familyId, profileId, listId, taskId));
    const existing = await taskRef.get();

    if (!existing.exists || existing.data()?.isDeleted) {
      return badRequest("task_not_found");
    }

    const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (imageKey !== undefined) updates.imageKey = imageKey;

    await taskRef.update(updates);

    return Response.json({ ok: true });
  } catch {
    return internalError();
  }
}
