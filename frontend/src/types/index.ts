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

/** How a manual payment was made — mirrors the backend contract. */
export type PaymentMethod =
  | "bank_transfer"
  | "debit_card"
  | "credit_card"
  | "cash"
  | "check"
  | "other";

/** `users` collection — document id: {userId}. */
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: string; // ISO timestamp
  monthlyIncome: number;
  allocations: Allocations;
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
 * `payments` collection — document id: {paymentId}. A user-entered repayment
 * against a debt. Mirrors the backend-owned contract; the client only submits
 * the input fields (see `PaymentInput`). `principalPortion` / `interestPortion`
 * are backend-owned and left unset by the client.
 */
export interface Payment {
  id: string;
  userId: string;
  debtId: string;
  amount: number;
  paymentDate: string; // ISO date
  method?: PaymentMethod;
  note?: string;
  principalPortion?: number;
  interestPortion?: number;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

/** Fields the client submits to record a payment; the rest are stamped on write. */
export type PaymentInput = Pick<
  Payment,
  "userId" | "debtId" | "amount" | "paymentDate"
> &
  Partial<Pick<Payment, "method" | "note">>;

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
