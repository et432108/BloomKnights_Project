import type { FinancialSnapshot } from "./types";

/**
 * Builds the context-aware coaching prompt (README §5.2). We hand Gemini the
 * current state of all three buckets and ask it to reason about debt
 * avalanche/snowball progress and fun-money overspend.
 */
export function buildCoachingPrompt(s: FinancialSnapshot): string {
  const debtBudget = (s.monthlyIncome * s.allocations.debtTargetPercent) / 100;
  const savingsBudget =
    (s.monthlyIncome * s.allocations.savingsTargetPercent) / 100;
  const funBudget = (s.monthlyIncome * s.allocations.funMoneyPercent) / 100;

  const funSpent = s.funMoneyTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  return [
    "You are BloomKnights, a supportive but rigorous personal-finance coach.",
    "The user follows a three-bucket method: Debt Repayment, Savings Goals, and Fun Money.",
    "",
    `Monthly income: $${s.monthlyIncome}.`,
    `Target allocation — Debt: ${s.allocations.debtTargetPercent}% ($${debtBudget}/mo), ` +
      `Savings: ${s.allocations.savingsTargetPercent}% ($${savingsBudget}/mo), ` +
      `Fun Money: ${s.allocations.funMoneyPercent}% ($${funBudget}/mo).`,
    "",
    "Debts (avalanche = highest interest first, snowball = smallest balance first):",
    ...s.debts.map(
      (d) =>
        `- ${d.name}: balance $${d.totalBalance}, APR ${d.interestRate}%, ` +
        `min payment $${d.minimumPayment}, paid so far $${d.currentProgress}.`
    ),
    "",
    "Savings goals:",
    ...s.savingsGoals.map(
      (g) =>
        `- ${g.title}: $${g.currentAmount} of $${g.targetAmount} by ${g.targetDate}.`
    ),
    "",
    `Fun-money spending this period: $${funSpent} against a $${funBudget} budget ` +
      `(${funSpent > funBudget ? "OVER" : "within"} budget).`,
    "",
    "Instructions:",
    "1. Flag any bucket that is off-track (over fun-money allowance or behind on debt/savings).",
    "2. Recommend an optimized reallocation, favoring the avalanche method unless a small balance is nearly paid off.",
    "3. Every item must include a clear mathematical breakdown of your reasoning.",
    "4. Rank urgency: high for high-interest debt or overspending, medium for lagging goals, low for on-track nudges.",
    "Return an array of concise, actionable coaching items.",
  ].join("\n");
}
