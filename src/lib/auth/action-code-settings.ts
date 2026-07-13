import "client-only";

import type { ActionCodeSettings } from "firebase/auth";
import { getAppUrl } from "@/lib/app-url";

/**
 * Sends the user back to this app's own /login screen after completing
 * an email-verification or password-reset action on Firebase's hosted
 * page, using NEXT_PUBLIC_APP_URL rather than Firebase's default
 * handler domain.
 */
export function getAuthActionCodeSettings(): ActionCodeSettings {
  return {
    url: `${getAppUrl()}/login`,
    handleCodeInApp: false,
  };
}
