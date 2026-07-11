import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

/**
 * Firebase client initialization.
 *
 * NOTE (README §5.1 — Strict Security Separation): this client is used ONLY for
 * Auth, Firestore reads/writes, and *invoking* Cloud Functions. The Gemini API
 * key is never present here — all Gemini calls happen server-side inside a
 * Cloud Function.
 *
 * Config is read from EXPO_PUBLIC_* env vars (see frontend/.env.example). Expo
 * inlines these into the bundle at build time.
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Fail loudly with an actionable message instead of Firebase's cryptic
// `auth/invalid-api-key`, which otherwise crashes the whole app to a blank page.
if (!firebaseConfig.apiKey) {
  throw new Error(
    "Missing Firebase config. Copy frontend/.env.example to frontend/.env, fill in " +
      "the EXPO_PUBLIC_FIREBASE_* values, and restart with `npx expo start --clear`."
  );
}

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
