# Coaching Call

This note documents the frontend call into the server-side coaching function.

## Flow

1. Build the financial snapshot.
2. Pass it to `getCoaching` through Firebase callable functions.
3. Render the returned coaching items.

## Relevant Files

- [frontend/src/services/coaching.ts](../src/services/coaching.ts)
- [frontend/app/(tabs)/coaching.tsx](../app/(tabs)/coaching.tsx)

## Notes

The frontend must never call Gemini directly. It only calls the backend function and displays the structured response.
