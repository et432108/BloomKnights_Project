# Frontend Gap Inventory

This note lists frontend work that depended on backend schema changes, and its
current status. The backend `payments` contract and interest-aware `Debt` fields
now exist, so the frontend work below is implemented — see [[payments-ui]].

## Implemented

- ✅ Showing user-entered debt payments (record + history on the debt detail).
- ✅ Displaying payment history under each debt.
- ✅ Payoff estimates and interest-aware guidance from `src/lib/debt.ts`.
- ✅ Entering a debt payment (form on the debt detail screen).
- ✅ Payoff timing + interest summary on the list and detail screens.
- ✅ Coaching stays compatible — payments are not added to the snapshot.

## Remaining / Future

- Server-side write path for payments (see the contract assumption in
  [[payments-ui]]); today the client writes directly to the owner-scoped
  collection.
- Backend-computed principal/interest split surfaced per payment (left unset by
  the client for now).
- Optional richer debt inputs (billing cycle, due date) once entry UI needs them.

# Frontend Gap Inventory

This note lists frontend work that depends on backend schema changes.

## Depends On Backend

- Showing user-entered debt payments.
- Displaying payment history under each debt.
- Showing payoff estimates once the backend exposes enough interest data.

## Frontend Work Still Needed

- Add UI for entering a debt payment.
- Add UI for listing payment history.
- Add UI for displaying payoff timing and interest summaries.
- Keep the coaching screen compatible with the evolving snapshot.
