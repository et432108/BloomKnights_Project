import { useCallback, useState } from "react";
import { Platform } from "react-native";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { fetchUserProfile, upsertUserProfile } from "@/lib/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import type { UserProfile } from "@/types";

/**
 * Google sign-in for web via Firebase's popup flow. Requires no OAuth client
 * IDs — Firebase brokers the whole handshake. On success, `subscribeToAuth`
 * reacts to the auth-state change and hydrates the stores.
 *
 * NOTE: `signInWithPopup` is web-only. Native (iOS/Android) needs a dedicated
 * library (e.g. @react-native-google-signin/google-signin) — not wired up yet.
 */
export function useGoogleAuth() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(async () => {
    if (Platform.OS !== "web") {
      setError("Google sign-in is currently only wired up for web.");
      return;
    }
    setError(null);
    setIsSigningIn(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      // The user dismissing the popup isn't a real failure — stay quiet on it.
      const code = (e as { code?: string }).code;
      if (
        code !== "auth/popup-closed-by-user" &&
        code !== "auth/cancelled-popup-request"
      ) {
        setError(
          e instanceof Error ? e.message : "Sign-in failed. Please try again."
        );
      }
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  return { signIn, isSigningIn, error };
}

/**
 * Subscribe to Firebase Auth state and hydrate the Zustand stores, creating a
 * default user profile on first sign-in.
 */
export function subscribeToAuth() {
  return onAuthStateChanged(auth, async (user) => {
    const { setUser, setProfile } = useAuthStore.getState();
    setUser(user);
    if (!user) {
      setProfile(null);
      return;
    }

    let profile = await fetchUserProfile(user.uid);
    if (!profile) {
      profile = createDefaultProfile(
        user.uid,
        user.email ?? "",
        user.displayName ?? "Knight"
      );
      await upsertUserProfile(profile);
    }
    setProfile(profile);
  });
}

/** Sensible starting allocation for the three-bucket method (README §1). */
export function createDefaultProfile(
  uid: string,
  email: string,
  displayName: string
): UserProfile {
  return {
    uid,
    email,
    displayName,
    createdAt: new Date().toISOString(),
    monthlyIncome: 0,
    allocations: {
      debtTargetPercent: 50,
      savingsTargetPercent: 40,
      funMoneyPercent: 10,
    },
  };
}

export async function signOut() {
  await fbSignOut(auth);
  useAuthStore.getState().reset();
}
