# Guardrails

These rules are the boundary conditions for every backend change.

## Non-Negotiables

- Gemini stays server-side in Cloud Functions.
- Payments are recorded and served through backend-owned Firestore structures.
- The frontend may submit payment data, but it should not define the canonical payment schema.
- Firestore security remains owner-scoped by `userId`.
- Structured AI output remains enforced through `responseSchema`.

## What Not To Do

- Do not call Gemini directly from the frontend.
- Do not model payments as an ephemeral frontend-only store.
- Do not mix manual payment history with coaching output.
- Do not add payment processor assumptions unless the codebase explicitly introduces one.

## Current Backend Boundary

The existing backend entrypoint is [backend/src/index.ts](../src/index.ts).

The coaching prompt and AI contract live in [backend/src/prompt.ts](../src/prompt.ts) and [backend/src/schema.ts](../src/schema.ts).
