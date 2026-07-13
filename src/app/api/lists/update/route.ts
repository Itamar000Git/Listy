import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminFirestore } from "@/lib/firebase/admin";
import { badRequest, internalError } from "@/lib/api/respond";
import { authenticateFamily } from "@/lib/api/authenticate";
import { listPath } from "@/lib/firestore/paths";
import { listUpdateSchema } from "@/lib/validation/schemas";
import { computeNextReset } from "@/lib/reset/compute-next-reset";
import { isProfileActive } from "@/lib/api/ownership";
import type { ResetType } from "@/lib/types/domain";

export const runtime = "nodejs";

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

  const parsed = listUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("invalid_input");
  }

  const { profileId, listId, name, resetType, resetTime, weeklyResetDay, timezone } = parsed.data;

  if (
    name === undefined &&
    resetType === undefined &&
    resetTime === undefined &&
    weeklyResetDay === undefined &&
    timezone === undefined
  ) {
    return badRequest("no_fields_to_update");
  }

  try {
    if (!(await isProfileActive(adminFirestore, familyId, profileId))) {
      return badRequest("profile_not_found");
    }

    const listRef = adminFirestore.doc(listPath(familyId, profileId, listId));
    const existing = await listRef.get();

    if (!existing.exists || existing.data()?.isDeleted) {
      return badRequest("list_not_found");
    }

    const current = existing.data()!;
    const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };

    if (name !== undefined) updates.name = name;

    const resetSettingsChanged =
      resetType !== undefined ||
      resetTime !== undefined ||
      weeklyResetDay !== undefined ||
      timezone !== undefined;

    if (resetSettingsChanged) {
      const mergedResetType: ResetType = resetType ?? current.resetType;
      const mergedTimezone = timezone ?? current.timezone;
      const mergedResetTime =
        mergedResetType === "never" ? null : (resetTime ?? current.resetTime ?? DEFAULT_RESET_TIME);
      const mergedWeeklyResetDay =
        mergedResetType === "weekly" ? (weeklyResetDay ?? current.weeklyResetDay ?? 0) : null;

      updates.resetType = mergedResetType;
      updates.resetTime = mergedResetTime;
      updates.weeklyResetDay = mergedWeeklyResetDay;
      updates.timezone = mergedTimezone;

      const nextResetDate = computeNextReset({
        resetType: mergedResetType,
        resetTime: mergedResetTime ?? DEFAULT_RESET_TIME,
        weeklyResetDay: mergedWeeklyResetDay,
        timezone: mergedTimezone,
        now: new Date(),
      });
      updates.nextResetAt = nextResetDate ? Timestamp.fromDate(nextResetDate) : null;
    }

    await listRef.update(updates);

    return Response.json({ ok: true });
  } catch {
    return internalError();
  }
}
