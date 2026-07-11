# Data Loading

This note documents how the frontend reads Firestore and hydrates app state.

## Core Data Sources

- `users`
- `debts`
- `savings_goals`
- `transactions`

## Relevant Files

- [frontend/src/lib/firestore.ts](../src/lib/firestore.ts)
- [frontend/src/store/useAuthStore.ts](../src/store/useAuthStore.ts)
- [frontend/src/store/useFinanceStore.ts](../src/store/useFinanceStore.ts)

## What The Frontend Owns

- Fetching the user's profile.
- Fetching debts, savings goals, and transactions.
- Converting Firestore timestamps into ISO strings.
- Keeping local state in Zustand.
