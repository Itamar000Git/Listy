import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "@/lib/firebase/admin";

/**
 * Typed error for missing/invalid/expired auth tokens. Route handlers
 * should catch this and respond 401 without leaking the original
 * Firebase Admin error (which can contain internal detail).
 */
export class AuthenticationError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthenticationError";
  }
}

function extractBearerToken(request: Request): string {
  const header = request.headers.get("authorization");

  if (!header || !header.startsWith("Bearer ")) {
    throw new AuthenticationError("Missing Authorization: Bearer <token> header");
  }

  const token = header.slice("Bearer ".length).trim();

  if (!token) {
    throw new AuthenticationError("Missing Authorization: Bearer <token> header");
  }

  return token;
}

/**
 * Verifies the Firebase ID token carried on a request's Authorization
 * header and returns the decoded token. Throws AuthenticationError for
 * any failure mode (missing header, malformed token, expired token,
 * revoked token) — callers should not need to distinguish these cases,
 * they all mean "respond 401".
 */
export async function verifyRequestToken(request: Request): Promise<DecodedIdToken> {
  const token = extractBearerToken(request);

  try {
    return await adminAuth.verifyIdToken(token);
  } catch {
    // Deliberately discard the original Firebase error (may contain
    // internal detail); the caller only needs to know it failed.
    throw new AuthenticationError("Invalid or expired token");
  }
}
