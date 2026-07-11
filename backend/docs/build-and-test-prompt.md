# Build & Test Prompt (for Claude)

> Self-contained execution brief for implementing the backend note-set with full
> Jest coverage. Pairs with [[prompt-for-claude]] (the senior brief) and
> [[guardrails]] (the hard constraints). Read those first, then follow this.

---

## Role

You are a senior backend engineer on the **BloomKnights Cloud Functions** service
(`backend/`). Your job: implement the work described in `backend/docs/` **exactly
as specified**, and prove every piece works with **Jest unit and integration
tests**. Correctness is demonstrated by green test output, not by assertion.

## Absolute Scope Boundary — read this twice

- **Only create or modify files inside `backend/`.** Nothing else. Not
  `frontend/`, not `firestore.rules`, not root configs.
- These files are referenced by the docs but are **READ-ONLY reference**:
  `../../firestore.rules`, `../../frontend/src/lib/firestore.ts`,
  `../../README-LLM.md`. Read them to understand contracts; never edit them.
- The docs require a Firestore **rules** change for the new `payments`
  collection ([[guardrails]], [[prompt-for-claude]]). `firestore.rules` is at the
  repo root — **out of scope**. Do **not** edit it. Instead capture the exact
  owner-scoped rule block as an in-backend artifact:
  `backend/docs/proposed-firestore-rules.md`, mirroring the existing owner
  checks. Call this out explicitly in your final summary as a follow-up the human
  must apply outside `backend/`.

## Read First — in this exact order, follow to the letter

1. `docs/README.md`
2. `docs/prompt-for-claude.md`
3. `docs/guardrails.md`
4. `docs/data-contracts.md`
5. `docs/coaching-flow.md`
6. `docs/payments-ledger.md`
7. `docs/debt-interest-model.md`

Then the current implementation: `src/index.ts`, `src/types.ts`, `src/schema.ts`,
`src/prompt.ts`. Do not start coding until you can restate the invariants below
from memory.

## Non-Negotiable Invariants (from [[guardrails]] and [[coaching-flow]])

- **Gemini stays server-side.** Never expose `GEMINI_API_KEY`, never call the
  model from anything a client can reach.
- **The coaching contract is FROZEN.** `CoachingResponse` (in `src/types.ts`) and
  `coachingResponseSchema` (in `src/schema.ts`) must remain byte-for-byte
  equivalent unless a doc *explicitly* tells you to extend them. New payment /
  debt data must not alter coaching output shape.
- **Payments are backend-owned Firestore records**, owner-scoped by `userId`.
  Not an ephemeral frontend store, not a generic `Transaction`.
- **Firestore access stays owner-scoped by `userId`.**
- **Structured AI output stays enforced** via `responseSchema`.
- **Backwards compatibility:** every new `Debt` field is **optional** so existing
  debt records and screens keep type-checking and rendering.

## Work To Implement — build order from [[prompt-for-claude]]

Do these in order; do not skip ahead.

1. **Payment schema + `Payment` type.** Fields per [[data-contracts]] /
   [[payments-ledger]]: `id`, `userId`, `debtId`, `amount`, `paymentDate`,
   `method`, `note`, `principalPortion`, `interestPortion`, `createdAt`,
   `updatedAt`. Model as a **top-level `payments` collection** (the doc's
   recommendation, since the primary query is "all payments for a user").
2. **Interest-aware debt fields**, added as **optional** to `Debt`:
   `aprPercent`, `compoundingFrequency`, `billingCycleStartDate`,
   `billingCycleEndDate`, `paymentDueDate`, `lastInterestAccruedAt`,
   `lastStatementBalance`, `statementCloseBalance`. Keep all existing fields.
3. **Update `src/types.ts`** — the single source of truth for backend types.
4. **Backend Firestore helpers for payments** (new module, e.g.
   `src/payments.ts`) using `firebase-admin`: create, get-by-id, list-by-user,
   list-by-debt. Stamp `createdAt`/`updatedAt`. Backend owns these — do **not**
   touch the frontend's `firestore.ts`.
5. **Interest math** (new pure module, e.g. `src/interest.ts`): deterministic
   functions with no I/O — `splitPaymentPrincipalInterest`,
   `interestForCycle`, `isHighInterest`, projected interest/payoff helpers.
   Inject "now"/dates as parameters; never read the wall clock inside logic.
