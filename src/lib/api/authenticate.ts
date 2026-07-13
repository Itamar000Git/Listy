import "server-only";

import { internalError, unauthorized } from "@/lib/api/respond";
import { AuthenticationError, verifyRequestToken } from "@/lib/firebase/verify-token";

/**
 * Verifies the request's Firebase ID token and returns the family ID
 * (the Firebase UID). On failure, returns a ready-to-return Response
 * instead of throwing, so route handlers can early-return without
 * duplicating try/catch boilerplate:
 *
 *   const auth = await authenticateFamily(request);
 *   if ("errorResponse" in auth) return auth.errorResponse;
 */
export async function authenticateFamily(
  request: Request,
): Promise<{ familyId: string } | { errorResponse: Response }> {
  try {
    const decodedToken = await verifyRequestToken(request);
    return { familyId: decodedToken.uid };
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return { errorResponse: unauthorized() };
    }
    return { errorResponse: internalError() };
  }
}
