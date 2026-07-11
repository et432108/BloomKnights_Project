import { create } from "zustand";
import {
  addPayment as addPaymentDoc,
  fetchDebts,
  fetchPayments,
  fetchSavingsGoals,
  fetchTransactions,
  updateDebtProgress,
} from "@/lib/firestore";
import type {
  Debt,
  FinancialSnapshot,
  Payment,
  PaymentInput,
  SavingsGoal,
  Transaction,
} from "@/types";
import { useAuthStore } from "./useAuthStore";

interface FinanceState {
  debts: Debt[];
  savingsGoals: SavingsGoal[];
  transactions: Transaction[];
  payments: Payment[];
  loading: boolean;
  error: string | null;
  /** Pull all buckets (incl. payments) for the signed-in user. */
  loadAll: (userId: string) => Promise<void>;
  /** Payments for a single debt, newest first. */
  paymentsForDebt: (debtId: string) => Payment[];
  /** Record a payment, then optimistically advance the debt's progress. */
  addPayment: (input: PaymentInput) => Promise<void>;
  /** Assemble the snapshot passed to the AI coaching Cloud Function. */
  buildSnapshot: () => FinancialSnapshot | null;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  debts: [],
  savingsGoals: [],
  transactions: [],
  payments: [],
  loading: false,
  error: null,

  loadAll: async (userId) => {
    set({ loading: true, error: null });
    try {
      const [debts, savingsGoals, transactions, payments] = await Promise.all([
        fetchDebts(userId),
        fetchSavingsGoals(userId),
        fetchTransactions(userId),
        fetchPayments(userId),
      ]);
      set({ debts, savingsGoals, transactions, payments, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  paymentsForDebt: (debtId) =>
    get().payments.filter((p) => p.debtId === debtId),

  addPayment: async (input) => {
    const payment = await addPaymentDoc(input);

    // Optimistically advance the debt's paid progress so balances and payoff
    // estimates reflect the new payment immediately (capped at the balance).
    const debt = get().debts.find((d) => d.id === input.debtId);
    let debts = get().debts;
    if (debt) {
      const nextProgress = Math.min(
        debt.totalBalance,
        debt.currentProgress + input.amount
      );
      debts = debts.map((d) =>
        d.id === debt.id ? { ...d, currentProgress: nextProgress } : d
      );
      await updateDebtProgress(debt.id, nextProgress);
    }

    set({ payments: [payment, ...get().payments], debts });
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
}));
