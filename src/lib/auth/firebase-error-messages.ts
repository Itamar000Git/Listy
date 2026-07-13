import { FirebaseError } from "firebase/app";

const GENERIC_ERROR_HE = "אירעה שגיאה. נסו שוב.";

const MESSAGES_HE: Record<string, string> = {
  "auth/invalid-email": "כתובת האימייל אינה תקינה.",
  "auth/user-disabled": "החשבון הזה הושבת.",
  "auth/user-not-found": "אימייל או סיסמה שגויים.",
  "auth/wrong-password": "אימייל או סיסמה שגויים.",
  "auth/invalid-credential": "אימייל או סיסמה שגויים.",
  "auth/email-already-in-use": "כתובת האימייל הזו כבר רשומה במערכת.",
  "auth/weak-password": "הסיסמה חלשה מדי. יש להזין לפחות 8 תווים.",
  "auth/too-many-requests": "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.",
  "auth/network-request-failed": "בעיית תקשורת. בדקו את החיבור לאינטרנט ונסו שוב.",
  "auth/requires-recent-login": "מטעמי אבטחה יש להתחבר מחדש לפני ביצוע הפעולה הזו.",
};

/**
 * Maps a Firebase Auth error to a Hebrew message safe to show a family
 * member — never surfaces the raw Firebase error code/message.
 */
export function firebaseAuthErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    return MESSAGES_HE[error.code] ?? GENERIC_ERROR_HE;
  }
  return GENERIC_ERROR_HE;
}
