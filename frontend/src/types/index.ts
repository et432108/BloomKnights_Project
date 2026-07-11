/**
 * Domain types mirroring the Firestore schema defined in README-LLM.md §4.
 * Timestamps are represented as ISO strings on the client and converted to
 * Firestore Timestamps at the data-access boundary.
 */

/** The three financial buckets (plus fixed bills) — README §1. */
export type Bucket = "debt" | "savings" | "fun_money" | "fixed_bills";

export type TransactionType = "expense" | "income";

export type UrgencyLevel = "low" | "medium" | "high";

/** How often a debt's interest compounds — mirrors the backend contract. */
export type CompoundingFrequency = "daily" | "monthly" | "annually";

/** `users` collection — document id: {userId}. */
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: string; // ISO timestamp
  monthlyIncome: number;
  allocations: Allocations;
  /**
   * "YYYY-MM" of the last month the user's debt budget was provisioned (applied
   * to debt balances). Guards the "provision this month's payments" action so a
   * month can't be double-applied — see services/provisioning.ts.
   */
  lastProvisionedMonth?: string;
}

export interface Allocations {
  debtTargetPercent: number;
  savingsTargetPercent: number;
  funMoneyPercent: number;
}

/** `debts` collection — document id: {debtId}. */
export interface Debt {
  id: string;
  userId: string;
  name: string; // e.g., "Credit Card A"
  totalBalance: number;
  interestRate: number;
  minimumPayment: number;
  currentProgress: number;

  /**
   * A debt with a fixed required installment (mortgage, car loan) as opposed
   * to a revolving balance (credit card). Required debts always get their
   * full `minimumPayment` reserved first in the payoff plan and never
   * receive avalanche extra — see `buildPayoffPlan` in lib/debt.ts.
   */
  isRequired?: boolean;

  // Optional interest-aware fields (mirrors the backend contract). Existing
  // debts predate these, so every field is optional and the UI falls back to
  // `interestRate` when `aprPercent` is absent.
  aprPercent?: number;
  compoundingFrequency?: CompoundingFrequency;
  billingCycleStartDate?: string; // ISO date
  billingCycleEndDate?: string; // ISO date
  paymentDueDate?: string; // ISO date
  lastInterestAccruedAt?: string; // ISO timestamp
  lastStatementBalance?: number;
  statementCloseBalance?: number;
}

/**
 * `fixed_expenses` collection — document id: {expenseId}. Recurring monthly
 * obligations that are NOT debts (no balance to pay off): rent, insurance,
 * subscriptions, etc. Their sum is subtracted from income before the payoff
 * plan computes the debt budget (see `buildPayoffPlan` in lib/debt.ts).
 */
export interface FixedExpense {
  id: string;
  userId: string;
  name: string; // e.g., "Rent"
  amount: number; // monthly amount
}

/**
 * `balance_snapshots` collection — document id: {userId}_{monthKey}. One row per
 * user per month capturing the total-balance figure, so the dashboard can show a
 * month-over-month trend. Written once per month; see services/snapshots.ts.
 */
export interface BalanceSnapshot {
  id: string;
  userId: string;
  monthKey: string; // "YYYY-MM"
  balance: number;
  createdAt: string; // ISO timestamp
}

/** `savings_goals` collection — document id: {goalId}. */
export interface SavingsGoal {
  id: string;
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // ISO timestamp
}

/** `transactions` collection — document id: {transactionId}. */
export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  bucket: Bucket;
  date: string; // ISO timestamp
  description: string;
}

/**
 * Structured coaching item returned by the Gemini Cloud Function.
 * Mirrors the enforced `responseSchema` (README §5.3).
 */
export interface CoachingItem {
  title: string;
  urgency: UrgencyLevel;
  recommendation: string;
  /** Plain-language math showing how the numbers were derived. */
  mathBreakdown: string;
  bucket: Bucket;
}

export interface CoachingResponse {
  items: CoachingItem[];
}

/** Snapshot of the three buckets sent to the Cloud Function for AI coaching. */
export interface FinancialSnapshot {
  monthlyIncome: number;
  allocations: Allocations;
  debts: Debt[];
  savingsGoals: SavingsGoal[];
  funMoneyTransactions: Transaction[]; // transactions where bucket === 'fun_money'
}
