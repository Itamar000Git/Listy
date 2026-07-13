import "client-only";

import { firebaseAuth } from "@/lib/firebase/client";

/**
 * Fetches a fresh Firebase ID token for the signed-in user and returns
 * it as an Authorization header value, for calling trusted API routes.
 * Returns null when nobody is signed in.
 */
export async function getAuthHeader(): Promise<{ Authorization: string } | null> {
  const user = firebaseAuth.currentUser;
  if (!user) return null;

  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

/**
 * Convenience wrapper around fetch() that attaches the current user's
 * Firebase ID token, and JSON-encodes a body when provided.
 */
export async function callApi(
  input: string,
  init?: { method?: string; body?: unknown },
): Promise<Response> {
  const authHeader = await getAuthHeader();
  if (!authHeader) {
    throw new Error("not_authenticated");
  }

  return fetch(input, {
    method: init?.method ?? "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}
