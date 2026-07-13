import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminFirestore } from "@/lib/firebase/admin";
import { badRequest, internalError } from "@/lib/api/respond";
import { authenticateFamily } from "@/lib/api/authenticate";
import { familyPath } from "@/lib/firestore/paths";
import { familyUpdateSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

/**
 * Updates only safe, non-authentication family fields (display name,
 * timezone). Email/password changes go through the Firebase Auth client
 * SDK directly (specification §7.9) — this route never touches
 * credentials.
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

  const parsed = familyUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("invalid_input");
  }

  if (parsed.data.name === undefined && parsed.data.timezone === undefined) {
    return badRequest("no_fields_to_update");
  }

  try {
    const familyRef = adminFirestore.doc(familyPath(familyId));
    const existing = await familyRef.get();

    if (!existing.exists) {
      return badRequest("family_not_found");
    }

    const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.timezone !== undefined) updates.timezone = parsed.data.timezone;

    await familyRef.update(updates);

    const updated = await familyRef.get();
    const data = updated.data();
    return Response.json({ ok: true, family: { name: data?.name, timezone: data?.timezone } });
  } catch {
    return internalError();
  }
}
