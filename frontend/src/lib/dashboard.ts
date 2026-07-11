import type { Allocations, BalanceSnapshot, SavingsGoal } from "@/types";

/**
 * Dashboard fund-allocation model — the 5-slice pie on the Home dashboard.
 *
 * The pie is a *planned allocation of monthly income* (not actuals):
 *   Expenses  = fixed bills (derived from fixed_expenses, not a % you set)
 *   the remaining discretionary income (income − bills) splits by the three
 *   allocation percentages:
 *     Debt      = discretionary × debt%
 *     Fun Money = discretionary × fun%
 *     Savings $ = discretionary × savings%, which is then split into:
 *       Emergency Fund = monthly contribution toward the EF savings goal
 *       Savings        = whatever savings dollars remain
 * Slice amounts always sum to `income`.
 */

/** Distinct, CVD-validated slice colors (see dataviz palette validation). */
export const SLICE_COLORS = {
  expenses: "#10b981", // emerald
  debt: "#6366f1", // indigo
  fun: "#f59e0b", // amber
  emergency: "#f43f5e", // rose
  savings: "#0ea5e9", // sky
} as const;

export type SliceKey = keyof typeof SLICE_COLORS;

export interface AllocationSlice {
  key: SliceKey;
  label: string;
  /** Planned monthly dollars for this slice. */
  amount: number;
  /** Share of total income, 0..100. */
  percent: number;
  color: string;
}

export interface DashboardAllocation {
  income: number;
  fixedBills: number;
  discretionary: number;
  /** Ordered: expenses, debt, fun, emergency, savings. */
  slices: AllocationSlice[];
  /** Sum of slice amounts — equals `income`. */
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

/** Build the 5-slice fund allocation from income, fixed bills, and the split. */
export function computeDashboardAllocation(
  income: number,
  fixedBills: number,
  allocations: Allocations,
  savingsGoals: SavingsGoal[],
  from: Date = new Date()
): DashboardAllocation {
  const safeIncome = Math.max(0, income);
  // Bills can't exceed income for the pie's part-to-whole to hold.
  const bills = Math.min(Math.max(0, fixedBills), safeIncome);
  const discretionary = Math.max(0, safeIncome - bills);

  const debtDollars = (discretionary * allocations.debtTargetPercent) / 100;
  const funDollars = (discretionary * allocations.funMoneyPercent) / 100;
  const savingsDollars = (discretionary * allocations.savingsTargetPercent) / 100;

  const emergencyDollars = emergencyFundMonthly(savingsGoals, savingsDollars, from);
  const savingsRest = Math.max(0, savingsDollars - emergencyDollars);

  const pct = (amt: number) => (safeIncome > 0 ? (amt / safeIncome) * 100 : 0);
  const slice = (key: SliceKey, label: string, amount: number): AllocationSlice => ({
    key,
    label,
    amount,
    percent: pct(amount),
    color: SLICE_COLORS[key],
  });

  const slices: AllocationSlice[] = [
    slice("expenses", "Expenses", bills),
    slice("debt", "Debt", debtDollars),
    slice("fun", "Fun Money", funDollars),
    slice("emergency", "Emergency Fund", emergencyDollars),
    slice("savings", "Savings", savingsRest),
  ];

  return {
    income: safeIncome,
    fixedBills: bills,
    discretionary,
    slices,
    total: slices.reduce((s, x) => s + x.amount, 0),
  };
}
