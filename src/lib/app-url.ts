import "client-only";

/**
 * The app's own public URL, used for Firebase Auth email-action
 * (verification / password-reset) return links so they send the user
 * back to this deployment rather than a hardcoded host. Falls back to
 * the browser's current origin in local development when
 * NEXT_PUBLIC_APP_URL isn't set — never a hardcoded localhost string.
 */
export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}
