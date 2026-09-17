import { describe, expect, it } from "vitest";
import {
  isQuestionType,
  normalizeQuestionText,
  parseChoiceQuestionOptions,
  parseQuestionPayload,
  normalizeChoiceAnswerValue,
  serializeQuestionPayload,
} from "./questions";

describe("isQuestionType", () => {
  it("accepts choice and scale only", () => {
    expect(isQuestionType("choice")).toBe(true);
    expect(isQuestionType("scale")).toBe(true);
    expect(isQuestionType("text")).toBe(false);
    expect(isQuestionType(null)).toBe(false);
    expect(isQuestionType(undefined)).toBe(false);
  });
});

describe("normalizeQuestionText", () => {
  it("trims and rejects empty / too-long text", () => {
    expect(normalizeQuestionText("  What for dinner?  ")).toBe("What for dinner?");
    expect(normalizeQuestionText("")).toBeNull();
    expect(normalizeQuestionText("   ")).toBeNull();
    expect(normalizeQuestionText(undefined)).toBeNull();
    expect(normalizeQuestionText("x".repeat(201))).toBeNull();
    expect(normalizeQuestionText("x".repeat(200))).toBe("x".repeat(200));
  });
});

describe("parseChoiceQuestionOptions", () => {
  it("parses valid JSON arrays and drops blanks", () => {
    expect(parseChoiceQuestionOptions(null)).toEqual([]);
    expect(parseChoiceQuestionOptions("not-json")).toEqual([]);
    expect(parseChoiceQuestionOptions(JSON.stringify("nope"))).toEqual([]);
    expect(
      parseChoiceQuestionOptions(JSON.stringify([" A ", "", "B"])),
    ).toEqual(["A", "B"]);
  });
});

describe("serialize / parse question payload", () => {
  it("round-trips a choice payload", () => {
    const json = serializeQuestionPayload({ type: "choice", options: [" A ", "B"] });
    expect(parseQuestionPayload(json)).toEqual({ type: "choice", options: ["A", "B"] });
  });

  it("serializes scale without options", () => {
    const json = serializeQuestionPayload({ type: "scale", options: ["ignored"] });
    expect(parseQuestionPayload(json)).toEqual({ type: "scale", options: null });
  });

  it("rejects choice payloads with fewer than 2 options", () => {
    expect(parseQuestionPayload(JSON.stringify({ type: "choice", options: ["only"] }))).toBeNull();
    expect(parseQuestionPayload(JSON.stringify({ type: "nope" }))).toBeNull();
    expect(parseQuestionPayload(null)).toBeNull();
  });
});

describe("normalizeChoiceAnswerValue", () => {
  it("accepts listed options and custom answers within limit", () => {
    expect(normalizeChoiceAnswerValue("A", ["A", "B"])).toBe("A");
    expect(normalizeChoiceAnswerValue(" custom ", ["A", "B"])).toBe("custom");
    expect(normalizeChoiceAnswerValue("", ["A", "B"])).toBeNull();
    expect(normalizeChoiceAnswerValue(42, ["A", "B"])).toBeNull();
    expect(normalizeChoiceAnswerValue("x".repeat(201), ["A", "B"])).toBeNull();
  });
});
