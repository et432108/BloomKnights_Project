import {
  HIGH_INTEREST_THRESHOLD,
  buildPayoffPlan,
  computeMonthlyPayments,
  effectiveApr,
  isHighInterest,
  knightRank,
  payoffDateFromMonths,
  payoffForDebt,
  payoffSummary,
  projectPayoff,
  remainingBalance,
} from "@/lib/debt";
import type { Debt } from "@/types";

function debt(over: Partial<Debt> = {}): Debt {
  return {
    id: "d1",
    userId: "u1",
    name: "Visa",
    totalBalance: 4000,
    interestRate: 22,
    minimumPayment: 200,
    currentProgress: 0,
    ...over,
  };
}

describe("effectiveApr", () => {
  it("prefers aprPercent, falls back to interestRate", () => {
    expect(effectiveApr(debt({ aprPercent: 24, interestRate: 22 }))).toBe(24);
    expect(effectiveApr(debt({ interestRate: 22 }))).toBe(22);
  });
});

describe("remainingBalance", () => {
  it("subtracts progress and never goes negative", () => {
    expect(remainingBalance(debt({ totalBalance: 1000, currentProgress: 300 }))).toBe(700);
    expect(remainingBalance(debt({ totalBalance: 1000, currentProgress: 1500 }))).toBe(0);
  });
});

describe("isHighInterest", () => {
  it("flags at or above the 20% threshold", () => {
    expect(isHighInterest(HIGH_INTEREST_THRESHOLD)).toBe(true);
    expect(isHighInterest(19.99)).toBe(false);
    expect(isHighInterest(12, 10)).toBe(true);
  });
});

describe("projectPayoff", () => {
  it("clears a zero balance immediately", () => {
    expect(projectPayoff(0, 22, 100)).toEqual({
      months: 0,
      totalInterest: 0,
      paidOff: true,
    });
  });

  it("pays off an interest-free balance in even installments", () => {
    const r = projectPayoff(1000, 0, 250);
    expect(r).toEqual({ months: 4, totalInterest: 0, paidOff: true });
  });

  it("accrues interest but still pays off a high-APR balance", () => {
    const r = projectPayoff(1000, 24, 200);
    expect(r.paidOff).toBe(true);
    expect(r.months).toBeGreaterThan(4);
    expect(r.totalInterest).toBeGreaterThan(0);
  });

  it("reports never-paid-off when payment < monthly interest", () => {
    const r = projectPayoff(10000, 24, 150, 600);
    expect(r.paidOff).toBe(false);
    expect(r.months).toBe(600);
  });

  it("treats a zero payment as never paying off", () => {
    expect(projectPayoff(500, 10, 0).paidOff).toBe(false);
  });
});

describe("payoffForDebt", () => {
  it("uses remaining balance, effective APR, and minimum payment", () => {
    const r = payoffForDebt(debt({ totalBalance: 1000, currentProgress: 1000 }));
    expect(r.paidOff).toBe(true);
    expect(r.months).toBe(0);
  });
});

describe("payoffDateFromMonths", () => {
  it("advances the month by the given count", () => {
    const iso = payoffDateFromMonths(3, new Date("2026-01-15T00:00:00Z"));
    expect(iso.slice(0, 7)).toBe("2026-04");
  });
});

describe("payoffSummary", () => {
  it("aggregates paid vs original across debts", () => {
    const s = payoffSummary([
      debt({ id: "a", totalBalance: 1000, currentProgress: 250 }),
      debt({ id: "b", totalBalance: 3000, currentProgress: 750 }),
    ]);
    expect(s.totalOriginal).toBe(4000);
    expect(s.totalPaid).toBe(1000);
    expect(s.remaining).toBe(3000);
    expect(s.ratio).toBeCloseTo(0.25, 5);
  });

  it("caps progress per debt and handles no debts", () => {
    expect(payoffSummary([]).ratio).toBe(0);
    const s = payoffSummary([debt({ totalBalance: 500, currentProgress: 900 })]);
    expect(s.totalPaid).toBe(500); // capped at balance
    expect(s.ratio).toBe(1);
  });
});

describe("knightRank", () => {
  it("maps progress ratio to a rank", () => {
    expect(knightRank(0)).toBe("Squire");
    expect(knightRank(0.25)).toBe("Knight");
    expect(knightRank(0.5)).toBe("Champion");
    expect(knightRank(0.75)).toBe("Paladin");
    expect(knightRank(1)).toBe("Debt-Free Legend");
  });
});

