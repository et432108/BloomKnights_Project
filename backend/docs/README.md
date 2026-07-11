# BloomKnights Backend Notes

This folder is the backend-facing Obsidian note graph for Claude.

Start here:

1. [[prompt-for-claude]]
2. [[guardrails]]
3. [[data-contracts]]
4. [[coaching-flow]]
5. [[payments-ledger]]
6. [[debt-interest-model]]
7. [[gap-inventory]]

## Purpose

The backend currently does two things well:

- It serves coaching through a server-side Gemini Cloud Function.
- It owns Firestore data access for user finance records.

The implementation work that follows this note set should add a backend-owned payment ledger for user-entered payments, extend the debt schema so high-interest credit card payoff math is possible, and preserve the server-side Gemini boundary.

## Reading Order

Use this order when implementing or reviewing code:

1. Read [[prompt-for-claude]] for the senior-engineer brief.
2. Read [[guardrails]] for non-negotiable system constraints.
3. Read [[data-contracts]] for the current schema and note the proposed extensions.
4. Read [[coaching-flow]] to understand the existing Gemini path.
5. Read [[payments-ledger]] to design the user-entered payment history.
6. Read [[debt-interest-model]] to design interest-aware debt tracking.
7. Read [[gap-inventory]] to see the missing backend pieces that still need implementation.

## Source Files

- [backend/src/index.ts](../src/index.ts)
- [backend/src/prompt.ts](../src/prompt.ts)
- [backend/src/schema.ts](../src/schema.ts)
- [backend/src/types.ts](../src/types.ts)
- [firestore.rules](../../firestore.rules)
- [README-LLM.md](../../README-LLM.md)
