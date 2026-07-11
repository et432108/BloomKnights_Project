# Prompt For Claude

Use this note to generate the docs tree for BloomKnights before writing implementation code.

## Goal

Create two Obsidian note trees:

1. `backend/docs` for backend-owned payments, interest math, payoff timing, and Gemini guardrails.
2. `frontend/docs` for frontend data access, snapshot assembly, and the coaching function call.

## Senior Engineer Brief

You are working as a senior software engineer. Read the existing backend and frontend code first, identify the missing schema and flow gaps, and turn those gaps into short linked notes that Claude can use as implementation scaffolding.

## Read First

Backend sources:

1. [backend/src/index.ts](../src/index.ts)
2. [backend/src/prompt.ts](../src/prompt.ts)
3. [backend/src/schema.ts](../src/schema.ts)
4. [backend/src/types.ts](../src/types.ts)
5. [firestore.rules](../../firestore.rules)

Frontend sources:

1. [frontend/src/lib/firebase.ts](../../frontend/src/lib/firebase.ts)
2. [frontend/src/lib/firestore.ts](../../frontend/src/lib/firestore.ts)
3. [frontend/src/store/useFinanceStore.ts](../../frontend/src/store/useFinanceStore.ts)
4. [frontend/src/services/coaching.ts](../../frontend/src/services/coaching.ts)
5. [frontend/src/services/auth.ts](../../frontend/src/services/auth.ts)
6. [frontend/src/types/index.ts](../../frontend/src/types/index.ts)

## Backend Notes To Create

Create or update these notes in `backend/docs`:

- `README.md` for the backend hub and reading order.
- `guardrails.md` for non-negotiable backend boundaries.
- `data-contracts.md` for current types plus the missing payment and debt-interest fields.
- `coaching-flow.md` for the existing Gemini call path.
- `payments-ledger.md` for user-entered payments that appear on the website.
- `debt-interest-model.md` for APR, accrual timing, and payoff calculations.
- `gap-inventory.md` for the missing backend pieces that still need implementation.

## Frontend Notes To Create

Create these notes in `frontend/docs`:

- `README.md` for the frontend hub and reading order.
- `data-loading.md` for Firestore reads and state hydration.
- `snapshot-flow.md` for building the coaching snapshot.
- `coaching-call.md` for invoking the callable function and rendering the response.
- `frontend-gap-inventory.md` for frontend work that depends on the backend schema.

## Required Content

- Keep backend notes backend-only.
- Keep frontend notes frontend-only.
- Use relative links only.
- Preserve the server-side Gemini boundary.
- Treat manual payments as user-entered debt payment records, not spending transactions.
- Include enough debt fields to calculate payoff timing and interest accrual.

## Build Order

1. Write the two hub notes first.
2. Add the backend schema and gap notes.
3. Add the frontend flow notes.
4. Link the notes together inside each tree.
5. Verify that no backend note points to frontend implementation details.

## Output Standard

Keep the notes short, concrete, and implementation-oriented. Write like a senior engineer handing another engineer a clean design brief, not like a marketing doc.
