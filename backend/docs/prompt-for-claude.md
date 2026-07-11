# Prompt For Claude

Use this note as the implementation brief when coding backend changes.

## Senior Engineer Brief

You are working in the BloomKnights backend. Preserve the current server-side Gemini coaching flow and add schema support for manually entered user payments plus interest-aware debt tracking.

## Read First

1. [backend/src/index.ts](../src/index.ts)
2. [backend/src/prompt.ts](../src/prompt.ts)
3. [backend/src/schema.ts](../src/schema.ts)
4. [backend/src/types.ts](../src/types.ts)
5. [frontend/src/lib/firestore.ts](../../frontend/src/lib/firestore.ts)
6. [firestore.rules](../../firestore.rules)

## Preserve These Invariants

- Gemini stays server-side.
- Manual payments are backend-owned records.
- Firestore access remains owner-scoped.
- Coaching output stays structured and stable.
- New debt fields should support interest math without breaking existing debt screens.

## Build Order

1. Define the payment schema.
2. Define the debt-interest schema extensions.
3. Update backend types.
4. Update Firestore read/write helpers.
5. Update rules if a new collection or subcollection is added.
6. Only then decide whether the coaching prompt should consume the new data.

## Output Standard

Prefer small, explicit changes that are easy to validate. Do not add payment processor assumptions, and do not overload the existing transaction model if a distinct payment ledger is cleaner.
