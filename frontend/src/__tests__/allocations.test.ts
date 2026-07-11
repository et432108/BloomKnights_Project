import {
  ALLOCATION_TOTAL,
  allocationAmount,
  allocationSum,
  clampPercent,
  isValidAllocations,
  withDebtPercent,
} from "@/lib/allocations";
import type { Allocations } from "@/types";

function alloc(over: Partial<Allocations> = {}): Allocations {
  return {
    debtTargetPercent: 50,
    savingsTargetPercent: 40,
    funMoneyPercent: 10,
    ...over,
  };
}

describe("allocationAmount", () => {
  it("maps a percentage of income to dollars", () => {
    expect(allocationAmount(4000, 50)).toBe(2000);
    expect(allocationAmount(0, 50)).toBe(0);
  });
});

describe("clampPercent", () => {
  it("rounds and clamps to 0..100", () => {
    expect(clampPercent(49.6)).toBe(50);
    expect(clampPercent(-5)).toBe(0);
    expect(clampPercent(150)).toBe(100);
    expect(clampPercent(NaN)).toBe(0);
  });
});

describe("isValidAllocations", () => {
  it("accepts a split that sums to 100", () => {
    expect(isValidAllocations(alloc())).toBe(true);
  });
  it("rejects a split that doesn't sum to 100", () => {
    expect(isValidAllocations(alloc({ debtTargetPercent: 60 }))).toBe(false);
    expect(allocationSum(alloc({ debtTargetPercent: 60 }))).toBe(110);
  });
  it("rejects negative shares", () => {
    expect(isValidAllocations(alloc({ funMoneyPercent: -10, debtTargetPercent: 60 }))).toBe(
      false
    );
  });
});

describe("withDebtPercent", () => {
  it("sets debt and rebalances the rest to still total 100", () => {
    const next = withDebtPercent(alloc(), 70);
    expect(next.debtTargetPercent).toBe(70);
    expect(allocationSum(next)).toBe(ALLOCATION_TOTAL);
    // Savings kept its 40:10 share of the remaining 30.
    expect(next.savingsTargetPercent).toBe(24);
    expect(next.funMoneyPercent).toBe(6);
  });

  it("splits evenly when the other buckets are both zero", () => {
    const next = withDebtPercent(
      alloc({ debtTargetPercent: 100, savingsTargetPercent: 0, funMoneyPercent: 0 }),
      40
    );
    expect(next.debtTargetPercent).toBe(40);
    expect(next.savingsTargetPercent).toBe(30);
    expect(next.funMoneyPercent).toBe(30);
    expect(allocationSum(next)).toBe(ALLOCATION_TOTAL);
  });

  it("produces a valid split across the full range", () => {
    for (let p = 0; p <= 100; p += 7) {
      expect(isValidAllocations(withDebtPercent(alloc(), p))).toBe(true);
    }
  });
});
