import * as Google from "expo-auth-session/providers/google";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut as fbSignOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { fetchUserProfile, upsertUserProfile } from "@/lib/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import type { UserProfile } from "@/types";

/**
 * Hook that wires Federated Google OAuth via expo-auth-session into Firebase
 * Auth (README §Backend — Firebase Auth + Google OAuth).
 */
export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  const signInWithGoogleResponse = async () => {
    if (response?.type !== "success") return;
    const idToken = response.params.id_token;
    const credential = GoogleAuthProvider.credential(idToken);
    await signInWithCredential(auth, credential);
  };

  return { request, response, promptAsync, signInWithGoogleResponse };
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