describe("buildPayoffPlan", () => {
  const from = new Date("2026-01-01T00:00:00Z");

  it("reserves required debts' minimums before avalanche-ing the rest", () => {
    const debts: Debt[] = [
      debt({
        id: "mortgage",
        name: "Mortgage",
        totalBalance: 200000,
        interestRate: 4,
        minimumPayment: 1000,
        isRequired: true,
      }),
      debt({
        id: "visa",
        name: "Visa",
        totalBalance: 1000,
        interestRate: 24,
        minimumPayment: 50,
      }),
      debt({
        id: "amex",
        name: "Amex",
        totalBalance: 500,
        interestRate: 12,
        minimumPayment: 25,
      }),
    ];
    // income 3000, no fixed bills, 50% debt target -> debtBudget 1500
    // required reserves 1000 -> revolvingBudget 500
    const plan = buildPayoffPlan(debts, 3000, 50, 0, from);

    expect(plan.discretionaryIncome).toBe(3000);
    expect(plan.debtBudget).toBe(1500);
    expect(plan.requiredTotal).toBe(1000);
    expect(plan.revolvingBudget).toBe(500);
    expect(plan.shortfall).toBe(0);
    expect(plan.revolvingShortfall).toBe(0);

    const month1 = plan.schedule[0];
    const mortgageLine = month1.lines.find((l) => l.debtId === "mortgage")!;
    const visaLine = month1.lines.find((l) => l.debtId === "visa")!;
    const amexLine = month1.lines.find((l) => l.debtId === "amex")!;

    // Required debt gets exactly its minimum, never extra.
    expect(mortgageLine.payment).toBe(1000);
    // Highest-APR revolving debt (Visa, 24%) gets the waterfall extra.
    expect(visaLine.payment).toBeGreaterThan(amexLine.payment);
    // All of the revolving budget is spent (mins + extra), none left idle.
    expect(visaLine.payment + amexLine.payment).toBeCloseTo(500, 5);

    // Eventually every revolving debt reaches zero.
    expect(plan.debtFreeDate).not.toBeNull();
    expect(plan.monthsToDebtFree).toBeGreaterThan(0);
    const lastRow = plan.schedule[plan.schedule.length - 1];
    for (const l of lastRow.lines) {
      if (!l.isRequired) expect(l.remainingBalance).toBeLessThanOrEqual(0.01);
    }
  });

  it("surfaces a shortfall when the budget can't cover required debts", () => {
    const debts: Debt[] = [
      debt({
        id: "mortgage",
        totalBalance: 200000,
        interestRate: 4,
        minimumPayment: 2000,
        isRequired: true,
      }),
    ];
    // income 3000, 20% debt target -> debtBudget 600, required needs 2000
    const plan = buildPayoffPlan(debts, 3000, 20, 0, from);

    expect(plan.debtBudget).toBe(600);
    expect(plan.requiredTotal).toBe(2000);
    expect(plan.shortfall).toBe(1400);
    expect(plan.revolvingBudget).toBe(0);
  });

  it("subtracts fixed expenses from income before computing the debt budget", () => {
    const debts: Debt[] = [debt({ id: "visa", totalBalance: 500, interestRate: 20, minimumPayment: 25 })];
    const plan = buildPayoffPlan(debts, 3000, 50, 1000, from);

    expect(plan.discretionaryIncome).toBe(2000);
    expect(plan.debtBudget).toBe(1000);
  });

  it("returns an empty schedule with no revolving debts", () => {
    const plan = buildPayoffPlan([], 3000, 50, 0, from);
    expect(plan.schedule).toEqual([]);
    expect(plan.monthsToDebtFree).toBe(0);
    expect(plan.debtFreeDate).not.toBeNull();
  });
});

describe("computeMonthlyPayments", () => {
  // Income 5000, no fixed bills, 50% to debt => 2500 monthly debt budget.
  const income = 5000;
  const debtPct = 50;

  it("pays required minimums off the top, then waterfalls the rest by APR", () => {
    const debts = [
      debt({ id: "mortgage", name: "Mortgage", isRequired: true, minimumPayment: 1000, totalBalance: 200000, interestRate: 6 }),
      debt({ id: "visa", name: "Visa", minimumPayment: 100, totalBalance: 4000, interestRate: 24 }),
      debt({ id: "amex", name: "Amex", minimumPayment: 100, totalBalance: 4000, interestRate: 18 }),
    ];
    const pay = computeMonthlyPayments(debts, income, debtPct, 0);
    const by = Object.fromEntries(pay.map((p) => [p.debtId, p.amount]));

    // Mortgage: full minimum, no extra. Budget left = 2500 - 1000 = 1500.
    expect(by.mortgage).toBe(1000);
    // Both revolving minimums (100 each) then all 1300 extra onto the 24% Visa.
    expect(by.visa).toBe(100 + 1300);
    expect(by.amex).toBe(100);
    // Whole budget accounted for.
    expect(pay.reduce((s, p) => s + p.amount, 0)).toBe(2500);
  });

  it("provisions required-only debts (which the projection schedule skips)", () => {
    const debts = [
      debt({ id: "car", name: "Car", isRequired: true, minimumPayment: 400, totalBalance: 12000 }),
    ];
    const pay = computeMonthlyPayments(debts, income, debtPct, 0);
    expect(pay).toEqual([
      { debtId: "car", name: "Car", isRequired: true, amount: 400 },
    ]);
  });

  it("never pays more than the remaining balance", () => {
    const debts = [
      debt({ id: "visa", name: "Visa", minimumPayment: 100, totalBalance: 300, currentProgress: 250, interestRate: 24 }),
    ];
    const pay = computeMonthlyPayments(debts, income, debtPct, 0);
    // Only 50 remains, so at most 50 is scheduled despite a huge budget.
    expect(pay).toEqual([
      { debtId: "visa", name: "Visa", isRequired: false, amount: 50 },
    ]);
  });

  it("returns nothing when the debt budget is zero", () => {
    const debts = [debt({ id: "visa", minimumPayment: 100 })];
    expect(computeMonthlyPayments(debts, 0, debtPct, 0)).toEqual([]);
  });
});
