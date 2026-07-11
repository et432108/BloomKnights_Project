// Mock the Firestore data layer so the store is tested in isolation (and so the
// real firebase client — which needs env config — never loads).
jest.mock("@/lib/firestore", () => ({
  addDebt: jest.fn(),
  addFixedExpense: jest.fn(),
  deleteFixedExpense: jest.fn(),
  fetchDebts: jest.fn(),
  fetchSavingsGoals: jest.fn(),
  fetchTransactions: jest.fn(),
  fetchFixedExpenses: jest.fn(),
  fetchBalanceSnapshots: jest.fn(),
  updateDebtProgress: jest.fn(),
  upsertBalanceSnapshot: jest.fn(),
}));

import {
  addDebt,
  addFixedExpense,
  deleteFixedExpense,
  fetchDebts,
  fetchFixedExpenses,
  fetchSavingsGoals,
  fetchTransactions,
  fetchBalanceSnapshots,
  updateDebtProgress,
  upsertBalanceSnapshot,
} from "@/lib/firestore";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useAuthStore } from "@/store/useAuthStore";
import type { Debt, FixedExpense, Transaction, UserProfile } from "@/types";

const mock = (fn: unknown) => fn as jest.Mock;

function debt(over: Partial<Debt> = {}): Debt {
  return {
    id: "d1",
    userId: "u1",
    name: "Visa",
    totalBalance: 1000,
    interestRate: 22,
    minimumPayment: 100,
    currentProgress: 100,
    ...over,
  };
}

function fixedExpense(over: Partial<FixedExpense> = {}): FixedExpense {
  return {
    id: "e1",
    userId: "u1",
    name: "Rent",
    amount: 1200,
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useFinanceStore.setState({
    debts: [],
    savingsGoals: [],
    transactions: [],
    fixedExpenses: [],
    balanceSnapshots: [],
    loading: false,
    error: null,
  });
  useAuthStore.setState({ user: undefined, profile: null });
});

describe("loadAll", () => {
  it("pulls all buckets (including fixed expenses) into state", async () => {
    mock(fetchDebts).mockResolvedValue([debt()]);
    mock(fetchSavingsGoals).mockResolvedValue([]);
    mock(fetchTransactions).mockResolvedValue([]);
    mock(fetchFixedExpenses).mockResolvedValue([fixedExpense()]);
    mock(fetchBalanceSnapshots).mockResolvedValue([]);

    await useFinanceStore.getState().loadAll("u1");

    const s = useFinanceStore.getState();
    expect(s.debts).toHaveLength(1);
    expect(s.fixedExpenses).toHaveLength(1);
    expect(s.loading).toBe(false);
    expect(fetchFixedExpenses).toHaveBeenCalledWith("u1");
    expect(fetchBalanceSnapshots).toHaveBeenCalledWith("u1");
  });

  it("records an error and stops loading on failure", async () => {
    mock(fetchDebts).mockRejectedValue(new Error("offline"));
    mock(fetchSavingsGoals).mockResolvedValue([]);
    mock(fetchTransactions).mockResolvedValue([]);
    mock(fetchFixedExpenses).mockResolvedValue([]);
    mock(fetchBalanceSnapshots).mockResolvedValue([]);

    await useFinanceStore.getState().loadAll("u1");

    expect(useFinanceStore.getState().error).toBe("offline");
    expect(useFinanceStore.getState().loading).toBe(false);
  });
});

describe("addDebt", () => {
  it("appends the created debt with its new id", async () => {
    mock(addDebt).mockResolvedValue("new-id");

    await useFinanceStore.getState().addDebt({
      userId: "u1",
      name: "Amex",
      totalBalance: 500,
      interestRate: 18,
      minimumPayment: 25,
      currentProgress: 0,
    });

    const debts = useFinanceStore.getState().debts;
    expect(debts).toHaveLength(1);
    expect(debts[0]).toMatchObject({ id: "new-id", name: "Amex" });
  });
});

describe("recordPayments", () => {
  it("increments currentProgress per debt and persists, capping at the balance", async () => {
    useFinanceStore.setState({
      debts: [
        debt({ id: "a", totalBalance: 1000, currentProgress: 100 }),
        debt({ id: "b", totalBalance: 500, currentProgress: 450 }),
      ],
    });

    await useFinanceStore.getState().recordPayments([
      { debtId: "a", amount: 200 },
      { debtId: "b", amount: 999 }, // over-pays — must cap at the 500 balance
    ]);

    const byId = Object.fromEntries(
      useFinanceStore.getState().debts.map((d) => [d.id, d.currentProgress])
    );
    expect(byId.a).toBe(300);
    expect(byId.b).toBe(500);
    expect(updateDebtProgress).toHaveBeenCalledWith("a", 300);
    expect(updateDebtProgress).toHaveBeenCalledWith("b", 500);
  });

  it("ignores zero/unknown debts and writes nothing when there's no change", async () => {
    useFinanceStore.setState({ debts: [debt({ id: "a", currentProgress: 100 })] });

    await useFinanceStore.getState().recordPayments([
      { debtId: "a", amount: 0 },
      { debtId: "ghost", amount: 50 },
    ]);

    expect(updateDebtProgress).not.toHaveBeenCalled();
    expect(useFinanceStore.getState().debts[0].currentProgress).toBe(100);
  });
});

