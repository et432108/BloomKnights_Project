import {
  computeBalanceTrend,
  computeDashboardAllocation,
  emergencyFundMonthly,
  isEmergencyFund,
  monthsUntil,
} from "@/lib/dashboard";
import type { Allocations, BalanceSnapshot, Debt, SavingsGoal } from "@/types";

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

function debt(over: Partial<Debt> = {}): Debt {
  return {
    id: "d1",
    userId: "u1",
    name: "Visa",
    totalBalance: 10000,
    interestRate: 20,
    minimumPayment: 100,
    currentProgress: 0,
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
  it("uses the debt budget when it exceeds the required minimums", () => {
    // income 5000, bills 1000 => discretionary 4000. debt budget = 50% = 2000.
    // Debt has a $100 minimum but a $10k balance, so the $2000 budget applies.
    // fun 10% = 400; savings 40% = 1600; EF 6000/6 = 1000; savings rest = 600.
    const d = computeDashboardAllocation(5000, 1000, split, [goal()], [debt()], NOW);
    const by = Object.fromEntries(d.slices.map((s) => [s.key, s.amount]));

    expect(by.expenses).toBe(1000);
    expect(by.debt).toBe(2000);
    expect(by.fun).toBe(400);
    expect(by.emergency).toBe(1000);
    expect(by.savings).toBe(600);
    expect(d.total).toBeCloseTo(5000, 6);
    expect(d.slices.find((s) => s.key === "debt")!.percent).toBeCloseTo(40, 6);
  });

  it("shows the actual debt repayment even when income is $0 (the fix)", () => {
    // No income/budget, but a debt with a $300 minimum still must be repaid, so
    // the Debt slice surfaces $300 instead of vanishing.
    const debts = [debt({ minimumPayment: 300, totalBalance: 5000 })];
    const d = computeDashboardAllocation(0, 0, split, [], debts, NOW);
    const by = Object.fromEntries(d.slices.map((s) => [s.key, s.amount]));

    expect(by.debt).toBe(300);
    expect(d.debtRepayment).toBe(300);
    expect(d.requiredMinimums).toBe(300);
    expect(d.total).toBe(300);
    expect(d.slices.find((s) => s.key === "debt")!.percent).toBe(100);
  });

  it("never repays more than what's still owed", () => {
    // Huge budget (2500) but only $300 left on the debt → repayment capped at 300.
    const debts = [debt({ minimumPayment: 100, totalBalance: 300, currentProgress: 0 })];
    const d = computeDashboardAllocation(5000, 0, split, [], debts, NOW);
    expect(d.debtRepayment).toBe(300);
  });

  it("has no debt slice when there are no debts", () => {
    const d = computeDashboardAllocation(5000, 1000, split, [], [], NOW);
    expect(d.debtRepayment).toBe(0);
    expect(d.slices.find((s) => s.key === "debt")!.amount).toBe(0);
  });

  it("puts all savings into the Savings slice when there's no EF goal", () => {
    const d = computeDashboardAllocation(5000, 1000, split, [], [debt()], NOW);
    const by = Object.fromEntries(d.slices.map((s) => [s.key, s.amount]));
    expect(by.emergency).toBe(0);
    expect(by.savings).toBe(1600);
  });

  it("caps bills at income and zeroes discretionary slices when bills exceed income", () => {
    const d = computeDashboardAllocation(1000, 5000, split, [goal()], [], NOW);
    const by = Object.fromEntries(d.slices.map((s) => [s.key, s.amount]));
    expect(by.expenses).toBe(1000);
    expect(by.debt).toBe(0); // no debts here
    expect(d.total).toBeCloseTo(1000, 6);
  });

  it("is all zeroes at zero income with no debts (no divide-by-zero)", () => {
    const d = computeDashboardAllocation(0, 0, split, [goal()], [], NOW);
    expect(d.total).toBe(0);
    expect(d.slices.every((s) => s.amount === 0 && s.percent === 0)).toBe(true);
  });

  it("pulls required debt minimums out of discretionary as a required obligation", () => {
    // income 5000, bills 1000, a required car loan (min 500) + a revolving Visa.
    // required obligations = 1000 + 500 = 1500 → discretionary = 3500.
    const debts = [
      debt({ id: "car", name: "Car loan", minimumPayment: 500, totalBalance: 100000, isRequired: true }),
      debt({ id: "visa", name: "Visa", minimumPayment: 100, totalBalance: 10000 }),
    ];
    const d = computeDashboardAllocation(5000, 1000, split, [], debts, NOW);
    const by = Object.fromEntries(d.slices.map((s) => [s.key, s.amount]));

    expect(d.requiredDebtPayments).toBe(500);
    expect(d.requiredObligations).toBe(1500);
    expect(d.discretionary).toBe(3500);

    // Required group: fixed expenses + the required car-loan minimum.
    expect(by.expenses).toBe(1000);
    expect(by.requiredDebt).toBe(500);
    // Discretionary debt paydown = 50% of 3500 → funds the revolving Visa only.
    expect(by.debt).toBe(1750);
    expect(by.fun).toBe(350); // 10% of 3500
    expect(by.savings).toBe(1400); // 40% of 3500, no EF goal
    // debtRepayment surfaces the whole debt outflow (required + discretionary).
    expect(d.debtRepayment).toBe(2250);
    expect(d.total).toBeCloseTo(5000, 6);

    // Group tags line up with the required-vs-discretionary UI split.
    const group = Object.fromEntries(d.slices.map((s) => [s.key, s.group]));
    expect(group.expenses).toBe("required");
    expect(group.requiredDebt).toBe("required");
    expect(group.debt).toBe("discretionary");
    expect(group.fun).toBe("discretionary");
    expect(group.savings).toBe("discretionary");
  });

  it("computes savings from income minus required obligations, not as a peer of required debt", () => {
    // Without the fix, discretionary would include the required debt and savings
    // would be inflated. income 5000, bills 1000, required debt min 1000.
    // discretionary = 5000 − 1000 − 1000 = 3000 → savings 40% = 1200.
    const debts = [debt({ minimumPayment: 1000, totalBalance: 100000, isRequired: true })];
    const d = computeDashboardAllocation(5000, 1000, split, [], debts, NOW);
    const by = Object.fromEntries(d.slices.map((s) => [s.key, s.amount]));
    expect(d.discretionary).toBe(3000);
    expect(by.savings).toBe(1200);
    expect(by.fun).toBe(300); // 10% of 3000
  });

  it("lets the total exceed income when required obligations outstrip it", () => {
    // income 1000, no bills, a required debt whose minimum (1500) alone tops income.
    const debts = [debt({ minimumPayment: 1500, totalBalance: 100000, isRequired: true })];
    const d = computeDashboardAllocation(1000, 0, split, [], debts, NOW);
    expect(d.requiredDebtPayments).toBe(1500);
    expect(d.discretionary).toBe(0); // nothing left to allocate
    expect(d.total).toBe(1500);
    expect(d.total).toBeGreaterThan(d.income); // flags over-budget in the UI
  });

  it("keeps revolving debt in the discretionary group (unchanged behavior)", () => {
    // A plain credit card (not isRequired) stays funded from discretionary.
    const d = computeDashboardAllocation(5000, 1000, split, [], [debt()], NOW);
    expect(d.requiredDebtPayments).toBe(0);
    expect(d.requiredObligations).toBe(1000);
    expect(d.discretionary).toBe(4000);
    expect(d.slices.find((s) => s.key === "debt")!.group).toBe("discretionary");
    expect(d.slices.find((s) => s.key === "debt")!.amount).toBe(2000);
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
