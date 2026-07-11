# User Data Schema

All application data for a single user lives across five top-level Firestore
collections, each document-scoped by a `userId` field (or, for `users`
itself, by document id) equal to that user's Firebase Auth `uid`. This is a
NoSQL schema — there are no enforced foreign keys; ownership is only
enforced at the `firestore.rules` layer via `request.auth.uid ==
resource.data.userId`.

Authoritative types: [frontend/src/types/index.ts](../../frontend/src/types/index.ts),
mirrored server-side in [backend/src/types.ts](../src/types.ts).

## `users/{userId}`

One document per user. Document id **is** the `userId`.

| Field | Type | Notes |
|---|---|---|
| `uid` | string | Firebase Auth uid, same as doc id |
| `email` | string | |
| `displayName` | string | |
| `createdAt` | ISO timestamp | |
| `monthlyIncome` | number | |
| `allocations` | `Allocations` | `{ debtTargetPercent, savingsTargetPercent, funMoneyPercent }` |

## `debts/{debtId}` — where `userId == uid`

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `userId` | string | owner |
| `name` | string | e.g. "Credit Card A" |
| `totalBalance` | number | |
| `interestRate` | number | |
| `minimumPayment` | number | |
| `currentProgress` | number | |
| `isRequired?` | boolean | mortgage/car loan — full `minimumPayment` always reserved first in the payoff plan, never gets avalanche extra |
| `aprPercent?` | number | optional, interest-aware model |
| `compoundingFrequency?` | `"daily" \| "monthly" \| "annually"` | optional |
| `billingCycleStartDate?` | ISO date | optional |
| `billingCycleEndDate?` | ISO date | optional |
| `paymentDueDate?` | ISO date | optional |
| `lastInterestAccruedAt?` | ISO timestamp | optional |
| `lastStatementBalance?` | number | optional |
| `statementCloseBalance?` | number | optional |

## `fixed_expenses/{expenseId}` — where `userId == uid`

Recurring monthly obligations that are **not** debts — no balance, no
payoff (rent, insurance, subscriptions). Their sum is subtracted from
`monthlyIncome` before the payoff plan computes the debt budget.

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `userId` | string | owner |
| `name` | string | e.g. "Rent" |
| `amount` | number | monthly amount, > 0 |

## `savings_goals/{goalId}` — where `userId == uid`

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `userId` | string | owner |
| `title` | string | |
| `targetAmount` | number | |
| `currentAmount` | number | |
| `targetDate` | ISO timestamp | |

## `transactions/{transactionId}` — where `userId == uid`

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `userId` | string | owner |
| `amount` | number | |
| `type` | `"expense" \| "income"` | |
| `bucket` | `"debt" \| "savings" \| "fun_money" \| "fixed_bills"` | |
| `date` | ISO timestamp | |
| `description` | string | |

## Relationships for a given `userId`

```
users/{userId}
  └─ 1:N → debts           (debts[i].userId == userId)
  └─ 1:N → fixed_expenses  (fixed_expenses[i].userId == userId)
  └─ 1:N → savings_goals   (savings_goals[i].userId == userId)
  └─ 1:N → transactions    (transactions[i].userId == userId)
```

No document embeds another; every relationship is a plain string field
resolved with a separate query.

## Payoff plan (not stored — computed on every load)

There is no user-entered payment ledger. Instead
`frontend/src/lib/debt.ts#buildPayoffPlan` computes a month-by-month
schedule from current data:

1. `discretionaryIncome = monthlyIncome - sum(fixed_expenses.amount)`
2. `debtBudget = discretionaryIncome * allocations.debtTargetPercent / 100`
3. Debts with `isRequired: true` get their full `minimumPayment` reserved
   first, off the top, every month.
4. Whatever's left is waterfalled avalanche-style (highest APR first)
   across the remaining ("revolving") debts: pay everyone's minimum, then
   dump all remaining budget on the highest-APR debt until it's paid off,
   then roll to the next.
5. If the budget can't cover required debts (or revolving minimums), the
   plan surfaces a shortfall instead of a silently broken schedule.

## In-memory aggregate: `FinancialSnapshot`

Not stored — assembled per-request from the collections above and sent to
the Gemini coaching Cloud Function:

```
FinancialSnapshot {
  monthlyIncome: number
  allocations: Allocations
  debts: Debt[]
  savingsGoals: SavingsGoal[]
  funMoneyTransactions: Transaction[]  // transactions where bucket === "fun_money"
}
```
