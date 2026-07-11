import { Type } from "@google/genai";

/**
 * Structured-output schema enforced on Gemini (README §5.3 — Structural AI
 * Responses). Gemini must return an array of actionable coaching items, each
 * with an urgency level and a clear mathematical breakdown.
 */
export const coachingResponseSchema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: "Short, action-oriented headline for the advice.",
          },
          urgency: {
            type: Type.STRING,
            enum: ["low", "medium", "high"],
            description: "How time-sensitive acting on this item is.",
          },
          recommendation: {
            type: Type.STRING,
            description: "The concrete action the user should take.",
          },
          mathBreakdown: {
            type: Type.STRING,
            description:
              "Plain-language arithmetic justifying the recommendation, e.g. '$4,000 x 22% = $880/yr interest'.",
          },
          bucket: {
            type: Type.STRING,
            enum: ["debt", "savings", "fun_money", "fixed_bills"],
            description: "Which of the three buckets this item concerns.",
          },
        },
        required: [
          "title",
          "urgency",
          "recommendation",
          "mathBreakdown",
          "bucket",
        ],
      },
    },
  },
  required: ["items"],
};
