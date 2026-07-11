import { create } from "zustand";
import {
  fetchDebts,
  fetchSavingsGoals,
  fetchTransactions,
} from "@/lib/firestore";
import type {
  Debt,
  FinancialSnapshot,
  SavingsGoal,
  Transaction,
} from "@/types";
import { useAuthStore } from "./useAuthStore";

interface FinanceState {
  debts: Debt[];
  savingsGoals: SavingsGoal[];
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  /** Pull all three buckets for the signed-in user. */
  loadAll: (userId: string) => Promise<void>;
  /** Assemble the snapshot passed to the AI coaching Cloud Function. */
  buildSnapshot: () => FinancialSnapshot | null;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  debts: [],
  savingsGoals: [],
  transactions: [],
  loading: false,
  error: null,

  loadAll: async (userId) => {
    set({ loading: true, error: null });
    try {
      const [debts, savingsGoals, transactions] = await Promise.all([
        fetchDebts(userId),
        fetchSavingsGoals(userId),
        fetchTransactions(userId),
      ]);
      set({ debts, savingsGoals, transactions, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
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
