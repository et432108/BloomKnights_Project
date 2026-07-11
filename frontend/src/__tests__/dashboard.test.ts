import {
  computeBalanceTrend,
  computeDashboardAllocation,
  emergencyFundMonthly,
  isEmergencyFund,
  monthsUntil,
} from "@/lib/dashboard";
import type { Allocations, BalanceSnapshot, SavingsGoal } from "@/types";

const NOW = new Date("2026-07-11T00:00:00.000Z");

function goal(over: Partial<SavingsGoal> = {}): SavingsGoal {
  return {
    id: "g1",
    userId: "u1",
    title: "Emergency Fund",
    targetAmount: 6000,
    currentAmount: 0,
    targetDate: "2027-01-11T00:00:00.000Z", // 6 months out from NOW
    ...over,
  };
}

const split: Allocations = {
  debtTargetPercent: 50,
  savingsTargetPercent: 40,
  funMoneyPercent: 10,
};

describe("monthsUntil", () => {
  it("counts whole months, floored at 1", () => {
    expect(monthsUntil("2027-01-11T00:00:00.000Z", NOW)).toBe(6);
    expect(monthsUntil("2026-07-01T00:00:00.000Z", NOW)).toBe(1); // past → 1
  });
});

describe("isEmergencyFund", () => {
  it("matches on the title, case-insensitively", () => {
    expect(isEmergencyFund(goal({ title: "My emergency fund" }))).toBe(true);
    expect(isEmergencyFund(goal({ title: "Vacation" }))).toBe(false);
  });
});

describe("emergencyFundMonthly", () => {
  it("spreads the remaining need over the months to target, capped by savings", () => {
    // 6000 remaining / 6 months = 1000/mo, and savings budget (2000) covers it.
    expect(emergencyFundMonthly([goal()], 2000, NOW)).toBe(1000);
  });
  it("never exceeds the savings dollars available", () => {
    expect(emergencyFundMonthly([goal()], 400, NOW)).toBe(400);
  });
  it("is zero with no EF goal or an already-funded one", () => {
    expect(emergencyFundMonthly([goal({ title: "Car" })], 2000, NOW)).toBe(0);
    expect(emergencyFundMonthly([goal({ currentAmount: 6000 })], 2000, NOW)).toBe(0);
  });
});

describe("computeDashboardAllocation", () => {
  it("splits income into 5 slices that sum to income, carving EF from savings", () => {
    // income 5000, bills 1000 => discretionary 4000.
    // debt 50% = 2000, fun 10% = 400, savings 40% = 1600.
    // EF: 6000/6 = 1000, capped at savings 1600 => 1000; savings rest = 600.
    const d = computeDashboardAllocation(5000, 1000, split, [goal()], NOW);
    const by = Object.fromEntries(d.slices.map((s) => [s.key, s.amount]));

    expect(by.expenses).toBe(1000);
    expect(by.debt).toBe(2000);
    expect(by.fun).toBe(400);
    expect(by.emergency).toBe(1000);
    expect(by.savings).toBe(600);
    expect(d.total).toBeCloseTo(5000, 6);
    // Percents are of income.
    expect(d.slices.find((s) => s.key === "debt")!.percent).toBeCloseTo(40, 6);
  });

  it("puts all savings into the Savings slice when there's no EF goal", () => {
    const d = computeDashboardAllocation(5000, 1000, split, [], NOW);
    const by = Object.fromEntries(d.slices.map((s) => [s.key, s.amount]));
    expect(by.emergency).toBe(0);
    expect(by.savings).toBe(1600);
  });

  it("caps bills at income and zeroes the rest when bills exceed income", () => {
    const d = computeDashboardAllocation(1000, 5000, split, [goal()], NOW);
    const by = Object.fromEntries(d.slices.map((s) => [s.key, s.amount]));
    expect(by.expenses).toBe(1000);
    expect(by.debt).toBe(0);
    expect(d.total).toBeCloseTo(1000, 6);
  });

  it("is all zeroes at zero income (no divide-by-zero)", () => {
    const d = computeDashboardAllocation(0, 0, split, [goal()], NOW);
    expect(d.total).toBe(0);
    expect(d.slices.every((s) => s.amount === 0 && s.percent === 0)).toBe(true);
  });
});

describe("computeBalanceTrend", () => {
  const snap = (monthKey: string, balance: number): BalanceSnapshot => ({
    id: `u1_${monthKey}`,
    userId: "u1",
    monthKey,
    balance,
    createdAt: "2026-01-01T00:00:00.000Z",
  });

  it("computes month-over-month percent change vs the most recent prior month", () => {
    const t = computeBalanceTrend(
      [snap("2026-05", 4000), snap("2026-06", 5000)],
      "2026-07",
      5400
    );
    expect(t.previous).toBe(5000); // June, not May
    expect(t.deltaPct).toBeCloseTo(8, 6);
  });

  it("returns null delta when there's no prior month", () => {
    const t = computeBalanceTrend([snap("2026-07", 5000)], "2026-07", 5000);
    expect(t.previous).toBeNull();
    expect(t.deltaPct).toBeNull();
  });
});
