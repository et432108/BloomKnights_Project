# BloomKnights 🛡️🌱

A three-bucket personal-finance coach. Conquer **Debt**, grow **Savings**, and
spend **Fun Money** guilt-free — with AI coaching powered by Gemini.

Built to the blueprint in [README-LLM.md](./README-LLM.md).

## Stack

| Layer | Choice |
| --- | --- |
| Mobile | Expo (React Native) + TypeScript |
| Routing | Expo Router (file-based) |
| State | Zustand |
| Styling | NativeWind (Tailwind for RN) |
| Auth | Firebase Auth + Google OAuth (`expo-auth-session`) |
| Data | Cloud Firestore |
| Serverless | Cloud Functions (Node/TS) |
| AI | Gemini via `@google/genai`, **server-side only** |

> **Security invariant (README-LLM §5.1):** the app never calls Gemini
> directly. All Gemini traffic flows through the `getCoaching` Cloud Function,
> where the API key lives as a Firebase secret.

## Project layout

```
app/                     Expo Router screens
  _layout.tsx            root: global CSS + auth subscription
  index.tsx              auth gate → tabs or login
  (auth)/login.tsx       Google sign-in
  (tabs)/                Dashboard · Debts · Savings · Coach
src/
  types/                 shared domain types (Firestore schema §4)
  lib/                   firebase init, firestore DAL, formatters
  store/                 Zustand stores (auth, finance)
  services/              auth + coaching (calls Cloud Function)
  components/            Card, ProgressBar
functions/               Cloud Functions middleware
  src/index.ts           getCoaching callable — the only Gemini caller
  src/schema.ts          enforced responseSchema
  src/prompt.ts          context-aware three-bucket prompt
firestore.rules          owner-scoped access rules
```

## Setup

1. **Install app deps**
   ```bash
   npm install
   ```
2. **Install function deps**
   ```bash
   npm --prefix functions install
   ```
3. **Configure Firebase** — create a project, enable Auth (Google), Firestore,
   and Cloud Functions. Fill client values into `app.json > expo.extra` (see
   `.env.example`).
4. **Set the Gemini secret** (server-only):
   ```bash
   firebase functions:secrets:set GEMINI_API_KEY
   ```
5. **Run**
   ```bash
   npm start                 # Expo dev server
   firebase emulators:start  # or deploy: firebase deploy --only functions
   ```

## The three buckets

1. **Debt Repayment** — avalanche/snowball payoff tracking.
2. **Savings Goals** — target-based progress toward milestones.
3. **Fun Money** — a strict, smaller guilt-free allowance.

The **Coach** tab bundles all three into a `FinancialSnapshot`, sends it to
`getCoaching`, and renders Gemini's structured advice — each item carrying an
urgency level (`low`/`medium`/`high`) and a plain math breakdown.
