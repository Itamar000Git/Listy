import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminFirestore } from "@/lib/firebase/admin";
import { badRequest, internalError } from "@/lib/api/respond";
import { authenticateFamily } from "@/lib/api/authenticate";
import { listsCollectionPath, profilePath } from "@/lib/firestore/paths";
import { listCreateSchema } from "@/lib/validation/schemas";
import { computeNextReset } from "@/lib/reset/compute-next-reset";

export const runtime = "nodejs";

const DEFAULT_TIMEZONE = "Asia/Jerusalem";
const DEFAULT_RESET_TIME = "04:00";

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

  const parsed = listCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("invalid_input");
  }

  const { profileId, name, resetType } = parsed.data;
  const timezone = parsed.data.timezone ?? DEFAULT_TIMEZONE;
  const resetTime = resetType === "never" ? null : (parsed.data.resetTime ?? DEFAULT_RESET_TIME);
  const weeklyResetDay = resetType === "weekly" ? (parsed.data.weeklyResetDay ?? 0) : null;

  try {
    const profileSnapshot = await adminFirestore.doc(profilePath(familyId, profileId)).get();
    if (!profileSnapshot.exists || profileSnapshot.data()?.isDeleted) {
      return badRequest("profile_not_found");
    }

    const listsCollection = adminFirestore.collection(listsCollectionPath(familyId, profileId));
    const activeLists = await listsCollection.where("isDeleted", "==", false).get();

    const nextResetDate = computeNextReset({
      resetType,
      resetTime: resetTime ?? DEFAULT_RESET_TIME,
      weeklyResetDay,
      timezone,
      now: new Date(),
    });

    const listData = {
      name,
      resetType,
      resetTime,
      weeklyResetDay,
      timezone,
      nextResetAt: nextResetDate ? Timestamp.fromDate(nextResetDate) : null,
      lastResetAt: null,
      currentCycle: 1,
      taskCount: 0,
      completedCount: 0,
      celebrationCycle: null,
      displayOrder: activeLists.size,
      isDeleted: false,
      deletedAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const created = await listsCollection.add(listData);

    return Response.json({
      ok: true,
      list: {
        id: created.id,
        name,
        resetType,
        resetTime,
        weeklyResetDay,
        timezone,
        currentCycle: 1,
        taskCount: 0,
        completedCount: 0,
        displayOrder: listData.displayOrder,
      },
    });
  } catch {
    return internalError();
  }
}
