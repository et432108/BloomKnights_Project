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

/**
 * Project debt-free progress `months` months into the future by simulating the
 * monthly payment plan and applying each month's payments to progress (capped at
 * each debt's balance) — exactly what `provisionThisMonth` does per month, just
 * without persisting. Interest-agnostic, mirroring `payoffSummary`.
 *
 * The dashboard's debt indicator uses this so the Monthly / Annual tabs show the
 * share of debt paid off by month-end / year-end, not the amount paid as of
 * today. `months === 0` returns today's progress (identical to `payoffSummary`).
 */
export function projectedPayoffSummary(
  debts: Debt[],
  monthlyIncome: number,
  debtTargetPercent: number,
  fixedMonthlyBillsTotal: number,
  months: number
): PayoffSummary {
  // Mutable copy of each debt's progress, capped at its balance up front.
  const progress = new Map(
    debts.map((d) => [d.id, Math.min(d.currentProgress, d.totalBalance)])
  );

  for (let m = 0; m < months; m += 1) {
    const working = debts.map((d) => ({
      ...d,
      currentProgress: progress.get(d.id) ?? 0,
    }));
    const payments = computeMonthlyPayments(
      working,
      monthlyIncome,
      debtTargetPercent,
      fixedMonthlyBillsTotal
    );
    // No budget, or everything's paid off — further months add nothing.
    if (payments.length === 0) break;
    for (const p of payments) {
      const debt = debts.find((d) => d.id === p.debtId);
      if (!debt) continue;
      const next = Math.min(
        debt.totalBalance,
        (progress.get(p.debtId) ?? 0) + p.amount
      );
      progress.set(p.debtId, next);
    }
  }

  const totalOriginal = debts.reduce((s, d) => s + d.totalBalance, 0);
  const totalPaid = debts.reduce((s, d) => s + (progress.get(d.id) ?? 0), 0);
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

// ---------------------------------------------------------------------------
// Payoff plan — tells the user how much to put toward each debt, month by
// month, instead of asking them to log payments themselves.
//
// Required debts (mortgage, car loan — `isRequired: true`) always get their
// full `minimumPayment` reserved first, every month, and never receive extra.
// Whatever's left of the monthly debt budget is waterfalled avalanche-style
// (highest APR first) across the remaining revolving debts: pay everyone's
// minimum, then dump all remaining budget on the highest-APR debt until it's
// paid off, then roll to the next, and so on.
// ---------------------------------------------------------------------------

/** A concrete payment to apply to one debt this month. */
export interface PlannedPayment {
  debtId: string;
  name: string;
  isRequired: boolean;
  amount: number;
}

/**
 * How to split THIS month's debt budget across debts, as actual cash to apply
 * *now* — not a projection. Required debts (mortgage, car loan) get their full
 * minimum off the top; whatever's left of the budget is waterfalled
 * avalanche-style (highest APR first) across revolving debts: everyone's
 * minimum first, then all remaining budget onto the highest-APR debt with room.
 *
 * This is the same allocation rule `buildPayoffPlan` uses for each month, minus
 * the interest simulation (we're provisioning real money, and progress tracking
 * here is interest-agnostic). It is the single source of truth for the
 * "provision this month" action and any programmatic caller — the Gemini coach
 * will call `provisionThisMonth` (services/provisioning.ts), which builds on this.
 */
export function computeMonthlyPayments(
  debts: Debt[],
  monthlyIncome: number,
  debtTargetPercent: number,
  fixedMonthlyBillsTotal: number
): PlannedPayment[] {
  const discretionaryIncome = Math.max(0, monthlyIncome - fixedMonthlyBillsTotal);
  const debtBudget = (discretionaryIncome * debtTargetPercent) / 100;

  const required = debts.filter((d) => d.isRequired);
  const revolving = debts
    .filter((d) => !d.isRequired)
    .slice()
    .sort((a, b) => effectiveApr(b) - effectiveApr(a));

  const pay = new Map<string, number>();
  let budget = debtBudget;

  // Required debts: full minimum off the top (capped by remaining & budget).
  for (const d of required) {
    const amount = Math.min(d.minimumPayment, remainingBalance(d), Math.max(0, budget));
    if (amount > 0) {
      pay.set(d.id, amount);
      budget -= amount;
    }
  }
  // Revolving: everyone's minimum first (capped by whatever budget remains).
  for (const d of revolving) {
    const remaining = remainingBalance(d);
    if (remaining <= 0 || budget <= 0) continue;
    const amount = Math.min(d.minimumPayment, remaining, budget);
    if (amount > 0) {
      pay.set(d.id, amount);
      budget -= amount;
    }
  }
  // ...then waterfall the remainder onto the highest-APR debt with room, in turn.
  for (const d of revolving) {
    if (budget <= 0) break;
    const already = pay.get(d.id) ?? 0;
    const room = remainingBalance(d) - already;
    if (room <= 0) continue;
    const extra = Math.min(budget, room);
    pay.set(d.id, already + extra);
    budget -= extra;
  }

  return debts
    .map((d) => ({
      debtId: d.id,
      name: d.name,
      isRequired: !!d.isRequired,
      amount: pay.get(d.id) ?? 0,
    }))
    .filter((p) => p.amount > 0);
}

export interface DebtPaymentLine {
  debtId: string;
  name: string;
  isRequired: boolean;
  payment: number;
  remainingBalance: number;
}

export interface MonthlyPlanRow {
  /** 1-based month index. */
  month: number;
  date: string; // ISO
  lines: DebtPaymentLine[];
  totalPaid: number;
}

export interface PayoffPlan {
  /** monthlyIncome - fixedMonthlyBillsTotal. */
  discretionaryIncome: number;
  /** discretionaryIncome * debtTargetPercent / 100 — the total monthly debt budget. */
  debtBudget: number;
  /** Sum of required debts' minimum payments, reserved off the top. */
  requiredTotal: number;
  /** debtBudget - requiredTotal, available for revolving debts. */
  revolvingBudget: number;
  /** Sum of revolving debts' minimum payments. */
  revolvingMinTotal: number;
  /** How much the debt budget falls short of covering required debts, if any. */
  shortfall: number;
  /** How much the revolving budget falls short of covering revolving minimums, if any. */
  revolvingShortfall: number;
  /** Month-by-month schedule until every revolving debt reaches zero. */
  schedule: MonthlyPlanRow[];
  /** Months until every revolving debt is paid off (capped at the simulation horizon). */
  monthsToDebtFree: number;
  /** ISO date of the last revolving debt hitting zero, or null if it never does within the horizon. */
  debtFreeDate: string | null;
  /** Total interest paid on revolving debts over the schedule. */
  totalInterestPaid: number;
}

/**
 * Build a month-by-month payoff plan. Required debts (mortgage, car loan)
 * always get their full minimum reserved first; the rest of the monthly debt
 * budget is waterfalled avalanche-style across revolving debts. Recompute on
 * every load — this is a projection from current balances, not a stored plan.
 */
export function buildPayoffPlan(
  debts: Debt[],
  monthlyIncome: number,
  debtTargetPercent: number,
  fixedMonthlyBillsTotal: number,
  from: Date = new Date(),
  maxMonths = 360
): PayoffPlan {
  const discretionaryIncome = Math.max(0, monthlyIncome - fixedMonthlyBillsTotal);
  const debtBudget = (discretionaryIncome * debtTargetPercent) / 100;

  const required = debts.filter((d) => d.isRequired);
  const revolving = debts
    .filter((d) => !d.isRequired)
    .slice()
    .sort((a, b) => effectiveApr(b) - effectiveApr(a));

  const requiredTotal = required.reduce(
    (sum, d) => sum + Math.min(d.minimumPayment, remainingBalance(d)),
    0
  );
  const shortfall = Math.max(0, requiredTotal - debtBudget);
  const revolvingBudget = Math.max(0, debtBudget - requiredTotal);
  const revolvingMinTotal = revolving.reduce(
    (sum, d) => sum + Math.min(d.minimumPayment, remainingBalance(d)),
    0
  );
  const revolvingShortfall = Math.max(0, revolvingMinTotal - revolvingBudget);

  const balances = new Map(debts.map((d) => [d.id, remainingBalance(d)]));
  const revolvingIds = new Set(revolving.map((d) => d.id));
  const anyRevolvingLeft = () =>
    revolving.some((d) => (balances.get(d.id) ?? 0) > 0.005);

  const schedule: MonthlyPlanRow[] = [];
  let totalInterestPaid = 0;
  let month = 0;

  while (anyRevolvingLeft() && month < maxMonths) {
    month += 1;
    const lines: DebtPaymentLine[] = [];

    // Accrue this month's interest on every debt with a balance.
    for (const d of debts) {
      const bal = balances.get(d.id) ?? 0;
      if (bal <= 0) continue;
      const interest = (bal * effectiveApr(d)) / 100 / 12;
      balances.set(d.id, bal + interest);
      if (revolvingIds.has(d.id)) totalInterestPaid += interest;
    }

    // Required debts: full minimum, off the top, no extra ever.
    for (const d of required) {
      const bal = balances.get(d.id) ?? 0;
      const payment = Math.min(d.minimumPayment, bal);
      balances.set(d.id, bal - payment);
      lines.push({
        debtId: d.id,
        name: d.name,
        isRequired: true,
        payment,
        remainingBalance: bal - payment,
      });
    }

    // Revolving: everyone's minimum first (capped by whatever budget remains).
    let pool = revolvingBudget;
    const revPayments = new Map<string, number>();
    for (const d of revolving) {
      const bal = balances.get(d.id) ?? 0;
      const payment = bal <= 0 ? 0 : Math.min(d.minimumPayment, bal, pool);
      revPayments.set(d.id, payment);
      pool -= payment;
    }
    // Waterfall whatever's left onto the highest-APR debt with room, then next.
    for (const d of revolving) {
      if (pool <= 0) break;
      const bal = balances.get(d.id) ?? 0;
      const already = revPayments.get(d.id) ?? 0;
      const room = bal - already;
      if (room <= 0) continue;
      const extra = Math.min(pool, room);
      revPayments.set(d.id, already + extra);
      pool -= extra;
    }
    for (const d of revolving) {
      const bal = balances.get(d.id) ?? 0;
      const payment = revPayments.get(d.id) ?? 0;
      balances.set(d.id, bal - payment);
      lines.push({
        debtId: d.id,
        name: d.name,
        isRequired: false,
        payment,
        remainingBalance: bal - payment,
      });
    }

    schedule.push({
      month,
      date: payoffDateFromMonths(month, from),
      lines,
      totalPaid: lines.reduce((s, l) => s + l.payment, 0),
    });
  }

  const stillOwing = anyRevolvingLeft();
  return {
    discretionaryIncome,
    debtBudget,
    requiredTotal,
    revolvingBudget,
    revolvingMinTotal,
    shortfall,
    revolvingShortfall,
    schedule,
    monthsToDebtFree: stillOwing ? maxMonths : month,
    debtFreeDate: stillOwing ? null : payoffDateFromMonths(month, from),
    totalInterestPaid,
  };
}
