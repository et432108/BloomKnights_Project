import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase-admin/app";
import {
  CallableRequest,
  HttpsError,
  onCall,
} from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { buildCoachingPrompt } from "./prompt";
import { coachingResponseSchema } from "./schema";
import type { CoachingResponse, FinancialSnapshot } from "./types";

initializeApp();

/**
 * The Gemini API key is stored as a Firebase secret and injected only into this
 * function's runtime (README §5.1). It never reaches the client.
 *
 * Set it once with:  firebase functions:secrets:set GEMINI_API_KEY
 */
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

const MODEL = "gemini-2.0-flash";

/**
 * Core coaching logic, split out from the `onCall` wrapper so it can be
 * integration-tested directly with a plain request object and a mocked Gemini
 * client. Behavior is identical to the previous inline handler.
 *
 * This is the middleware boundary from the architecture blueprint: the mobile
 * app sends a FinancialSnapshot, we call Gemini server-side with an enforced
 * responseSchema, and return structured coaching items.
 */
export async function handleCoaching(
  request: CallableRequest,
  apiKey: string
): Promise<CoachingResponse> {
  // Auth guard — only signed-in users may request coaching.
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "You must be signed in to request coaching."
    );
  }

  const snapshot = request.data as FinancialSnapshot;
  if (!snapshot || typeof snapshot.monthlyIncome !== "number") {
    throw new HttpsError("invalid-argument", "Malformed financial snapshot.");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: buildCoachingPrompt(snapshot),
      config: {
        // Enforce structured JSON output (README §5.3).
        responseMimeType: "application/json",
        responseSchema: coachingResponseSchema,
        temperature: 0.4,
      },
    });

    const text = response.text;
    if (!text) {
      throw new HttpsError("internal", "Gemini returned an empty response.");
    }

    const parsed = JSON.parse(text) as CoachingResponse;
    return { items: parsed.items ?? [] };
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    throw new HttpsError(
      "internal",
      `Coaching generation failed: ${(err as Error).message}`
    );
  }
}

/**
 * getCoaching — callable Cloud Function. Injects the server-only Gemini secret
 * and delegates to {@link handleCoaching}.
 */
export const getCoaching = onCall(
  { secrets: [GEMINI_API_KEY], region: "us-central1" },
  (request): Promise<CoachingResponse> =>
    handleCoaching(request, GEMINI_API_KEY.value())
);
