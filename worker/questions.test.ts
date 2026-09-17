import { describe, expect, it } from "vitest";
import { normalizeAnswerValue } from "./questions";

describe("normalizeAnswerValue", () => {
  it("validates scale answers 1..5", () => {
    expect(normalizeAnswerValue("scale", "3", null)).toEqual({ ok: true, value: "3" });
    expect(normalizeAnswerValue("scale", "6", null).ok).toBe(false);
    expect(normalizeAnswerValue("scale", "", null).ok).toBe(false);
  });

  it("validates choice answers against options", () => {
    const options = JSON.stringify(["Pizza", "Sushi"]);
    expect(normalizeAnswerValue("choice", "Pizza", options)).toEqual({
      ok: true,
      value: "Pizza",
    });
    // custom answers are allowed
    expect(normalizeAnswerValue("choice", "Tacos", options).ok).toBe(true);
    expect(normalizeAnswerValue("choice", "", options).ok).toBe(false);
  });

  it("rejects unknown question types", () => {
    expect(normalizeAnswerValue("text", "x", null).ok).toBe(false);
  });
});
