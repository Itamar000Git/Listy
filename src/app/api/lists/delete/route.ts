import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminFirestore } from "@/lib/firebase/admin";
import { badRequest, internalError } from "@/lib/api/respond";
import { authenticateFamily } from "@/lib/api/authenticate";
import { listPath } from "@/lib/firestore/paths";
import { listDeleteSchema } from "@/lib/validation/schemas";
import { isProfileActive } from "@/lib/api/ownership";

export const runtime = "nodejs";

/**
 * Soft-deletes a list (specification §22): hides it from the profile
 * overview while preserving its tasks for future recovery. Idempotent.
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

  const parsed = listDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("invalid_input");
  }

  try {
    if (!(await isProfileActive(adminFirestore, familyId, parsed.data.profileId))) {
      return badRequest("profile_not_found");
    }

    const listRef = adminFirestore.doc(listPath(familyId, parsed.data.profileId, parsed.data.listId));
    const existing = await listRef.get();

    if (!existing.exists) {
      return badRequest("list_not_found");
    }

    if (existing.data()?.isDeleted) {
      return Response.json({ ok: true });
    }

    await listRef.update({
      isDeleted: true,
      deletedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return Response.json({ ok: true });
  } catch {
    return internalError();
  }
}
