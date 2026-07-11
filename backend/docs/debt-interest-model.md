# Debt Interest Model

This note defines the minimum backend schema needed for high-interest debt payoff math.

## Current Limitation

The present debt shape tracks balance, rate, and payment progress, but it does not fully describe how interest accrues over time.

## What Needs To Be Modeled

For credit card debt, the backend should be able to represent:

- APR,
- how often interest compounds,
- the billing cycle boundaries,
- the payment due date,
- and the last known interest accrual point.

## Suggested Debt Fields

Add or support fields like:

- `aprPercent`
- `compoundingFrequency`
- `billingCycleStartDate`
- `billingCycleEndDate`
- `paymentDueDate`
- `lastInterestAccruedAt`
- `lastStatementBalance`
- `statementCloseBalance`

## Why These Fields Matter

These values let the backend answer questions like:

- how much interest accrued this cycle,
- how much a payment reduced principal,
- whether a debt is high-interest enough to prioritize first,
- and how much total interest a payoff strategy will save.

## Implementation Direction

The calculation logic should live in backend code, but the schema note should exist first so the data model and math assumptions stay aligned.
