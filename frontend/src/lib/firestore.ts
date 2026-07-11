import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  BalanceSnapshot,
  Debt,
  FixedExpense,
  SavingsGoal,
  Transaction,
  UserProfile,
} from "@/types";

/**
 * Thin data-access layer over Cloud Firestore. Converts Firestore Timestamps
 * to/from ISO strings so the rest of the app deals only in plain JSON-friendly
 * shapes (see src/types/index.ts).
 */

const toIso = (value: unknown): string => {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === "string") return value;
  return new Date().toISOString();
};

// ---- users ----------------------------------------------------------------

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    uid,
    email: data.email,
    displayName: data.displayName,
    createdAt: toIso(data.createdAt),
    monthlyIncome: data.monthlyIncome ?? 0,
    allocations: data.allocations ?? {
      debtTargetPercent: 0,
      savingsTargetPercent: 0,
      funMoneyPercent: 0,
    },
    lastProvisionedMonth: data.lastProvisionedMonth ?? undefined,
  };
}

export async function upsertUserProfile(profile: UserProfile): Promise<void> {
  const data: Record<string, unknown> = {
    uid: profile.uid,
    email: profile.email,
    displayName: profile.displayName,
    createdAt: Timestamp.fromDate(new Date(profile.createdAt)),
    monthlyIncome: profile.monthlyIncome,
    allocations: profile.allocations,
  };
  // Firestore rejects `undefined`; only write the guard once it's set.
  if (profile.lastProvisionedMonth) {
    data.lastProvisionedMonth = profile.lastProvisionedMonth;
  }
  await setDoc(doc(db, "users", profile.uid), data, { merge: true });
}

// ---- debts -----------------------------------------------------------------

export async function fetchDebts(userId: string): Promise<Debt[]> {
  const q = query(collection(db, "debts"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Debt, "id">) }));
}

export async function addDebt(debt: Omit<Debt, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "debts"), debt);
  return ref.id;
}

export async function updateDebtProgress(
  debtId: string,
  currentProgress: number
): Promise<void> {
  await updateDoc(doc(db, "debts", debtId), { currentProgress });
}

/**
 * Patch any subset of a debt's editable fields (inline edit on the Finance
 * screen). `userId` is never patched — the rules pin it to the stored value.
 */
export async function updateDebt(
  debtId: string,
  patch: Partial<Omit<Debt, "id" | "userId">>
): Promise<void> {
  await updateDoc(doc(db, "debts", debtId), patch);
}

export async function deleteDebt(debtId: string): Promise<void> {
  await deleteDoc(doc(db, "debts", debtId));
}

// ---- savings_goals ---------------------------------------------------------

export async function fetchSavingsGoals(userId: string): Promise<SavingsGoal[]> {
  const q = query(collection(db, "savings_goals"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      userId: data.userId,
      title: data.title,
      targetAmount: data.targetAmount,
      currentAmount: data.currentAmount,
      targetDate: toIso(data.targetDate),
    };
  });
}

export async function addSavingsGoal(
  goal: Omit<SavingsGoal, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, "savings_goals"), {
    ...goal,
    targetDate: Timestamp.fromDate(new Date(goal.targetDate)),
  });
  return ref.id;
}

/**
 * Patch any subset of a savings goal's editable fields. `targetDate` is stored
 * as a Firestore Timestamp, so convert it when present.
 */
export async function updateSavingsGoal(
  goalId: string,
  patch: Partial<Omit<SavingsGoal, "id" | "userId">>
): Promise<void> {
  const { targetDate, ...rest } = patch;
  // Concrete object literal (no `unknown` index) so it satisfies updateDoc's
  // UpdateData type; targetDate is stored as a Firestore Timestamp.
  const data = {
    ...rest,
    ...(targetDate !== undefined
      ? { targetDate: Timestamp.fromDate(new Date(targetDate)) }
      : {}),
  };
  await updateDoc(doc(db, "savings_goals", goalId), data);
}

export async function deleteSavingsGoal(goalId: string): Promise<void> {
  await deleteDoc(doc(db, "savings_goals", goalId));
}

// ---- transactions ----------------------------------------------------------

export async function fetchTransactions(
  userId: string
): Promise<Transaction[]> {
  const q = query(collection(db, "transactions"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      userId: data.userId,
      amount: data.amount,
      type: data.type,
      bucket: data.bucket,
      date: toIso(data.date),
      description: data.description,
    };
  });
}

export async function addTransaction(
  tx: Omit<Transaction, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, "transactions"), {
    ...tx,
    date: Timestamp.fromDate(new Date(tx.date)),
  });
  return ref.id;
}

// ---- fixed_expenses ---------------------------------------------------------
// Recurring monthly obligations that are NOT debts (rent, insurance,
// subscriptions). Summed into the payoff plan's required-budget math.

export async function fetchFixedExpenses(userId: string): Promise<FixedExpense[]> {
  const q = query(collection(db, "fixed_expenses"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      userId: data.userId,
      name: data.name,
      amount: data.amount,
    };
  });
}

export async function addFixedExpense(
  expense: Omit<FixedExpense, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, "fixed_expenses"), expense);
  return ref.id;
}

export async function updateFixedExpense(
  expenseId: string,
  patch: Partial<Omit<FixedExpense, "id" | "userId">>
): Promise<void> {
  await updateDoc(doc(db, "fixed_expenses", expenseId), patch);
}

export async function deleteFixedExpense(expenseId: string): Promise<void> {
  await deleteDoc(doc(db, "fixed_expenses", expenseId));
}

// ---- balance_snapshots ------------------------------------------------------
// One doc per user per month ({userId}_{monthKey}) recording the total-balance
// figure, powering the dashboard's month-over-month trend.

export async function fetchBalanceSnapshots(
  userId: string
): Promise<BalanceSnapshot[]> {
  const q = query(
    collection(db, "balance_snapshots"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      userId: data.userId,
      monthKey: data.monthKey,
      balance: data.balance,
      createdAt: toIso(data.createdAt),
    };
  });
}

export async function upsertBalanceSnapshot(
  userId: string,
  monthKey: string,
  balance: number
): Promise<void> {
  await setDoc(
    doc(db, "balance_snapshots", `${userId}_${monthKey}`),
    { userId, monthKey, balance, createdAt: Timestamp.fromDate(new Date()) },
    { merge: true }
  );
}
