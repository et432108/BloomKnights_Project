import {
  HIGH_INTEREST_THRESHOLD,
  interestForCycle,
  isHighInterest,
  periodicRate,
  projectMonthlyPayoff,
  splitPaymentPrincipalInterest,
} from "../interest";

describe("periodicRate", () => {
  it("divides APR by the periods-per-year for the frequency", () => {
    expect(periodicRate(12, "monthly")).toBeCloseTo(0.01, 10);
    expect(periodicRate(365, "daily")).toBeCloseTo(0.01, 10);
    expect(periodicRate(5, "annually")).toBeCloseTo(0.05, 10);
  });

  it("returns 0 for a 0% APR", () => {
    expect(periodicRate(0, "monthly")).toBe(0);
  });

  it("rejects a negative APR", () => {
    expect(() => periodicRate(-1, "monthly")).toThrow(RangeError);
  });
});

describe("interestForCycle", () => {
  it("compounds interest over the given periods", () => {
    // 22% APR compounded monthly for one period on $4,000 -> 4000 * 0.22/12.
    expect(interestForCycle(4000, 22, "monthly", 1)).toBeCloseTo(73.333, 3);
  });

  it("returns 0 interest on a 0 balance or 0% APR", () => {
    expect(interestForCycle(0, 22, "monthly", 1)).toBe(0);
    expect(interestForCycle(4000, 0, "daily", 30)).toBe(0);
  });

  it("compounds over multiple daily periods", () => {
    const r = 0.2 / 365;
    const expected = 1000 * (Math.pow(1 + r, 30) - 1);
    expect(interestForCycle(1000, 20, "daily", 30)).toBeCloseTo(expected, 8);
  });

  it("rejects negative inputs", () => {
    expect(() => interestForCycle(-1, 22, "monthly", 1)).toThrow(RangeError);
    expect(() => interestForCycle(1000, 22, "monthly", -1)).toThrow(RangeError);
  });
});

describe("splitPaymentPrincipalInterest", () => {
  it("applies interest first, then principal", () => {
    expect(splitPaymentPrincipalInterest(200, 50)).toEqual({
      interestPortion: 50,
      principalPortion: 150,
    });
  });

  it("puts the whole payment toward interest when it can't cover it", () => {
    expect(splitPaymentPrincipalInterest(30, 50)).toEqual({
      interestPortion: 30,
      principalPortion: 0,
    });
  });

  it("never returns negative portions", () => {
    const { principalPortion, interestPortion } =
      splitPaymentPrincipalInterest(0, 0);
    expect(principalPortion).toBe(0);
    expect(interestPortion).toBe(0);
  });

  it("rejects negative amounts", () => {
    expect(() => splitPaymentPrincipalInterest(-5, 10)).toThrow(RangeError);
  });
});

describe("isHighInterest", () => {
  it("uses a 20% default threshold, inclusive", () => {
    expect(isHighInterest(HIGH_INTEREST_THRESHOLD)).toBe(true);
    expect(isHighInterest(24.99)).toBe(true);
    expect(isHighInterest(19.99)).toBe(false);
  });

  it("honors a custom threshold", () => {
    expect(isHighInterest(15, 10)).toBe(true);
    expect(isHighInterest(8, 10)).toBe(false);
  });
});

describe("projectMonthlyPayoff", () => {
  it("clears a zero balance immediately", () => {
    expect(projectMonthlyPayoff(0, 22, 100)).toEqual({
      months: 0,
      totalInterest: 0,
      paidOff: true,
    });
  });

  it("pays off an interest-free balance in even installments", () => {
    const result = projectMonthlyPayoff(1000, 0, 250);
    expect(result.paidOff).toBe(true);
    expect(result.months).toBe(4);
    expect(result.totalInterest).toBe(0);
  });

  it("accrues interest on a high-APR balance and still pays off", () => {
    const result = projectMonthlyPayoff(1000, 24, 200);
    expect(result.paidOff).toBe(true);
    expect(result.months).toBeGreaterThan(4); // interest stretches it out
    expect(result.totalInterest).toBeGreaterThan(0);
  });

  it("reports never-paid-off when the payment can't cover the interest", () => {
    // $10,000 at 24% APR -> ~$200/mo interest; a $150 payment never dents it.
    const result = projectMonthlyPayoff(10000, 24, 150, 600);
    expect(result.paidOff).toBe(false);
    expect(result.months).toBe(600);
  });

  it("rejects negative inputs", () => {
    expect(() => projectMonthlyPayoff(-1, 22, 100)).toThrow(RangeError);
    expect(() => projectMonthlyPayoff(1000, 22, -1)).toThrow(RangeError);
  });
});
