import "client-only";

import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
  type Auth,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

function readFirebaseWebConfig() {
  // Next.js inlines NEXT_PUBLIC_* vars into the client bundle only when
  // they appear as static `process.env.NEXT_PUBLIC_X` expressions — a
  // dynamic `process.env[name]` lookup is not statically analyzable, so
  // it would silently resolve to undefined in the browser. Each var is
  // therefore referenced literally here rather than via a loop.
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  };

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `חסרים משתני סביבה של Firebase: ${missing.join(", ")}. ` +
        "יש להגדיר אותם בקובץ .env.local (ראו .env.example).",
    );
  }

  return config as Record<keyof typeof config, string>;
}

function createFirebaseClientApp(): FirebaseApp {
  const existingApp = getApps()[0];
  if (existingApp) return existingApp;

  return initializeApp(readFirebaseWebConfig());
}

export const firebaseApp: FirebaseApp = createFirebaseClientApp();

export const firebaseAuth: Auth = getAuth(firebaseApp);

// Fire-and-forget: browserLocalPersistence is the default for web, but we
// set it explicitly so a session survives closing the browser/tab, per the
// "persistent login session" requirement. Auth still works while this
// resolves; it only affects whether a session is remembered across reloads.
void setPersistence(firebaseAuth, browserLocalPersistence);

export const firestoreClient: Firestore = getFirestore(firebaseApp);
