import { create } from "zustand";
import type { User } from "firebase/auth";
import type { Allocations, UserProfile } from "@/types";
import { upsertUserProfile } from "@/lib/firestore";
import { isValidAllocations } from "@/lib/allocations";

interface AuthState {
  /** Firebase Auth user (null when signed out, undefined while resolving). */
  user: User | null | undefined;
  profile: UserProfile | null;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  /** Persist a partial profile change to Firestore and mirror it into state. */
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  /**
   * Set the three-bucket split (debt / savings / fun money). This is the single
   * entry point for changing allocations — the edit-allocations screen calls it,
   * and the future Gemini coach will call the same action to adjust the plan on
   * the user's behalf. Rejects a split that isn't non-negative and summing to 100.
   */
  setAllocations: (allocations: Allocations) => Promise<void>;
  reset: () => void;
}

/**
 * Lightweight, decoupled auth store (README §Frontend — Zustand).
 * Session persistence is handled by Firebase Auth; this store just mirrors it
 * into React-friendly reactive state.
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  user: undefined,
  profile: null,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),

  updateProfile: async (patch) => {
    const current = get().profile;
    if (!current) throw new Error("No user profile is loaded.");
    const updated = { ...current, ...patch };
    await upsertUserProfile(updated);
    set({ profile: updated });
  },

  setAllocations: async (allocations) => {
    if (!isValidAllocations(allocations)) {
      throw new Error("Allocations must be non-negative and sum to 100%.");
    }
    await get().updateProfile({ allocations });
  },

  reset: () => set({ user: null, profile: null }),
}));
