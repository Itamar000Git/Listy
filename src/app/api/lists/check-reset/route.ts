import "server-only";

import { adminFirestore } from "@/lib/firebase/admin";
import { badRequest, internalError } from "@/lib/api/respond";
import { authenticateFamily } from "@/lib/api/authenticate";
import { listPath } from "@/lib/firestore/paths";
import { listCheckResetSchema } from "@/lib/validation/schemas";
import { computeLazyReset } from "@/lib/reset/apply-lazy-reset";

export const runtime = "nodejs";

/**
 * Standalone lazy-reset check (specification §19), called before
 * rendering a list's board or overview so a stale list self-heals on
 * the next read. Also called internally by toggle-completion, so most
 * of the time this route is a defensive extra call, not the only path.
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

  const parsed = listCheckResetSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("invalid_input");
  }

  const { profileId, listId } = parsed.data;
  const listRef = adminFirestore.doc(listPath(familyId, profileId, listId));

  try {
    const result = await adminFirestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(listRef);
      if (!snapshot.exists || snapshot.data()?.isDeleted) {
        return { notFound: true as const };
      }

      const data = snapshot.data()!;
      const resetOutcome = computeLazyReset(
        {
          resetType: data.resetType,
          resetTime: data.resetTime,
          weeklyResetDay: data.weeklyResetDay,
          timezone: data.timezone,
          nextResetAt: data.nextResetAt,
          currentCycle: data.currentCycle,
          completedCount: data.completedCount,
          celebrationCycle: data.celebrationCycle,
        },
        new Date(),
      );

      if (resetOutcome.update) {
        transaction.update(listRef, resetOutcome.update);
      }

      return {
        notFound: false as const,
        currentCycle: resetOutcome.currentCycle,
        wasReset: resetOutcome.wasReset,
      };
    });

    if (result.notFound) {
      return badRequest("list_not_found");
    }

    return Response.json({ ok: true, currentCycle: result.currentCycle, wasReset: result.wasReset });
  } catch {
    return internalError();
  }
}
