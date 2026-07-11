import { create } from "zustand";
import {
  addDebt as addDebtDoc,
  addFixedExpense as addFixedExpenseDoc,
  deleteFixedExpense as deleteFixedExpenseDoc,
  fetchBalanceSnapshots,
  fetchDebts,
  fetchFixedExpenses,
  fetchSavingsGoals,
  fetchTransactions,
  updateDebtProgress as updateDebtProgressDoc,
  upsertBalanceSnapshot,
} from "@/lib/firestore";
import { currentMonthKey } from "@/lib/format";
import type {
  BalanceSnapshot,
  Debt,
  FinancialSnapshot,
  FixedExpense,
  SavingsGoal,
  Transaction,
} from "@/types";
import { useAuthStore } from "./useAuthStore";

interface FinanceState {
  debts: Debt[];
  savingsGoals: SavingsGoal[];
  transactions: Transaction[];
  fixedExpenses: FixedExpense[];
  balanceSnapshots: BalanceSnapshot[];
  loading: boolean;
  error: string | null;
  /** Pull all buckets (incl. fixed expenses and balance snapshots) for the user. */
  loadAll: (userId: string) => Promise<void>;
  /**
   * Record this month's total-balance figure (idempotent per month) so the
   * dashboard trend has data to compare against. Updates local state too.
   */
  recordBalanceSnapshot: (balance: number) => Promise<void>;
  /** Create a new debt and add it to local state. */
  addDebt: (input: Omit<Debt, "id">) => Promise<void>;
  /**
   * Apply a set of payments to debts — increment each debt's `currentProgress`
   * (capped at its balance) and persist. This is the primitive behind
   * provisioning a month's debt budget; see services/provisioning.ts.
   */
  recordPayments: (payments: { debtId: string; amount: number }[]) => Promise<void>;
  /** Record a recurring fixed expense (rent, insurance, ...) and add it to local state. */
  addFixedExpense: (input: Omit<FixedExpense, "id">) => Promise<void>;
  /** Remove a fixed expense. */
  removeFixedExpense: (expenseId: string) => Promise<void>;
  /** Assemble the snapshot passed to the AI coaching Cloud Function. */
  buildSnapshot: () => FinancialSnapshot | null;
  /** Clear all state on sign-out. */
  reset: () => void;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  debts: [],
  savingsGoals: [],
  transactions: [],
  fixedExpenses: [],
  balanceSnapshots: [],
  loading: false,
  error: null,

  loadAll: async (userId) => {
    set({ loading: true, error: null });

    // Settle independently so one failing query (e.g. a Firestore index still
    // building) doesn't blank out buckets that loaded fine.
    const [
      debtsResult,
      savingsGoalsResult,
      transactionsResult,
      fixedExpensesResult,
      snapshotsResult,
    ] = await Promise.allSettled([
      fetchDebts(userId),
      fetchSavingsGoals(userId),
      fetchTransactions(userId),
      fetchFixedExpenses(userId),
      fetchBalanceSnapshots(userId),
    ]);

    const failures = [
      debtsResult,
      savingsGoalsResult,
      transactionsResult,
      fixedExpensesResult,
      snapshotsResult,
    ]
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => r.reason);
    failures.forEach((reason) =>
      console.error("useFinanceStore.loadAll: a bucket failed to load:", reason)
    );

    set({
      ...(debtsResult.status === "fulfilled" && { debts: debtsResult.value }),
      ...(savingsGoalsResult.status === "fulfilled" && {
        savingsGoals: savingsGoalsResult.value,
      }),
      ...(transactionsResult.status === "fulfilled" && {
        transactions: transactionsResult.value,
      }),
      ...(fixedExpensesResult.status === "fulfilled" && {
        fixedExpenses: fixedExpensesResult.value,
      }),
      ...(snapshotsResult.status === "fulfilled" && {
        balanceSnapshots: snapshotsResult.value,
      }),
      loading: false,
      error: failures.length
        ? (failures[0] as Error).message ?? "Some data failed to load."
        : null,
    });
  },

  recordBalanceSnapshot: async (balance) => {
    const profile = useAuthStore.getState().profile;
    if (!profile) return;
    const monthKey = currentMonthKey();
    const existing = get().balanceSnapshots.find((s) => s.monthKey === monthKey);
    // Nothing changed this month — skip the write.
    if (existing && existing.balance === balance) return;

    await upsertBalanceSnapshot(profile.uid, monthKey, balance);
    const snapshot: BalanceSnapshot = {
      id: `${profile.uid}_${monthKey}`,
      userId: profile.uid,
      monthKey,
      balance,
      createdAt: new Date().toISOString(),
    };
    set({
      balanceSnapshots: [
        ...get().balanceSnapshots.filter((s) => s.monthKey !== monthKey),
        snapshot,
      ],
    });
  },

  addDebt: async (input) => {
    const id = await addDebtDoc(input);
    set({ debts: [...get().debts, { id, ...input }] });
  },

  recordPayments: async (payments) => {
    const debts = get().debts;
    // Fold payments into new progress values, capping each at its balance so an
    // over-budget or repeated payment can never push progress past the total.
    const nextProgress = new Map<string, number>();
    for (const { debtId, amount } of payments) {
      if (!(amount > 0)) continue;
      const debt = debts.find((d) => d.id === debtId);
      if (!debt) continue;
      const base = nextProgress.get(debtId) ?? debt.currentProgress;
      const capped = Math.min(debt.totalBalance, base + amount);
      if (capped !== base) nextProgress.set(debtId, capped);
    }
    if (nextProgress.size === 0) return;

    await Promise.all(
      [...nextProgress].map(([id, progress]) => updateDebtProgressDoc(id, progress))
    );
    set({
      debts: get().debts.map((d) =>
        nextProgress.has(d.id)
          ? { ...d, currentProgress: nextProgress.get(d.id)! }
          : d
      ),
    });
  },

  addFixedExpense: async (input) => {
    const id = await addFixedExpenseDoc(input);
    set({ fixedExpenses: [...get().fixedExpenses, { id, ...input }] });
  },

  removeFixedExpense: async (expenseId) => {
    await deleteFixedExpenseDoc(expenseId);
    set({
      fixedExpenses: get().fixedExpenses.filter((e) => e.id !== expenseId),
    });
  },

  buildSnapshot: () => {
    const profile = useAuthStore.getState().profile;
    if (!profile) return null;
    const { debts, savingsGoals, transactions } = get();
    return {
      monthlyIncome: profile.monthlyIncome,
      allocations: profile.allocations,
      debts,
      savingsGoals,
      // README §5.2 — filter transactions by bucket === 'fun_money'
      funMoneyTransactions: transactions.filter(
        (t) => t.bucket === "fun_money"
      ),
    };
  },

  reset: () =>
    set({
      debts: [],
      savingsGoals: [],
      transactions: [],
      fixedExpenses: [],
      balanceSnapshots: [],
      loading: false,
      error: null,
    }),
}));
