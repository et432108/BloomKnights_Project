import { computeMonthlyPayments } from "@/lib/debt";
import { currentMonthKey } from "@/lib/format";
import { useAuthStore } from "@/store/useAuthStore";
import { useFinanceStore } from "@/store/useFinanceStore";

// Re-exported for existing callers/tests that import it from this module.
export { currentMonthKey };

/**
 * Provisioning — turning the debt budget into actual payments against debts.
 *
 * `provisionThisMonth` is the single entry point: it computes how this month's
 * debt budget splits across the user's debts (`computeMonthlyPayments`), applies
 * each payment to the debt's progress (`recordPayments`), and stamps the month
 * on the profile so it can't be applied twice. Both the "Provision this month's
 * payments" button and the future Gemini coach call this one function, so the
 * human-triggered and AI-triggered paths behave identically.
 */

export type ProvisionStatus =
  | "done" // payments applied this call
  | "already" // this month was already provisioned
  | "nothing" // no debts / budget produced no payments
  | "no-profile"; // no signed-in profile loaded

export interface ProvisionResult {
  status: ProvisionStatus;
  monthKey: string;
  /** Total cash applied across debts (0 unless status === "done"). */
  totalApplied: number;
  /** Per-debt breakdown that was applied (empty unless status === "done"). */
  payments: { debtId: string; name: string; amount: number }[];
}

/**
 * Apply this month's debt budget to the user's debts, once per calendar month.
 * Safe to call repeatedly — a second call in the same month is a no-op
 * (`status: "already"`).
 */
export async function provisionThisMonth(): Promise<ProvisionResult> {
  const monthKey = currentMonthKey();
  const auth = useAuthStore.getState();
  const profile = auth.profile;
  if (!profile) {
    return { status: "no-profile", monthKey, totalApplied: 0, payments: [] };
  }
  if (profile.lastProvisionedMonth === monthKey) {
    return { status: "already", monthKey, totalApplied: 0, payments: [] };
  }

  const finance = useFinanceStore.getState();
  const fixedTotal = finance.fixedExpenses.reduce((sum, e) => sum + e.amount, 0);
  const planned = computeMonthlyPayments(
    finance.debts,
    profile.monthlyIncome,
    profile.allocations.debtTargetPercent,
    fixedTotal
  );
  if (planned.length === 0) {
    return { status: "nothing", monthKey, totalApplied: 0, payments: [] };
  }

  await finance.recordPayments(
    planned.map((p) => ({ debtId: p.debtId, amount: p.amount }))
  );
  await auth.updateProfile({ lastProvisionedMonth: monthKey });

  return {
    status: "done",
    monthKey,
    totalApplied: planned.reduce((sum, p) => sum + p.amount, 0),
    payments: planned.map((p) => ({
      debtId: p.debtId,
      name: p.name,
      amount: p.amount,
    })),
  };
}
