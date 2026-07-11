import { buildCoachingPrompt } from "../prompt";
import type { FinancialSnapshot } from "../types";

function snapshot(overrides: Partial<FinancialSnapshot> = {}): FinancialSnapshot {
  return {
    monthlyIncome: 5000,
    allocations: {
      debtTargetPercent: 50,
      savingsTargetPercent: 40,
      funMoneyPercent: 10,
    },
    debts: [],
    savingsGoals: [],
    funMoneyTransactions: [],
    ...overrides,
  };
}

describe("buildCoachingPrompt", () => {
  it("computes each bucket's monthly budget from income and allocations", () => {
    const prompt = buildCoachingPrompt(snapshot());
    expect(prompt).toContain("Debt: 50% ($2500/mo)");
    expect(prompt).toContain("Savings: 40% ($2000/mo)");
    expect(prompt).toContain("Fun Money: 10% ($500/mo)");
  });

  it("flags fun-money spending as OVER budget when it exceeds the allowance", () => {
    const prompt = buildCoachingPrompt(
      snapshot({
        funMoneyTransactions: [
          {
            id: "t1",
            userId: "u1",
            amount: 600,
            type: "expense",
            bucket: "fun_money",
            date: "2026-07-01",
            description: "concert",
          },
        ],
      })
    );
    expect(prompt).toContain("$600 against a $500 budget");
    expect(prompt).toContain("(OVER budget)");
  });

  it("reports within budget and ignores income transactions in fun spend", () => {
    const prompt = buildCoachingPrompt(
      snapshot({
        funMoneyTransactions: [
          {
            id: "t2",
            userId: "u1",
            amount: 100,
            type: "expense",
            bucket: "fun_money",
            date: "2026-07-02",
            description: "dinner",
          },
          {
            id: "t3",
            userId: "u1",
            amount: 999,
            type: "income",
            bucket: "fun_money",
            date: "2026-07-02",
            description: "refund",
          },
        ],
      })
    );
    expect(prompt).toContain("$100 against a $500 budget");
    expect(prompt).toContain("(within budget)");
  });

  it("formats each debt line with balance, APR, min payment and progress", () => {
    const prompt = buildCoachingPrompt(
      snapshot({
        debts: [
          {
            id: "d1",
            userId: "u1",
            name: "Visa",
            totalBalance: 4000,
            interestRate: 22,
            minimumPayment: 120,
            currentProgress: 500,
          },
        ],
      })
    );
    expect(prompt).toContain(
      "- Visa: balance $4000, APR 22%, min payment $120, paid so far $500."
    );
  });

  it("formats savings goal lines", () => {
    const prompt = buildCoachingPrompt(
      snapshot({
        savingsGoals: [
          {
            id: "g1",
            userId: "u1",
            title: "Emergency Fund",
            targetAmount: 10000,
            currentAmount: 2500,
            targetDate: "2026-12-31",
          },
        ],
      })
    );
    expect(prompt).toContain(
      "- Emergency Fund: $2500 of $10000 by 2026-12-31."
    );
  });

  it("handles empty debts and goals without throwing", () => {
    expect(() => buildCoachingPrompt(snapshot())).not.toThrow();
  });
});
