import {
  HIGH_INTEREST_THRESHOLD,
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
