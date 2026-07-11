# Coaching Flow

This note documents the existing Gemini coaching path.

## Runtime Path

The Cloud Function entrypoint is [backend/src/index.ts](../src/index.ts).

The function flow is:

1. Require authentication.
2. Validate the incoming financial snapshot.
3. Build the coaching prompt from the current debt, savings, and fun-money state.
4. Call Gemini from the server.
5. Enforce structured JSON output with `responseSchema`.
6. Return a `CoachingResponse`.

## What The Prompt Does

[backend/src/prompt.ts](../src/prompt.ts) translates the user snapshot into coaching instructions.

It currently reasons about:

- debt payoff using avalanche/snowball logic,
- savings goal progress,
- fun-money overspend,
- and the numeric breakdown for each recommendation.

## What The Schema Does

[backend/src/schema.ts](../src/schema.ts) constrains Gemini to return:

- a title,
- an urgency level,
- a recommendation,
- a plain-language math breakdown,
- and a bucket tag.

## Why This Matters For New Work

The new payments ledger and debt-interest schema should not change the coaching contract unless the coaching prompt is explicitly updated to use them.
