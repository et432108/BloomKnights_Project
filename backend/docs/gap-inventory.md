# Gap Inventory

This note lists the backend pieces that still need implementation.

## Missing Today

- A schema for manually entered debt payments.
- A backend-owned way to list payments on the website.
- Interest-aware debt fields for APR and accrual timing.
- A payoff projection path that can estimate when a debt will be paid off.

## What Claude Should Infer

- Payment records should be distinct from spending transactions.
- Debt records need enough metadata to support payoff math.
- The backend should own the calculation logic, not the frontend.
