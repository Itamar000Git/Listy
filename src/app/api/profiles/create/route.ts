import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminFirestore } from "@/lib/firebase/admin";
import { badRequest, internalError } from "@/lib/api/respond";
import { authenticateFamily } from "@/lib/api/authenticate";
import { familyPath, profilesCollectionPath } from "@/lib/firestore/paths";
import { profileCreateSchema } from "@/lib/validation/schemas";

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

  const parsed = profileCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("invalid_input");
  }

  try {
    const familySnapshot = await adminFirestore.doc(familyPath(familyId)).get();
    if (!familySnapshot.exists) {
      return badRequest("family_not_found");
    }

    const profilesCollection = adminFirestore.collection(profilesCollectionPath(familyId));
    const activeProfiles = await profilesCollection.where("isDeleted", "==", false).get();

    const { name, themeColor } = parsed.data;
    const avatar = parsed.data.avatar ?? null;
    const displayOrder = activeProfiles.size;

    const created = await profilesCollection.add({
      name,
      avatar,
      themeColor,
      displayOrder,
      isDeleted: false,
      deletedAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return Response.json({
      ok: true,
      profile: { id: created.id, name, avatar, themeColor, displayOrder, isDeleted: false },
    });
  } catch {
    return internalError();
  }
}
