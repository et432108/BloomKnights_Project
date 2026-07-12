import type { Allocations, BalanceSnapshot, Debt, SavingsGoal } from "@/types";
import { remainingBalance } from "@/lib/debt";

/**
 * Dashboard fund-allocation model — the budget pie on the Home dashboard.
 *
 * A *planned monthly outflow*, split into two groups:
 *
 *   REQUIRED (non-discretionary — comes out of income first):
 *     Expenses               = fixed bills (from fixed_expenses)
 *     Required Debt Payments = minimum payments on required debts (mortgage,
 *                              car loan — `isRequired`), capped at what's owed.
 *
 *   DISCRETIONARY (what's left after required obligations — split by %):
 *     discretionary = income − (fixed bills + required debt payments)
 *     Debt Paydown = discretionary × debt%, funding the *revolving* debts
 *                    (credit cards): at least their minimums, up to the budget,
 *                    never more than owed.
 *     Fun Money    = discretionary × fun%
 *     Savings $    = discretionary × savings%, split into:
 *       Emergency Fund = monthly contribution toward the EF savings goal
 *       Savings        = whatever savings dollars remain
 *
 * Required debt is treated like a fixed obligation, NOT as discretionary
 * spending — so savings/fun are computed from income *after* required debt is
 * set aside, and are never inflated by money already spoken for.
 *
 * Slices sum to `total`, which may exceed income: a total above income flags
 * that required obligations outstrip the budget; below income means room to
 * spare. This is why the total can be larger than the discretionary number.
 */

/** Distinct, CVD-validated slice colors (see dataviz palette validation). */
export const SLICE_COLORS = {
  expenses: "#10b981", // emerald
  requiredDebt: "#8b5cf6", // violet — required debt minimums (non-discretionary)
  debt: "#6366f1", // indigo — discretionary debt paydown
  fun: "#f59e0b", // amber
  emergency: "#f43f5e", // rose
  savings: "#0ea5e9", // sky
} as const;

export type SliceKey = keyof typeof SLICE_COLORS;

/** Required = must-pay obligations; discretionary = what you choose to do with the rest. */
export type SliceGroup = "required" | "discretionary";

export interface AllocationSlice {
  key: SliceKey;
  label: string;
  /** Planned monthly dollars for this slice. */
  amount: number;
  /** Share of the total planned outflow, 0..100. */
  percent: number;
  color: string;
  group: SliceGroup;
}

export interface DashboardAllocation {
  income: number;
  fixedBills: number;
  /** Minimum payments on required debts (mortgage, car loan) — non-discretionary. */
  requiredDebtPayments: number;
  /** fixedBills + requiredDebtPayments — the non-discretionary floor. */
  requiredObligations: number;
  /** income − requiredObligations, never below 0. */
  discretionary: number;
  /** Total monthly debt repayment: required minimums + discretionary paydown. */
  debtRepayment: number;
  /** Sum of required minimum payments across ALL debts (the repayment floor). */
  requiredMinimums: number;
  /** Ordered: expenses, requiredDebt, debt, fun, emergency, savings. */
  slices: AllocationSlice[];
  /** Sum of slice amounts (may exceed income — see module docs). */
  total: number;
}

export interface BalanceTrend {
  current: number;
  /** Prior month's balance, or null when there's no earlier snapshot. */
  previous: number | null;
  /** Percent change vs the prior month, or null when it can't be computed. */
  deltaPct: number | null;
}

/**
 * Month-over-month trend for the total-balance figure: compares `currentBalance`
 * against the most recent snapshot from a month before `currentMonth`. Returns
 * `deltaPct: null` until there's a prior month to compare against.
 */
export function computeBalanceTrend(
  snapshots: BalanceSnapshot[],
  currentMonth: string,
  currentBalance: number
): BalanceTrend {
  const prior = snapshots
    .filter((s) => s.monthKey < currentMonth)
    .sort((a, b) => (a.monthKey < b.monthKey ? 1 : -1))[0];
  if (!prior || prior.balance === 0) {
    return { current: currentBalance, previous: prior?.balance ?? null, deltaPct: null };
  }
  return {
    current: currentBalance,
    previous: prior.balance,
    deltaPct: ((currentBalance - prior.balance) / prior.balance) * 100,
  };
}

/** Whole months from now until an ISO target date, at least 1. */
export function monthsUntil(targetDateIso: string, from: Date = new Date()): number {
  const target = new Date(targetDateIso);
  if (Number.isNaN(target.getTime())) return 1;
  const months =
    (target.getFullYear() - from.getFullYear()) * 12 +
    (target.getMonth() - from.getMonth());
  return Math.max(1, months);
}

