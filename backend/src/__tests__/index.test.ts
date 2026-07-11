import type { CallableRequest } from "firebase-functions/v2/https";
import type { FinancialSnapshot } from "../types";

// --- Mocks: keep Gemini and admin init out of the test entirely. ---
const mockGenerateContent = jest.fn();

jest.mock("firebase-admin/app", () => ({ initializeApp: jest.fn() }));

jest.mock("@google/genai", () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
  // schema.ts (imported transitively) reads these at module load.
  Type: { OBJECT: "OBJECT", ARRAY: "ARRAY", STRING: "STRING" },
}));

import { GoogleGenAI } from "@google/genai";
import { HttpsError } from "firebase-functions/v2/https";
import { handleCoaching } from "../index";
import { coachingResponseSchema } from "../schema";

const snapshot: FinancialSnapshot = {
  monthlyIncome: 5000,
  allocations: {
    debtTargetPercent: 50,
    savingsTargetPercent: 40,
    funMoneyPercent: 10,
  },
  debts: [],
  savingsGoals: [],
  funMoneyTransactions: [],
};

function request(over: Partial<CallableRequest> = {}): CallableRequest {
  return { auth: { uid: "user-1" }, data: snapshot, ...over } as CallableRequest;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("handleCoaching", () => {
  it("rejects unauthenticated callers", async () => {
    await expect(
      handleCoaching(request({ auth: undefined }), "key")
    ).rejects.toMatchObject({ code: "unauthenticated" });
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("rejects a malformed snapshot", async () => {
    await expect(
      handleCoaching(request({ data: {} }), "key")
    ).rejects.toMatchObject({ code: "invalid-argument" });
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("returns structured coaching on the happy path", async () => {
    const items = [
      {
        title: "Attack the Visa",
        urgency: "high",
        recommendation: "Pay $400 toward the Visa this month.",
        mathBreakdown: "$4,000 x 22% = $880/yr interest.",
        bucket: "debt",
      },
    ];
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify({ items }) });

    const result = await handleCoaching(request(), "secret-key");

    expect(result).toEqual({ items });
    // Gemini was called server-side with the injected key and enforced schema.
    expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: "secret-key" });
    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg.config.responseSchema).toBe(coachingResponseSchema);
    expect(callArg.config.responseMimeType).toBe("application/json");
    expect(callArg.contents).toContain("Monthly income: $5000");
  });

  it("defaults to an empty items array when the model omits it", async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify({}) });
    await expect(handleCoaching(request(), "key")).resolves.toEqual({
      items: [],
    });
  });

  it("maps an empty model response to an internal error", async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: "" });
    await expect(handleCoaching(request(), "key")).rejects.toMatchObject({
      code: "internal",
    });
  });

  it("wraps model failures as an internal error", async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error("rate limited"));
    await expect(handleCoaching(request(), "key")).rejects.toMatchObject({
      code: "internal",
    });
  });

  it("throws HttpsError instances (not raw errors)", async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: "" });
    await expect(handleCoaching(request(), "key")).rejects.toBeInstanceOf(
      HttpsError
    );
  });
});
