import "client-only";

/**
 * Maps an API response's HTTP status to a distinct Hebrew message —
 * "unauthorized" and "server error" read differently to a parent than
 * a generic "something went wrong", per the offline/error-states
 * requirement to keep these states visually/textually distinct.
 */
export function errorMessageForStatus(status: number): string {
  if (status === 401) return "יש להתחבר מחדש כדי להמשיך.";
  if (status === 400) return "הבקשה אינה תקינה. נסו שוב.";
  if (status >= 500) return "אירעה שגיאה בשרת. נסו שוב מאוחר יותר.";
  return "אירעה שגיאה. נסו שוב.";
}
