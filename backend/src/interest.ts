import type { CompoundingFrequency } from "./types";

/**
 * Interest-aware debt math (debt-interest-model). Every function here is pure
 * and deterministic — no I/O, no wall-clock reads — so payoff and interest
 * assumptions stay aligned with the schema and are trivially testable.
 */

/** Compounding periods per year for each frequency. */
const PERIODS_PER_YEAR: Record<CompoundingFrequency, number> = {
  daily: 365,
  monthly: 12,
  annually: 1,
};

/** Default APR (%) at or above which a debt is considered "high interest". */
export const HIGH_INTEREST_THRESHOLD = 20;

function assertNonNegative(label: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite number >= 0, got ${value}`);
  }
}

/**
 * The periodic interest rate (as a decimal) for one compounding period.
 * e.g. 22% APR compounded monthly -> 0.22 / 12 ≈ 0.018333.
 */
export function periodicRate(
  aprPercent: number,
  frequency: CompoundingFrequency
): number {
  assertNonNegative("aprPercent", aprPercent);
  return aprPercent / 100 / PERIODS_PER_YEAR[frequency];
}

/**
 * Compound interest accrued over a cycle of `periods` compounding periods.
 * A = P((1 + r)^periods - 1). `periods` is expressed in the given frequency's
 * units (e.g. 30 for a 30-day daily cycle, 1 for one monthly cycle).
 */
export function interestForCycle(
  balance: number,
  aprPercent: number,
  frequency: CompoundingFrequency,
  periods: number
): number {
  assertNonNegative("balance", balance);
  assertNonNegative("periods", periods);
  const r = periodicRate(aprPercent, frequency);
  return balance * (Math.pow(1 + r, periods) - 1);
}

/**
 * Split a payment into interest-first, then principal — the standard order in
 * which a repayment is applied. Never returns negatives; a payment smaller than
 * the accrued interest contributes $0 to principal.
 */
export function splitPaymentPrincipalInterest(
  amount: number,
  accruedInterest: number
): { principalPortion: number; interestPortion: number } {
  assertNonNegative("amount", amount);
  assertNonNegative("accruedInterest", accruedInterest);
  const interestPortion = Math.min(amount, accruedInterest);
  const principalPortion = amount - interestPortion;
  return { principalPortion, interestPortion };
}

/** Whether a debt's APR is high enough to prioritize (avalanche-first). */
export function isHighInterest(
  aprPercent: number,
  threshold: number = HIGH_INTEREST_THRESHOLD
): boolean {
  assertNonNegative("aprPercent", aprPercent);
  return aprPercent >= threshold;
}

export interface PayoffProjection {
  /** Number of monthly payments to clear the balance. */
  months: number;
  /** Total interest paid over the life of the payoff. */
  totalInterest: number;
  /** False if the payment never covers the monthly interest (never pays off). */
  paidOff: boolean;
}

/**
 * Simulate paying `monthlyPayment` against `balance` at `aprPercent`, compounded
 * monthly, until cleared. If a payment can't cover the first month's interest the
 * balance never falls, so we stop at `maxMonths` and report `paidOff: false`.
 */
export function projectMonthlyPayoff(
  balance: number,
  aprPercent: number,
  monthlyPayment: number,
  maxMonths: number = 600
): PayoffProjection {
  assertNonNegative("balance", balance);
  assertNonNegative("monthlyPayment", monthlyPayment);

  if (balance === 0) return { months: 0, totalInterest: 0, paidOff: true };

  const rate = periodicRate(aprPercent, "monthly");
  let remaining = balance;
  let totalInterest = 0;
  let months = 0;

  while (remaining > 0 && months < maxMonths) {
    const interest = remaining * rate;
    // Payment can't keep up with interest -> balance won't shrink. Bail out.
    if (monthlyPayment <= interest && remaining + interest > monthlyPayment) {
      return { months: maxMonths, totalInterest, paidOff: false };
    }
    totalInterest += interest;
    remaining = remaining + interest - monthlyPayment;
    months += 1;
  }

  return { months, totalInterest, paidOff: remaining <= 0 };
}
