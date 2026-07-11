# Payments UI

This note describes the frontend behavior for entering and displaying debt
payments, and the payoff guidance shown alongside each debt. It documents
frontend behavior only — the payment schema and interest math are backend-owned
(see the backend note-set).

## What The Frontend Does

- **Debts list** ([app/(tabs)/debts/index.tsx](<../app/(tabs)/debts/index.tsx>)):
  each debt shows remaining balance, effective APR, a progress bar, a high-APR
  flag, and an estimated payoff horizon. Tapping a debt opens its detail screen.
- **Debt detail** ([app/(tabs)/debts/[id].tsx](<../app/(tabs)/debts/[id].tsx>)):
  balance and progress, interest-aware payoff outlook (months, payoff date, and
  estimated total interest at the minimum payment), a form to record a payment,
  and the payment history for that debt.
- **Payoff math** ([src/lib/debt.ts](../src/lib/debt.ts)): pure display helpers
  that mirror the backend's documented monthly-compounding model. Used only to
  render guidance — never persisted.

## Data Flow

1. `useFinanceStore.loadAll` fetches debts, savings, transactions, and payments.
2. Recording a payment calls `useFinanceStore.addPayment`, which writes the
   payment and optimistically advances the debt's `currentProgress`.
3. The coaching snapshot is unchanged — payments are **not** added to it, so the
   existing coaching flow stays compatible.

## Contract Assumption (frontend boundary)

The `payments` collection is backend-owned, but no server write endpoint is
exposed. So — exactly as the frontend already does for `debts` and
`transactions` — the client writes directly to the owner-scoped `payments`
collection and stamps `createdAt` / `updatedAt` itself. The `principalPortion` /
`interestPortion` split is backend-owned and is **left unset by the client**.

If a server-side write path (e.g. a `recordPayment` callable) is added later,
`src/lib/firestore.ts#addPayment` should delegate to it and drop the client-side
timestamps. No backend changes were made as part of this frontend work.
