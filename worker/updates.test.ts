import { describe, expect, it } from "vitest";
import { normalizeLoveMessage } from "./love";
import { normalizeUpdateText } from "./updates";

describe("normalizeLoveMessage", () => {
  it("trims and caps at 60 chars, defaulting to empty", () => {
    expect(normalizeLoveMessage("  Miss you!  ")).toBe("Miss you!");
    expect(normalizeLoveMessage(undefined)).toBe("");
    expect(normalizeLoveMessage("x".repeat(100))).toHaveLength(60);
  });
});

describe("normalizeUpdateText", () => {
  it("accepts 1..200 chars after trim", () => {
    expect(normalizeUpdateText(" hello ")).toBe("hello");
    expect(normalizeUpdateText("")).toBeNull();
    expect(normalizeUpdateText("   ")).toBeNull();
    expect(normalizeUpdateText("x".repeat(201))).toBeNull();
    expect(normalizeUpdateText("x".repeat(200))).toBe("x".repeat(200));
  });
});
