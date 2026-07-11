# Payments Ledger

This note defines the backend-owned payment history that users enter on the website.

## Goal

Users should be able to record a payment themselves, and the site should list those payments as part of their debt history.

## Recommended Firestore Shape

Create a dedicated `payments` collection, or a `payments` subcollection under `debts`, depending on how the UI is expected to query the data.

If the primary use case is “show all payments for a user,” a top-level `payments` collection is easier to query.

Recommended fields:

- `id`
- `userId`
- `debtId`
- `amount`
- `paymentDate`
- `method`
- `note`
- `principalPortion`
- `interestPortion`
- `createdAt`
- `updatedAt`

## Required Behavior

- A payment must belong to exactly one owner.
- A payment must be listable by user.
- A payment must be listable by debt.
- A payment should be usable for payoff and interest calculations.

## Suggested Rules

The Firestore rules pattern should mirror the existing owner checks in [firestore.rules](../../firestore.rules).

## Notes For Claude

Do not model payments as a generic transaction unless the schema explicitly distinguishes repayment from spending.
