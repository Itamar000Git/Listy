import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const REQUIRED_ADMIN_ENV_VARS = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
] as const;

function readServiceAccountConfig() {
  const missing = REQUIRED_ADMIN_ENV_VARS.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(
      `חסרים משתני סביבה של Firebase Admin: ${missing.join(", ")}. ` +
        "יש להגדיר אותם בהגדרות השרת (.env.local מקומית, או Vercel Environment Variables).",
    );
  }

  return {
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    // Service-account JSON keys store the private key with literal "\n"
    // sequences once flattened into a single-line env var; convert them
    // back to real newlines or the PEM key fails to parse.
    privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
  };
}

function createFirebaseAdminApp(): App {
  const existingApp = getApps()[0];
  if (existingApp) return existingApp;

  return initializeApp({
    credential: cert(readServiceAccountConfig()),
  });
}

const firebaseAdminApp: App = createFirebaseAdminApp();

export const adminAuth: Auth = getAuth(firebaseAdminApp);

export const adminFirestore: Firestore = getFirestore(firebaseAdminApp);
