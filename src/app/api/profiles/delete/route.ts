import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminFirestore } from "@/lib/firebase/admin";
import { badRequest, internalError } from "@/lib/api/respond";
import { authenticateFamily } from "@/lib/api/authenticate";
import { profilePath } from "@/lib/firestore/paths";
import { profileDeleteSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

/**
 * Soft-deletes a profile (specification §22): hides it from selection
 * while preserving its lists and tasks for future recovery. Idempotent —
 * deleting an already-deleted profile is a no-op success, not an error.
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

  const parsed = profileDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("invalid_input");
  }

  try {
    const profileRef = adminFirestore.doc(profilePath(familyId, parsed.data.profileId));
    const existing = await profileRef.get();

    if (!existing.exists) {
      return badRequest("profile_not_found");
    }

    if (existing.data()?.isDeleted) {
      return Response.json({ ok: true });
    }

    await profileRef.update({
      isDeleted: true,
      deletedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return Response.json({ ok: true });
  } catch {
    return internalError();
  }
}