6. **Rules artifact** — produce `docs/proposed-firestore-rules.md` (see Scope
   Boundary). Do not edit the root rules file.
7. **Coaching prompt** — default is **do not change it**. Only revisit
   `src/prompt.ts` / `src/schema.ts` if a doc explicitly directs the coaching
   flow to consume the new data. If unsure, leave the contract frozen.

## Testing Requirements (Jest) — mandatory

Set up Jest for this **TypeScript + CommonJS** Cloud Functions project:

- Add devDeps: `jest`, `ts-jest`, `@types/jest`, `firebase-functions-test`.
- Create `jest.config.js`: `ts-jest` preset, `testEnvironment: "node"`,
  coverage enabled.
- Add scripts: `"test": "jest"`, `"test:coverage": "jest --coverage"`.
- **Keep `npm run build` clean:** test files must not be emitted to `lib/`. Put
  tests in `src/__tests__/` (or `*.test.ts` beside source) and add
  `"exclude": ["**/*.test.ts", "**/__tests__/**"]` to `tsconfig.json` so `tsc`
  ignores them while Jing still runs them.
- **No real network, no real Firebase project.** Mock everything external.

**Unit tests (pure logic):**

- `prompt.ts` → `buildCoachingPrompt`: budget arithmetic, "OVER" vs "within"
  fun-money wording, debt/savings line formatting, empty-array cases.
- `interest.ts`: principal/interest split for known inputs, high-interest
  threshold boundary, cycle interest math, edge cases (0% APR, $0 balance,
  guards against negative amounts).
- `schema.ts`: assert `coachingResponseSchema` still has the exact required keys
  and enums — a regression guard so the coaching contract can't drift silently.
- Payment validation helper: rejects missing `userId`/`debtId`, `amount <= 0`,
  bad dates.

**Integration tests (behavior with dependencies mocked):**

- `getCoaching` callable, wrapped with `firebase-functions-test` (offline mode):
  - no `auth` → throws `HttpsError("unauthenticated")`.
  - malformed snapshot (missing `monthlyIncome`) → `HttpsError("invalid-argument")`.
  - happy path: `jest.mock("@google/genai")` so `generateContent` returns JSON
    text → returns a valid `CoachingResponse`; assert `responseSchema`,
    `responseMimeType`, and a snapshot-derived prompt were passed.
  - empty model text → `HttpsError("internal")`.
  - model throws → wrapped `HttpsError("internal")`.
- Payments data-access: mock `firebase-admin` (`initializeApp` noop, stub
  `firestore()`), assert `create` writes an **owner-scoped** doc with timestamps,
  and that list-by-user / list-by-debt apply the right `where` filters.

**Mocking guidance:** `jest.mock("@google/genai")` to control the model;
`jest.mock("firebase-admin/app")` + a firestore stub; `firebase-functions-test`
to build `{ auth: { uid } }` contexts and wrap `onCall`. If you choose the
Firestore emulator instead of stubbing, guard those tests on
`FIRESTORE_EMULATOR_HOST` and skip when it's absent (keep the suite green offline).

## Definition of Done

- `npm run build` passes; **no test files emitted to `lib/`**.
- `npm test` passes; strong coverage on new logic (target ~90%+ on
  `interest.ts`, `payments.ts`, `prompt.ts`).
- **No file outside `backend/` changed.**
- Coaching contract (`CoachingResponse` + `coachingResponseSchema`) unchanged,
  unless a doc explicitly required otherwise.
- New `Debt` fields are optional; existing type consumers unaffected.
- Required rules change captured in `docs/proposed-firestore-rules.md` and
  flagged as an out-of-scope follow-up.
- Final summary lists: files added/changed, test count, coverage numbers, and the
  root `firestore.rules` follow-up note.

## Verification — run these, report real output

```bash
cd backend
npm install
npm run build
npm test -- --coverage
```

Do not claim success without green output. If something fails, fix it and re-run.

## Quality Standards

- Small, explicit, well-commented changes that match the existing code style.
- Deterministic tests: no network, no wall-clock flakiness (inject dates).
- No payment-processor assumptions. Do not overload `Transaction`.
