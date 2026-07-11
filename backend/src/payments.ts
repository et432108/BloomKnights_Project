import { getFirestore } from "firebase-admin/firestore";
import type { Payment, PaymentInput } from "./types";

/**
 * Backend-owned payments ledger (payments-ledger). A payment is a user-entered
 * repayment against a debt, stored in a top-level `payments` collection and
 * owner-scoped by `userId`. The backend owns the canonical schema and timestamps;
 * the frontend only submits the input fields.
 */

export const PAYMENTS_COLLECTION = "payments";

/** Lazy accessor so `getFirestore` is resolved at call time (mockable in tests). */
function db() {
  return getFirestore();
}

/**
 * Validate a client-submitted payment. Throws a descriptive Error on the first
 * problem so callers (e.g. a callable function) can surface it. The payment must
 * belong to exactly one owner and reference exactly one debt.
 */
export function validatePaymentInput(input: PaymentInput): void {
  if (!input || typeof input !== "object") {
    throw new Error("Payment input must be an object.");
  }
  if (typeof input.userId !== "string" || input.userId.trim() === "") {
    throw new Error("Payment requires a non-empty userId.");
  }
  if (typeof input.debtId !== "string" || input.debtId.trim() === "") {
    throw new Error("Payment requires a non-empty debtId.");
  }
  if (typeof input.amount !== "number" || !(input.amount > 0)) {
    throw new Error("Payment amount must be a number greater than 0.");
  }
  if (
    typeof input.paymentDate !== "string" ||
    Number.isNaN(Date.parse(input.paymentDate))
  ) {
    throw new Error("Payment requires a valid ISO paymentDate.");
  }
  for (const field of ["principalPortion", "interestPortion"] as const) {
    const value = input[field];
    if (value !== undefined && (typeof value !== "number" || value < 0)) {
      throw new Error(`Payment ${field} must be a number >= 0 when provided.`);
    }
  }
}

/**
 * Create an owner-scoped payment record, stamping server-owned timestamps.
 * `nowIso` is injectable to keep tests deterministic.
 */
export async function createPayment(
  input: PaymentInput,
  nowIso: string = new Date().toISOString()
): Promise<Payment> {
  validatePaymentInput(input);

  const ref = db().collection(PAYMENTS_COLLECTION).doc();
  const payment: Payment = {
    id: ref.id,
    userId: input.userId,
    debtId: input.debtId,
    amount: input.amount,
    paymentDate: input.paymentDate,
    method: input.method,
    note: input.note,
    principalPortion: input.principalPortion,
    interestPortion: input.interestPortion,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await ref.set(payment);
  return payment;
}

/** Fetch a single payment by id, or `null` if it does not exist. */
export async function getPaymentById(id: string): Promise<Payment | null> {
  const snap = await db().collection(PAYMENTS_COLLECTION).doc(id).get();
  return snap.exists ? (snap.data() as Payment) : null;
}

/** List all of a user's payments, newest first. */
export async function listPaymentsByUser(userId: string): Promise<Payment[]> {
  const snap = await db()
    .collection(PAYMENTS_COLLECTION)
    .where("userId", "==", userId)
    .orderBy("paymentDate", "desc")
    .get();
  return snap.docs.map((d) => d.data() as Payment);
}

/**
 * List a user's payments for a single debt, newest first. Always filters by
 * `userId` too, so ownership is enforced in the query itself (defense in depth
 * on top of the Firestore rules).
 */
export async function listPaymentsByDebt(
  userId: string,
  debtId: string
): Promise<Payment[]> {
  const snap = await db()
    .collection(PAYMENTS_COLLECTION)
    .where("userId", "==", userId)
    .where("debtId", "==", debtId)
    .orderBy("paymentDate", "desc")
    .get();
  return snap.docs.map((d) => d.data() as Payment);
}