/** A savings goal is treated as the emergency fund when its title says so. */
export function isEmergencyFund(goal: SavingsGoal): boolean {
  return /emergency/i.test(goal.title);
}

/**
 * Monthly contribution needed to reach the emergency-fund goal by its target
 * date, capped at the savings dollars available this month. Zero when there's
 * no emergency-fund goal or it's already fully funded.
 */
export function emergencyFundMonthly(
  goals: SavingsGoal[],
  savingsDollars: number,
  from: Date = new Date()
): number {
  const ef = goals.find(isEmergencyFund);
  if (!ef) return 0;
  const remaining = Math.max(0, ef.targetAmount - ef.currentAmount);
  if (remaining <= 0) return 0;
  const monthly = remaining / monthsUntil(ef.targetDate, from);
  return Math.min(monthly, Math.max(0, savingsDollars));
}

/** Build the fund allocation from income, fixed bills, debts, and the split. */
export function computeDashboardAllocation(
  income: number,
  fixedBills: number,
  allocations: Allocations,
  savingsGoals: SavingsGoal[],
  debts: Debt[],
  from: Date = new Date()
): DashboardAllocation {
  const safeIncome = Math.max(0, income);
  // Bills can't exceed income for the pie's part-to-whole to hold.
  const bills = Math.min(Math.max(0, fixedBills), safeIncome);

  // Required debts (mortgage, car loan) are a non-discretionary obligation, like
  // fixed bills: their minimum payments come out of income *before* the
  // discretionary split, so savings/fun are never inflated by money that's
  // already spoken for. Revolving debts (credit cards) are funded from the
  // discretionary debt budget, matching the app's avalanche payoff model.
  const requiredDebts = debts.filter((d) => d.isRequired);
  const revolvingDebts = debts.filter((d) => !d.isRequired);

  const requiredDebtPayments = requiredDebts.reduce(
    (sum, d) => sum + Math.min(d.minimumPayment, remainingBalance(d)),
    0
  );
  const requiredObligations = bills + requiredDebtPayments;
  // Savings/fun/paydown all draw from what's left after required obligations.
  const discretionary = Math.max(0, safeIncome - requiredObligations);

  // Discretionary debt paydown funds the revolving debts: at least their
  // minimums, up to the debt budget, never more than what's still owed.
  const revolvingOwed = revolvingDebts.reduce((s, d) => s + remainingBalance(d), 0);
  const revolvingMinimums = revolvingDebts.reduce(
    (s, d) => s + Math.min(d.minimumPayment, remainingBalance(d)),
    0
  );
  const debtBudget = (discretionary * allocations.debtTargetPercent) / 100;
  const revolvingRepayment = Math.max(
    Math.min(revolvingMinimums, revolvingOwed),
    Math.min(debtBudget, revolvingOwed)
  );

  const funDollars = (discretionary * allocations.funMoneyPercent) / 100;
  const savingsDollars = (discretionary * allocations.savingsTargetPercent) / 100;

  const emergencyDollars = emergencyFundMonthly(savingsGoals, savingsDollars, from);
  const savingsRest = Math.max(0, savingsDollars - emergencyDollars);

  // Percent is share of the total planned outflow (so the pie reads as a whole
  // even when required obligations push the total above or below income).
  const total =
    bills +
    requiredDebtPayments +
    revolvingRepayment +
    funDollars +
    emergencyDollars +
    savingsRest;
  const pct = (amt: number) => (total > 0 ? (amt / total) * 100 : 0);
  const slice = (
    key: SliceKey,
    label: string,
    amount: number,
    group: SliceGroup
  ): AllocationSlice => ({
    key,
    label,
    amount,
    percent: pct(amount),
    color: SLICE_COLORS[key],
    group,
  });

  const slices: AllocationSlice[] = [
    slice("expenses", "Expenses", bills, "required"),
    slice("requiredDebt", "Required Debt Payments", requiredDebtPayments, "required"),
    slice("debt", "Debt Paydown", revolvingRepayment, "discretionary"),
    slice("fun", "Fun Money", funDollars, "discretionary"),
    slice("emergency", "Emergency Fund", emergencyDollars, "discretionary"),
    slice("savings", "Savings", savingsRest, "discretionary"),
  ];

  // Repayment floor across ALL debts — used elsewhere as the interest-agnostic
  // "you must pay at least this much toward debt" figure.
  const requiredMinimums = debts.reduce(
    (sum, d) => sum + Math.min(d.minimumPayment, remainingBalance(d)),
    0
  );

  return {
    income: safeIncome,
    fixedBills: bills,
    requiredDebtPayments,
    requiredObligations,
    discretionary,
    debtRepayment: requiredDebtPayments + revolvingRepayment,
    requiredMinimums,
    slices,
    total,
  };
}