describe("recordBalanceSnapshot", () => {
  const profile: UserProfile = {
    uid: "u1",
    email: "u@example.com",
    displayName: "Knight",
    createdAt: "2026-01-01T00:00:00.000Z",
    monthlyIncome: 5000,
    allocations: { debtTargetPercent: 50, savingsTargetPercent: 40, funMoneyPercent: 10 },
  };

  it("persists this month's balance and stores it locally", async () => {
    useAuthStore.setState({ profile });

    await useFinanceStore.getState().recordBalanceSnapshot(5000);

    expect(upsertBalanceSnapshot).toHaveBeenCalledWith("u1", expect.any(String), 5000);
    expect(useFinanceStore.getState().balanceSnapshots).toHaveLength(1);
    expect(useFinanceStore.getState().balanceSnapshots[0].balance).toBe(5000);
  });

  it("skips the write when this month's balance is unchanged", async () => {
    useAuthStore.setState({ profile });
    await useFinanceStore.getState().recordBalanceSnapshot(5000);
    mock(upsertBalanceSnapshot).mockClear();

    await useFinanceStore.getState().recordBalanceSnapshot(5000);

    expect(upsertBalanceSnapshot).not.toHaveBeenCalled();
  });

  it("does nothing without a signed-in profile", async () => {
    await useFinanceStore.getState().recordBalanceSnapshot(5000);
    expect(upsertBalanceSnapshot).not.toHaveBeenCalled();
  });
});

describe("addFixedExpense", () => {
  it("appends the created expense with its new id", async () => {
    mock(addFixedExpense).mockResolvedValue("new-id");

    await useFinanceStore.getState().addFixedExpense({
      userId: "u1",
      name: "Car insurance",
      amount: 150,
    });

    const fixedExpenses = useFinanceStore.getState().fixedExpenses;
    expect(fixedExpenses).toHaveLength(1);
    expect(fixedExpenses[0]).toMatchObject({ id: "new-id", name: "Car insurance" });
  });
});

describe("removeFixedExpense", () => {
  it("removes the expense from state", async () => {
    useFinanceStore.setState({
      fixedExpenses: [fixedExpense({ id: "a" }), fixedExpense({ id: "b" })],
    });

    await useFinanceStore.getState().removeFixedExpense("a");

    expect(deleteFixedExpense).toHaveBeenCalledWith("a");
    expect(useFinanceStore.getState().fixedExpenses.map((e) => e.id)).toEqual(["b"]);
  });
});

describe("buildSnapshot", () => {
  const profile: UserProfile = {
    uid: "u1",
    email: "u@example.com",
    displayName: "Knight",
    createdAt: "2026-01-01T00:00:00.000Z",
    monthlyIncome: 5000,
    allocations: {
      debtTargetPercent: 50,
      savingsTargetPercent: 40,
      funMoneyPercent: 10,
    },
  };

  it("returns null when there is no profile", () => {
    expect(useFinanceStore.getState().buildSnapshot()).toBeNull();
  });

  it("assembles the snapshot and filters fun-money transactions", () => {
    useAuthStore.setState({ profile });
    const txns: Transaction[] = [
      {
        id: "t1",
        userId: "u1",
        amount: 40,
        type: "expense",
        bucket: "fun_money",
        date: "2026-07-01T00:00:00.000Z",
        description: "movie",
      },
      {
        id: "t2",
        userId: "u1",
        amount: 900,
        type: "expense",
        bucket: "fixed_bills",
        date: "2026-07-01T00:00:00.000Z",
        description: "rent",
      },
    ];
    useFinanceStore.setState({ debts: [debt()], transactions: txns });

    const snap = useFinanceStore.getState().buildSnapshot();
    expect(snap).not.toBeNull();
    expect(snap!.monthlyIncome).toBe(5000);
    expect(snap!.funMoneyTransactions.map((t) => t.id)).toEqual(["t1"]);
    // Fixed expenses are intentionally NOT in the snapshot (coaching contract frozen).
    expect(snap as object).not.toHaveProperty("fixedExpenses");
  });
});
