/**
 * Domain types mirroring the Firestore schema defined in README-LLM.md §4.
 * Timestamps are represented as ISO strings on the client and converted to
 * Firestore Timestamps at the data-access boundary.
 */

/** The three financial buckets (plus fixed bills) — README §1. */
export type Bucket = "debt" | "savings" | "fun_money" | "fixed_bills";

export type TransactionType = "expense" | "income";

export type UrgencyLevel = "low" | "medium" | "high";

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
