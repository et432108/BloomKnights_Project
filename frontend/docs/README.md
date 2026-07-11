# BloomKnights Frontend Notes

This folder is the frontend-facing Obsidian note graph for Claude.

Start here:

1. [[data-loading]]
2. [[snapshot-flow]]
3. [[coaching-call]]
4. [[frontend-gap-inventory]]

## Purpose

The frontend assembles financial data from Firestore, builds the snapshot passed into the coaching function, and displays the structured AI response.

## Reading Order

Use this order when implementing or reviewing frontend code:

1. Read [[data-loading]] for Firestore reads and profile hydration.
2. Read [[snapshot-flow]] for building the coaching snapshot.
3. Read [[coaching-call]] for the callable function boundary.
4. Read [[frontend-gap-inventory]] for the frontend changes that depend on backend schema work.

## Source Files

- [frontend/src/lib/firebase.ts](../src/lib/firebase.ts)
- [frontend/src/lib/firestore.ts](../src/lib/firestore.ts)
- [frontend/src/store/useFinanceStore.ts](../src/store/useFinanceStore.ts)
- [frontend/src/services/coaching.ts](../src/services/coaching.ts)
- [frontend/src/services/auth.ts](../src/services/auth.ts)
- [frontend/src/types/index.ts](../src/types/index.ts)
- [frontend/app/(tabs)/coaching.tsx](../app/(tabs)/coaching.tsx)