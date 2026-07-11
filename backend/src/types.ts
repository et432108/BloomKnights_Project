// Server-side mirror of the shared domain types (see app's src/types/index.ts).

export type Bucket = "debt" | "savings" | "fun_money" | "fixed_bills";
export type TransactionType = "expense" | "income";
export type UrgencyLevel = "low" | "medium" | "high";

/** How often interest is capitalized onto the balance (debt-interest-model). */
export type CompoundingFrequency = "daily" | "monthly" | "annually";

export interface Allocations {
  debtTargetPercent: number;
  savingsTargetPercent: number;
  funMoneyPercent: number;
}

export interface Debt {
  id: string;
  userId: string;
  name: string;
  totalBalance: number;
  interestRate: number;
  minimumPayment: number;
  currentProgress: number;

  /**
   * A debt with a fixed required installment (mortgage, car loan) as opposed
   * to a revolving balance (credit card). Required debts always get their
   * full `minimumPayment` reserved first in the payoff plan.
   */
  isRequired?: boolean;

  // --- Interest-aware fields (debt-interest-model). All OPTIONAL so existing
  // debt records and screens keep working without migration. ---
  /** Annual percentage rate, e.g. 22.99 for a 22.99% APR credit card. */
  aprPercent?: number;
  /** How often interest compounds; drives the accrual math. */
  compoundingFrequency?: CompoundingFrequency;
  /** ISO date string for the start of the current billing cycle. */
  billingCycleStartDate?: string;
  /** ISO date string for the end of the current billing cycle. */
  billingCycleEndDate?: string;
  /** ISO date string for when the current cycle's payment is due. */
  paymentDueDate?: string;
  /** ISO timestamp of the last point interest was accrued/settled. */
  lastInterestAccruedAt?: string;
  /** Balance carried into the current cycle (interest accrues on this). */
  lastStatementBalance?: number;
  /** Balance at the moment the last statement closed. */
  statementCloseBalance?: number;
}

/**
 * `fixed_expenses` collection. Recurring monthly obligations that are NOT
 * debts (no balance to pay off): rent, insurance, subscriptions, etc. Their
 * sum is subtracted from income before the payoff plan computes the debt
 * budget.
 */
export interface FixedExpense {
  id: string;
  userId: string;
  name: string;
  amount: number;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  bucket: Bucket;
  date: string;
  description: string;
}

export interface FinancialSnapshot {
  monthlyIncome: number;
  allocations: Allocations;
  debts: Debt[];
  savingsGoals: SavingsGoal[];
  funMoneyTransactions: Transaction[];
}

export interface CoachingItem {
  title: string;
  urgency: UrgencyLevel;
  recommendation: string;
  mathBreakdown: string;
  bucket: Bucket;
}

export interface CoachingResponse {
  items: CoachingItem[];
}
