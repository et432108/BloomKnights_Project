import { Type } from "@google/genai";
import { coachingResponseSchema } from "../schema";

/**
 * Regression guard: the coaching contract is FROZEN (guardrails). If the new
 * payments/interest work ever alters the AI output shape, these assertions fail
 * loudly rather than letting the contract drift silently.
 */
describe("coachingResponseSchema (frozen coaching contract)", () => {
  const item: any = coachingResponseSchema.properties.items.items;

  it("is an object requiring an items array", () => {
    expect(coachingResponseSchema.type).toBe(Type.OBJECT);
    expect(coachingResponseSchema.required).toEqual(["items"]);
    expect(coachingResponseSchema.properties.items.type).toBe(Type.ARRAY);
  });

  it("requires exactly the five coaching-item fields", () => {
    expect(item.required).toEqual([
      "title",
      "urgency",
      "recommendation",
      "mathBreakdown",
      "bucket",
    ]);
    expect(Object.keys(item.properties).sort()).toEqual(
      ["bucket", "mathBreakdown", "recommendation", "title", "urgency"].sort()
    );
  });

  it("constrains the urgency and bucket enums", () => {
    expect(item.properties.urgency.enum).toEqual(["low", "medium", "high"]);
    expect(item.properties.bucket.enum).toEqual([
      "debt",
      "savings",
      "fun_money",
      "fixed_bills",
    ]);
  });
});
