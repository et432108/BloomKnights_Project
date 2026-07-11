import { create } from "zustand";
import type { User } from "firebase/auth";
import type { UserProfile } from "@/types";

interface AuthState {
  /** Firebase Auth user (null when signed out, undefined while resolving). */
  user: User | null | undefined;
  profile: UserProfile | null;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  reset: () => void;
}

/**
 * Lightweight, decoupled auth store (README §Frontend — Zustand).
 * Session persistence is handled by Firebase Auth; this store just mirrors it
 * into React-friendly reactive state.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: undefined,
  profile: null,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  reset: () => set({ user: null, profile: null }),
}));
