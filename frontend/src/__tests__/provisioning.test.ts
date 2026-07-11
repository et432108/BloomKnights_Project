// Isolate from the real firebase client by mocking the data layer.
jest.mock("@/lib/firestore", () => ({
  updateDebtProgress: jest.fn(),
  upsertUserProfile: jest.fn(),
}));

import { updateDebtProgress, upsertUserProfile } from "@/lib/firestore";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useAuthStore } from "@/store/useAuthStore";
import {
  currentMonthKey,
  provisionThisMonth,
} from "@/services/provisioning";
import type { Debt, UserProfile } from "@/types";

const mock = (fn: unknown) => fn as jest.Mock;

function profile(over: Partial<UserProfile> = {}): UserProfile {
  return {
    uid: "u1",
    email: "u@example.com",
    displayName: "Knight",
    createdAt: "2026-01-01T00:00:00.000Z",
    monthlyIncome: 5000,
    allocations: { debtTargetPercent: 50, savingsTargetPercent: 40, funMoneyPercent: 10 },
    ...over,
  };
}

function debt(over: Partial<Debt> = {}): Debt {
  return {
    id: "d1",
    userId: "u1",
    name: "Visa",
    totalBalance: 4000,
    interestRate: 22,
    minimumPayment: 100,
    currentProgress: 0,
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
    loading: false,
    error: null,
  });
  useAuthStore.setState({ user: undefined, profile: null });
});

describe("provisionThisMonth", () => {
  it("applies this month's split to debts and stamps the month", async () => {
    useAuthStore.setState({ profile: profile() });
    useFinanceStore.setState({ debts: [debt()] });

    const res = await provisionThisMonth();

    expect(res.status).toBe("done");
    // 5000 income, 50% => 2500 budget, capped at the 4000 balance = 2500 paid.
    expect(res.totalApplied).toBe(2500);
    expect(useFinanceStore.getState().debts[0].currentProgress).toBe(2500);
    expect(updateDebtProgress).toHaveBeenCalledWith("d1", 2500);
    // Month stamped on the profile via upsert.
    expect(useAuthStore.getState().profile?.lastProvisionedMonth).toBe(currentMonthKey());
    expect(upsertUserProfile).toHaveBeenCalled();
  });

  it("is a no-op when the month was already provisioned", async () => {
    useAuthStore.setState({
      profile: profile({ lastProvisionedMonth: currentMonthKey() }),
    });
    useFinanceStore.setState({ debts: [debt()] });

    const res = await provisionThisMonth();

    expect(res.status).toBe("already");
    expect(updateDebtProgress).not.toHaveBeenCalled();
    expect(useFinanceStore.getState().debts[0].currentProgress).toBe(0);
  });

  it("returns 'nothing' when there are no debts to pay", async () => {
    useAuthStore.setState({ profile: profile() });

    const res = await provisionThisMonth();

    expect(res.status).toBe("nothing");
    expect(upsertUserProfile).not.toHaveBeenCalled();
  });

  it("returns 'no-profile' when nobody is signed in", async () => {
    const res = await provisionThisMonth();
    expect(res.status).toBe("no-profile");
  });
});
