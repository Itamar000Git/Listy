import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminFirestore } from "@/lib/firebase/admin";
import { badRequest, internalError } from "@/lib/api/respond";
import { authenticateFamily } from "@/lib/api/authenticate";
import { profilePath } from "@/lib/firestore/paths";
import { profileUpdateSchema } from "@/lib/validation/schemas";

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

  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("invalid_input");
  }

  const { profileId, name, avatar, themeColor } = parsed.data;

  if (name === undefined && avatar === undefined && themeColor === undefined) {
    return badRequest("no_fields_to_update");
  }

  try {
    const profileRef = adminFirestore.doc(profilePath(familyId, profileId));
    const existing = await profileRef.get();

    if (!existing.exists || existing.data()?.isDeleted) {
      return badRequest("profile_not_found");
    }

    const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    if (name !== undefined) updates.name = name;
    if (avatar !== undefined) updates.avatar = avatar;
    if (themeColor !== undefined) updates.themeColor = themeColor;

    await profileRef.update(updates);

    return Response.json({ ok: true });
  } catch {
    return internalError();
  }
}
