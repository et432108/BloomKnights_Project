import type { Debt } from "@/types";

/**
 * Frontend payoff/interest helpers for display and guidance. These mirror the
 * backend's documented interest model (monthly compounding) so the UI's numbers
 * stay consistent with the server, but they are a *frontend concern* — used only
 * to render debt cards and payoff guidance, never to persist derived data.
 */

/** APR at or above which a debt is flagged high-interest (matches backend). */
export const HIGH_INTEREST_THRESHOLD = 20;

/** Prefer the richer `aprPercent` when present, else the legacy `interestRate`. */
export function effectiveApr(debt: Debt): number {
  return debt.aprPercent ?? debt.interestRate ?? 0;
}

/** Balance still owed after progress paid, never negative. */
export function remainingBalance(debt: Debt): number {
  return Math.max(0, debt.totalBalance - debt.currentProgress);
}

export function isHighInterest(
  aprPercent: number,
  threshold: number = HIGH_INTEREST_THRESHOLD
): boolean {
  return aprPercent >= threshold;
}

export interface PayoffEstimate {
  /** Months of the given monthly payment to clear the balance. */
  months: number;
  /** Total interest paid over the payoff. */
  totalInterest: number;
  /** False when the payment can't cover monthly interest (never pays off). */
  paidOff: boolean;
}

/**
 * Estimate a monthly-payment payoff at `aprPercent`, compounded monthly. If the
 * payment can't cover the first month's interest the balance never shrinks, so
 * we report `paidOff: false` and stop at `maxMonths`.
 */
export function projectPayoff(
  balance: number,
  aprPercent: number,
  monthlyPayment: number,
  maxMonths = 600
): PayoffEstimate {
  if (balance <= 0) return { months: 0, totalInterest: 0, paidOff: true };
  if (monthlyPayment <= 0) return { months: maxMonths, totalInterest: 0, paidOff: false };

  const monthlyRate = aprPercent / 100 / 12;
  let remaining = balance;
  let totalInterest = 0;
  let months = 0;

  while (remaining > 0 && months < maxMonths) {
    const interest = remaining * monthlyRate;
    if (monthlyPayment <= interest && remaining + interest > monthlyPayment) {
      return { months: maxMonths, totalInterest, paidOff: false };
    }
    totalInterest += interest;
    remaining = remaining + interest - monthlyPayment;
    months += 1;
  }

  return { months, totalInterest, paidOff: remaining <= 0 };
}

/** A calendar payoff date `months` from now, as an ISO date string. */
export function payoffDateFromMonths(months: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

/**
 * Convenience: payoff estimate for a debt using its remaining balance, effective
 * APR, and minimum payment as the assumed monthly payment.
 */
export function payoffForDebt(debt: Debt): PayoffEstimate {
  return projectPayoff(
    remainingBalance(debt),
    effectiveApr(debt),
    debt.minimumPayment
  );
}

export interface PayoffSummary {
  totalOriginal: number;
  totalPaid: number;
  remaining: number;
  /** 0..1 share of total debt paid off across all debts. */
  ratio: number;
}

/** Aggregate debt-free progress across every debt (used by the Home hub). */
export function payoffSummary(debts: Debt[]): PayoffSummary {
  const totalOriginal = debts.reduce((s, d) => s + d.totalBalance, 0);
  const totalPaid = debts.reduce(
    (s, d) => s + Math.min(d.currentProgress, d.totalBalance),
    0
  );
  return {
    totalOriginal,
    totalPaid,
    remaining: Math.max(0, totalOriginal - totalPaid),
    ratio: totalOriginal ? totalPaid / totalOriginal : 0,
  };
}

/** Playful BloomKnights rank derived from overall debt-free progress. */
export function knightRank(ratio: number): string {
  if (ratio >= 1) return "Debt-Free Legend";
  if (ratio >= 0.75) return "Paladin";
  if (ratio >= 0.5) return "Champion";
  if (ratio >= 0.25) return "Knight";
  return "Squire";
}
