// Server-side mirror of the shared domain types (see app's src/types/index.ts).

export type Bucket = "debt" | "savings" | "fun_money" | "fixed_bills";
export type TransactionType = "expense" | "income";
export type UrgencyLevel = "low" | "medium" | "high";

/** How often interest is capitalized onto the balance (debt-interest-model). */
export type CompoundingFrequency = "daily" | "monthly" | "annually";

/** How a manual payment was made. Kept open-ended; no processor assumptions. */
export type PaymentMethod =
  | "bank_transfer"
  | "debit_card"
  | "credit_card"
  | "cash"
  | "check"
  | "other";

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
 * A user-entered payment against a debt (payments-ledger). Backend-owned and
 * owner-scoped by `userId`. Modeled as a top-level `payments` collection so the
 * primary "show all payments for a user" query is a single indexed lookup.
 * Distinct from `Transaction` — a repayment is not generic spending.
 */
export interface Payment {
  id: string;
  userId: string;
  debtId: string;
  /** Total amount paid, in the account currency. Must be > 0. */
  amount: number;
  /** ISO date string of when the payment was made. */
  paymentDate: string;
  method?: PaymentMethod;
  note?: string;
  /** Portion of `amount` that reduced principal. */
  principalPortion?: number;
  /** Portion of `amount` that covered accrued interest. */
  interestPortion?: number;
  /** ISO timestamp set by the backend on write. */
  createdAt: string;
  /** ISO timestamp updated by the backend on every write. */
  updatedAt: string;
}

/** Fields a client may submit to create a payment; the backend owns the rest. */
export type PaymentInput = Pick<
  Payment,
  "userId" | "debtId" | "amount" | "paymentDate"
> &
  Partial<Pick<Payment, "method" | "note" | "principalPortion" | "interestPortion">>;

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
