import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  Debt,
  Payment,
  PaymentInput,
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
  };
}

export async function upsertUserProfile(profile: UserProfile): Promise<void> {
  await setDoc(
    doc(db, "users", profile.uid),
    {
      uid: profile.uid,
      email: profile.email,
      displayName: profile.displayName,
      createdAt: Timestamp.fromDate(new Date(profile.createdAt)),
      monthlyIncome: profile.monthlyIncome,
      allocations: profile.allocations,
    },
    { merge: true }
  );
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

// ---- payments --------------------------------------------------------------
// The `payments` collection is backend-owned (schema + rules). There is no
// server write endpoint, so — consistent with debts/transactions above — the
// client writes directly to the owner-scoped collection and stamps the
// server-owned timestamps itself. The principal/interest split stays backend-
// owned and is left unset here. See frontend/docs/payments-ui.md.

function paymentFromDoc(id: string, data: Record<string, unknown>): Payment {
  return {
    id,
    userId: data.userId as string,
    debtId: data.debtId as string,
    amount: data.amount as number,
    paymentDate: toIso(data.paymentDate),
    method: data.method as Payment["method"],
    note: data.note as string | undefined,
    principalPortion: data.principalPortion as number | undefined,
    interestPortion: data.interestPortion as number | undefined,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

export async function fetchPayments(userId: string): Promise<Payment[]> {
  const q = query(
    collection(db, "payments"),
    where("userId", "==", userId),
    orderBy("paymentDate", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => paymentFromDoc(d.id, d.data()));
}

export async function addPayment(input: PaymentInput): Promise<Payment> {
  const now = new Date();
  const ref = await addDoc(collection(db, "payments"), {
    userId: input.userId,
    debtId: input.debtId,
    amount: input.amount,
    paymentDate: Timestamp.fromDate(new Date(input.paymentDate)),
    ...(input.method ? { method: input.method } : {}),
    ...(input.note ? { note: input.note } : {}),
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return {
    id: ref.id,
    userId: input.userId,
    debtId: input.debtId,
    amount: input.amount,
    paymentDate: new Date(input.paymentDate).toISOString(),
    method: input.method,
    note: input.note,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}
