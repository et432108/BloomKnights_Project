# Snapshot Flow

This note documents how the frontend builds the snapshot passed to coaching.

## Flow

1. Read the signed-in user's profile.
2. Pull debts, savings goals, and transactions.
3. Filter transactions to `bucket === "fun_money"`.
4. Assemble the `FinancialSnapshot`.

## Relevant Files

- [frontend/src/store/useFinanceStore.ts](../src/store/useFinanceStore.ts)
- [frontend/src/types/index.ts](../src/types/index.ts)
- [frontend/src/services/auth.ts](../src/services/auth.ts)

## Notes

The snapshot is a frontend concern, but its shape must stay compatible with the backend coaching function.
