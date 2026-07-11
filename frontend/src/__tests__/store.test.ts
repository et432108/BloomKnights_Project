// Mock the Firestore data layer so the store is tested in isolation (and so the
// real firebase client — which needs env config — never loads).
jest.mock("@/lib/firestore", () => ({
  addDebt: jest.fn(),
  addPayment: jest.fn(),
  fetchDebts: jest.fn(),
  fetchSavingsGoals: jest.fn(),
  fetchTransactions: jest.fn(),
  fetchPayments: jest.fn(),
  updateDebtProgress: jest.fn(),
}));

import {
  addDebt,
  addPayment,
  fetchDebts,
  fetchPayments,
  fetchSavingsGoals,
  fetchTransactions,
  updateDebtProgress,
} from "@/lib/firestore";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useAuthStore } from "@/store/useAuthStore";
import type { Debt, Payment, Transaction, UserProfile } from "@/types";

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

function payment(over: Partial<Payment> = {}): Payment {
  return {
    id: "p1",
    userId: "u1",
    debtId: "d1",
    amount: 200,
    paymentDate: "2026-07-01T00:00:00.000Z",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useFinanceStore.setState({
    debts: [],
    savingsGoals: [],
    transactions: [],
    payments: [],
    loading: false,
    error: null,
  });
  useAuthStore.setState({ user: undefined, profile: null });
});

describe("loadAll", () => {
  it("pulls all buckets (including payments) into state", async () => {
    mock(fetchDebts).mockResolvedValue([debt()]);
    mock(fetchSavingsGoals).mockResolvedValue([]);
    mock(fetchTransactions).mockResolvedValue([]);
    mock(fetchPayments).mockResolvedValue([payment()]);

    await useFinanceStore.getState().loadAll("u1");

    const s = useFinanceStore.getState();
    expect(s.debts).toHaveLength(1);
    expect(s.payments).toHaveLength(1);
    expect(s.loading).toBe(false);
    expect(fetchPayments).toHaveBeenCalledWith("u1");
  });

  it("records an error and stops loading on failure", async () => {
    mock(fetchDebts).mockRejectedValue(new Error("offline"));
    mock(fetchSavingsGoals).mockResolvedValue([]);
    mock(fetchTransactions).mockResolvedValue([]);
    mock(fetchPayments).mockResolvedValue([]);

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

describe("addPayment", () => {
  it("prepends the payment and advances the debt's progress", async () => {
    useFinanceStore.setState({ debts: [debt({ currentProgress: 100 })] });
    mock(addPayment).mockResolvedValue(payment({ id: "pX", amount: 200 }));

    await useFinanceStore.getState().addPayment({
      userId: "u1",
      debtId: "d1",
      amount: 200,
      paymentDate: "2026-07-05T00:00:00.000Z",
    });

    const s = useFinanceStore.getState();
    expect(s.payments[0].id).toBe("pX");
    expect(s.debts[0].currentProgress).toBe(300);
    expect(updateDebtProgress).toHaveBeenCalledWith("d1", 300);
  });

  it("caps progress at the total balance", async () => {
    useFinanceStore.setState({
      debts: [debt({ totalBalance: 1000, currentProgress: 900 })],
    });
    mock(addPayment).mockResolvedValue(payment({ amount: 250 }));

    await useFinanceStore.getState().addPayment({
      userId: "u1",
      debtId: "d1",
      amount: 250,
      paymentDate: "2026-07-05T00:00:00.000Z",
    });

    expect(useFinanceStore.getState().debts[0].currentProgress).toBe(1000);
    expect(updateDebtProgress).toHaveBeenCalledWith("d1", 1000);
  });
});

describe("paymentsForDebt", () => {
  it("returns only the given debt's payments", () => {
    useFinanceStore.setState({
      payments: [
        payment({ id: "a", debtId: "d1" }),
        payment({ id: "b", debtId: "d2" }),
        payment({ id: "c", debtId: "d1" }),
      ],
    });
    const result = useFinanceStore.getState().paymentsForDebt("d1");
    expect(result.map((p) => p.id)).toEqual(["a", "c"]);
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
    // Payments are intentionally NOT in the snapshot (coaching contract frozen).
    expect(snap as object).not.toHaveProperty("payments");
  });
});
