import "server-only";

/**
 * Small, shared JSON response helpers for Route Handlers. Keeping error
 * shapes uniform means internal error detail (stack traces, Firebase
 * error messages) never leaks to the browser — only a generic code.
 */

export function unauthorized() {
  return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

export function badRequest(error: string) {
  return Response.json({ ok: false, error }, { status: 400 });
}

export function internalError() {
  return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
}
