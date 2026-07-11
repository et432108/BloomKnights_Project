// Server-side mirror of the shared domain types (see app's src/types/index.ts).

export type Bucket = "debt" | "savings" | "fun_money" | "fixed_bills";
export type TransactionType = "expense" | "income";
export type UrgencyLevel = "low" | "medium" | "high";

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
