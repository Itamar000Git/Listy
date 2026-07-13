import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminFirestore } from "@/lib/firebase/admin";
import { badRequest, internalError } from "@/lib/api/respond";
import { authenticateFamily } from "@/lib/api/authenticate";
import { familyPath } from "@/lib/firestore/paths";
import { familyBootstrapSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

const DEFAULT_TIMEZONE = "Asia/Jerusalem";

/**
 * Idempotent family initialization (specification §8.1). Safe to call on
 * every sign-in / registration: creates the family document only if it
 * does not already exist, and never overwrites existing data. This
 * repairs the case where Firebase Auth account creation succeeded but an
 * earlier bootstrap call failed partway through.
 */
export async function POST(request: Request) {
  const auth = await authenticateFamily(request);
  if ("errorResponse" in auth) return auth.errorResponse;
  const { familyId } = auth;

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return badRequest("invalid_json");
  }

  const parsed = familyBootstrapSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("invalid_input");
  }

  try {
    const familyRef = adminFirestore.doc(familyPath(familyId));
    const existing = await familyRef.get();

    if (existing.exists) {
      const data = existing.data();
      return Response.json({
        ok: true,
        created: false,
        family: { name: data?.name ?? "", timezone: data?.timezone ?? DEFAULT_TIMEZONE },
      });
    }

    const name = parsed.data.name ?? "המשפחה שלי";
    const timezone = parsed.data.timezone ?? DEFAULT_TIMEZONE;

    await familyRef.create({
      name,
      timezone,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return Response.json({ ok: true, created: true, family: { name, timezone } });
  } catch {
    // familyRef.create() throws ALREADY_EXISTS on a concurrent duplicate
    // bootstrap call; treat that race as a successful no-op rather than
    // an error, since the desired end state (family exists) is reached
    // either way.
    try {
      const familyRef = adminFirestore.doc(familyPath(familyId));
      const existing = await familyRef.get();
      if (existing.exists) {
        const data = existing.data();
        return Response.json({
          ok: true,
          created: false,
          family: { name: data?.name ?? "", timezone: data?.timezone ?? DEFAULT_TIMEZONE },
        });
      }
    } catch {
      // fall through to internalError below
    }
    return internalError();
  }
}
