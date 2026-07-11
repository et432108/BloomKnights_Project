# Firestore Rules — `payments` collection

> **Status: APPLIED.** The owner-scoped `payments` rule below has been added to
> the root [firestore.rules](../../firestore.rules), and the supporting composite
> indexes to [firestore.indexes.json](../../firestore.indexes.json). This was done
> with explicit approval to touch root files *for this backend purpose only*. The
> only remaining step is to **deploy** (see "Apply & Verify" below). This note is
> kept as the design record.

## Context

The [[payments-ledger]] introduces a top-level `payments` collection. Every
`Payment` carries a `userId`, and the backend
([backend/src/payments.ts](../src/payments.ts)) already filters every read by
`userId` as defense in depth. The rules must enforce the same owner scoping so
the collection cannot be read or written cross-user.

## Rule To Add

Insert this block inside `service cloud.firestore` →
`match /databases/{database}/documents`, alongside the existing `debts`,
`savings_goals`, and `transactions` matches. It mirrors their `isOwner` pattern
exactly:

```
match /payments/{paymentId} {
  allow read:          if isOwner(resource.data.userId);
  allow create:        if isOwner(request.resource.data.userId);
  allow update, delete: if isOwner(resource.data.userId);
}
```

## Resulting File (for reference)

After the change, the root `firestore.rules` document body should read:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }

    match /users/{userId} {
      allow read, write: if isOwner(userId);
    }

    match /debts/{debtId} {
      allow read: if isOwner(resource.data.userId);
      allow create: if isOwner(request.resource.data.userId);
      allow update, delete: if isOwner(resource.data.userId);
    }

    match /savings_goals/{goalId} {
      allow read: if isOwner(resource.data.userId);
      allow create: if isOwner(request.resource.data.userId);
      allow update, delete: if isOwner(resource.data.userId);
    }

    match /transactions/{transactionId} {
      allow read: if isOwner(resource.data.userId);
      allow create: if isOwner(request.resource.data.userId);
      allow update, delete: if isOwner(resource.data.userId);
    }

    match /payments/{paymentId} {
      allow read: if isOwner(resource.data.userId);
      allow create: if isOwner(request.resource.data.userId);
      allow update, delete: if isOwner(resource.data.userId);
    }
  }
}
```

## Apply & Verify (run from the repo root, outside `backend/`)

```bash
firebase deploy --only firestore:rules
```

## Notes

- The `payments` query helpers need composite indexes (`userId + paymentDate`
  for list-by-user, and `userId + debtId + paymentDate` for list-by-debt). Both
  have been added to [firestore.indexes.json](../../firestore.indexes.json) and
  deploy via `firebase deploy --only firestore:indexes`.
- Consider field-level validation in rules later (e.g. `request.resource.data.amount > 0`)
  to complement the backend's `validatePaymentInput`.
