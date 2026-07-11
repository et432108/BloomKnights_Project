import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { CoachingResponse, FinancialSnapshot } from "@/types";

/**
 * Invokes the `getCoaching` Cloud Function.
 *
 * CRITICAL (README §5.1): the Gemini API key lives only inside the Cloud
 * Function. The frontend passes a financial snapshot and receives structured
 * coaching items back — it never talks to Gemini directly.
 */
const callGetCoaching = httpsCallable<FinancialSnapshot, CoachingResponse>(
  functions,
  "getCoaching"
);

export async function getCoaching(
  snapshot: FinancialSnapshot
): Promise<CoachingResponse> {
  const result = await callGetCoaching(snapshot);
  return result.data;
}
