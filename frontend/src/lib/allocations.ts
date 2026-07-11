import type { Allocations } from "@/types";

/**
 * Allocation math for the three-bucket method (debt / savings / fun money).
 * These are pure helpers shared by the manual editor UI (edit-allocations) and
 * any programmatic caller — most importantly the future Gemini coach, which
 * will call `setAllocations` on the auth store with a value derived from these
 * same helpers so the human-edited and AI-edited paths stay consistent.
 */

/** The three bucket shares always sum to this. */
export const ALLOCATION_TOTAL = 100;

/** Dollar amount a bucket percentage maps to for a given monthly income. */
export function allocationAmount(income: number, percent: number): number {
  return (income * percent) / 100;
}

/** Round to a whole percent, clamped to 0..100. */
export function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Sum of the three bucket shares (used to validate a hand-entered split). */
export function allocationSum(a: Allocations): number {
  return a.debtTargetPercent + a.savingsTargetPercent + a.funMoneyPercent;
}

/** Valid when every share is finite & non-negative and the three sum to ~100. */
export function isValidAllocations(a: Allocations): boolean {
  const vals = [a.debtTargetPercent, a.savingsTargetPercent, a.funMoneyPercent];
  if (vals.some((v) => !Number.isFinite(v) || v < 0)) return false;
  return Math.abs(allocationSum(a) - ALLOCATION_TOTAL) < 0.5;
}

/**
 * Set the debt share to `debtPercent`, keeping the three buckets summing to
 * 100 by splitting the remainder across savings & fun in their current ratio
 * (falling back to an even split when both are currently zero). This is the
 * single rebalancing rule shared by the slider UI and programmatic callers, so
 * "put more toward debt" behaves identically whether a human or Gemini asks.
 */
export function withDebtPercent(
  current: Allocations,
  debtPercent: number
): Allocations {
  const debt = clampPercent(debtPercent);
  const remainder = ALLOCATION_TOTAL - debt;
  const otherTotal = current.savingsTargetPercent + current.funMoneyPercent;
  const savingsShare = otherTotal > 0 ? current.savingsTargetPercent / otherTotal : 0.5;
  const savings = Math.round(remainder * savingsShare);
  return {
    debtTargetPercent: debt,
    savingsTargetPercent: savings,
    // Fun money absorbs any rounding so the three always total exactly 100.
    funMoneyPercent: remainder - savings,
  };
}
