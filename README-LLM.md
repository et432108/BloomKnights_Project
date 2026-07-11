

## 1. Project Philosophy & Core Pillars

This app is structured around a three-bucket financial methodology designed to reduce cognitive load for the user:

1. **Debt Repayment:** High-priority tracking for paying down balances (credit cards, student loans, etc.).
    
2. **Savings Goals:** Target-based tracking for future planning (emergency funds, milestones).
    
3. **Fun Money:** A strict, smaller percentage allocation of remaining income for guilt-free spending.
    

## 2. Updated Core Architecture Blueprint

```
                     ┌───────────────────────────┐
                     │   Expo Mobile Frontend    │
                     │  (React Native, TS, Expo) │
                     └─────────────┬─────────────┘
                                   │
                    Secure HTTPS   │  (Firebase Client Auth
                    Cloud Function │   for login/token)
                        Calls      │
                                   ▼
                     ┌───────────────────────────┐
                     │    Firebase Backend       │
                     │ (Auth, Firestore, Cloud)  │
                     └─────────────┬─────────────┘
                                   │
                       Secure API  │  Private API
                       Server Call │  Key Handshake
                                   ▼
                     ┌───────────────────────────┐
                     │     Gemini AI Engine      │
                     │  (Structured JSON, SDK)   │
                     └───────────────────────────┘
```

## 3. Technology Stack Breakdown

### Frontend (Mobile App & Shared Logic)

- **Framework:** **Expo (React Native)** using TypeScript.
    
- **Routing:** **Expo Router** (File-based navigation).
    
- **State Management:** **Zustand** (lightweight, decoupled store).
    
- **UI/Styling:** NativeWind (TailwindCSS for React Native) or Restyle.
    

### Backend & Infrastructure (Firebase Ecosystem)

- **Authentication:** **Firebase Auth** + Federated **Google OAuth** via `expo-auth-session`.
    
- **Database:** **Cloud Firestore** (NoSQL document database).
    
- **Serverless Logic:** **Cloud Functions for Firebase** (Node.js/TypeScript).
    
    - _CRITICAL:_ All Gemini API requests must pass through Cloud Functions. The frontend never directly exposes the Gemini API key.
        

### Artificial Intelligence & Data Parsing

- **AI Engine:** **Gemini API** via the official `@google/genai` SDK inside Cloud Functions.
    
- **Output Strategy:** Enforce `responseSchema` (Structured JSON outputs) on Gemini to return standardized financial coaching recommendations.
    

## 4. Financial Schema Adjustments (Firestore)

### `users` Collection

_Document ID: `{userId}`_

JSON

```
{
  "uid": "string",
  "email": "string",
  "displayName": "string",
  "createdAt": "timestamp",
  "monthlyIncome": "number",
  "allocations": {
    "debtTargetPercent": "number",
    "savingsTargetPercent": "number",
    "funMoneyPercent": "number"
  }
}
```

### `debts` Collection

_Document ID: `{debtId}`_

JSON

```
{
  "id": "string",
  "userId": "string",
  "name": "string (e.g., Credit Card A)",
  "totalBalance": "number",
  "interestRate": "number",
  "minimumPayment": "number",
  "currentProgress": "number"
}
```

### `savings_goals` Collection

_Document ID: `{goalId}`_

JSON

```
{
  "id": "string",
  "userId": "string",
  "title": "string",
  "targetAmount": "number",
  "currentAmount": "number",
  "targetDate": "timestamp"
}
```

### `transactions` Collection

_Document ID: `{transactionId}`_

JSON

```
{
  "id": "string",
  "userId": "string",
  "amount": "number",
  "type": "expense | income",
  "bucket": "debt | savings | fun_money | fixed_bills",
  "date": "timestamp",
  "description": "string"
}
```

## 5. Key LLM Guardrails & Operational Constraints

1. **Strict Security Separation:** Never write code that calls the Gemini API directly from the frontend mobile app. Maintain the Cloud Function middleware pattern.
    
2. **Context-Aware AI Coaching:** When instructing Gemini within Cloud Functions, pass the current state of the three buckets (`debts`, `savings_goals`, and `transactions` filtered by `bucket === 'fun_money'`). Prompt Gemini to deliver optimized allocation advice based on whether the user is exceeding their fun money allowance or falling behind on debt avalanche/snowball targets.
    
3. **Structural AI Responses:** Ensure Gemini prompts use `responseSchema` to output an array of actionable coaching items, formatted with an urgency level (`low`, `medium`, `high`) and a clear mathematical breakdown.