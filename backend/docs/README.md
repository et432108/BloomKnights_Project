# BloomKnights Backend Notes

This folder is the backend-facing Obsidian note graph for Claude.

Start here:

1. [[prompt-for-claude]]
2. [[guardrails]]
3. [[data-contracts]]
4. [[coaching-flow]]
5. [[debt-interest-model]]
6. [[gap-inventory]]
7. [user-data-schema](user-data-schema.md)

## Purpose

The backend currently does two things well:

- It serves coaching through a server-side Gemini Cloud Function.
- It owns Firestore data access for user finance records.

There is no user-entered payment ledger — the app instead computes a
month-by-month payoff plan (see `frontend/src/lib/debt.ts#buildPayoffPlan`)
that tells the user how much to put toward each debt, rather than asking
them to log payments.

## Reading Order

Use this order when implementing or reviewing code:

1. Read [[prompt-for-claude]] for the senior-engineer brief.
2. Read [[guardrails]] for non-negotiable system constraints.
3. Read [[data-contracts]] for the current schema and note the proposed extensions.
4. Read [[coaching-flow]] to understand the existing Gemini path.
5. Read [[debt-interest-model]] to design interest-aware debt tracking.
6. Read [[gap-inventory]] to see the missing backend pieces that still need implementation.
7. Read [user-data-schema](user-data-schema.md) for the current per-user Firestore schema (debts, fixed_expenses, savings_goals, transactions).

## Source Files

- [backend/src/index.ts](../src/index.ts)
- [backend/src/prompt.ts](../src/prompt.ts)
- [backend/src/schema.ts](../src/schema.ts)
- [backend/src/types.ts](../src/types.ts)
- [firestore.rules](../../firestore.rules)
- [README-LLM.md](../../README-LLM.md)
