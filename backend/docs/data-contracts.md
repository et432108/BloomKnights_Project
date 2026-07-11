# Data Contracts

This note is the schema reference point for Claude.

## Current Shared Types

The authoritative type mirror lives in [backend/src/types.ts](../src/types.ts).

Current entities:

- `UserProfile`
- `Debt`
- `SavingsGoal`
- `Transaction`
- `FinancialSnapshot`
- `CoachingItem`
- `CoachingResponse`

## Current Debt Shape

The current `Debt` shape already supports payoff tracking:

- `totalBalance`
- `interestRate`
- `minimumPayment`
- `currentProgress`

That is enough to describe payoff status, but not enough for precise interest-aware payoff modeling.

## Proposed Payment Ledger Shape

For user-entered payments that should appear on the website, add a backend-owned `payments` collection.

Recommended fields:

- `id`
- `userId`
- `debtId`
- `amount`
- `paymentDate`
- `method` or `source`
- `note`
- `principalPortion`
- `interestPortion`
- `createdAt`
- `updatedAt`

This shape supports:

- listing payments on the website,
- querying payments by user,
- querying payments by debt,
- and tracking how a payment affected principal versus interest.

## Proposed Interest-Aware Debt Fields

To support high-interest credit card math, expand the debt record with fields like:

- `aprPercent`
- `aprType` or `interestType`
- `compoundingFrequency`
- `billingCycleStartDate`
- `billingCycleEndDate`
- `paymentDueDate`
- `lastInterestAccruedAt`
- `lastStatementBalance`

These fields let the backend calculate or approximate interest consistently across paydown strategies.

## Missing Backend Pieces

The current codebase still needs explicit backend support for:

- storing user-entered debt payments,
- computing payoff dates from balance, APR, and payment amount,
- splitting payment amounts between principal and interest,
- and preserving the payment history used for on-site listing.

## AI Output Schema

The coaching response schema remains defined in [backend/src/schema.ts](../src/schema.ts).

Do not let the new payment schema change the coaching response shape.
