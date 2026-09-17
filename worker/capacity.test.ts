import { describe, expect, it } from "vitest";
import { formatCapacityForPush, normalizeCapacityLevel } from "./capacity";

describe("normalizeCapacityLevel", () => {
  it("accepts integers 0..100", () => {
    expect(normalizeCapacityLevel(0)).toBe(0);
    expect(normalizeCapacityLevel(100)).toBe(100);
    expect(normalizeCapacityLevel(42)).toBe(42);
  });

  it("rejects non-integers and out-of-range values", () => {
    expect(normalizeCapacityLevel(-1)).toBeNull();
    expect(normalizeCapacityLevel(101)).toBeNull();
    expect(normalizeCapacityLevel(4.5)).toBeNull();
    expect(normalizeCapacityLevel("50")).toBeNull();
    expect(normalizeCapacityLevel(null)).toBeNull();
  });
});

describe("formatCapacityForPush", () => {
  it("includes the partner name", () => {
    const { title, body } = formatCapacityForPush("Alex", 80);
    expect(title).toContain("Alex");
    expect(body.length).toBeGreaterThan(0);
  });
});
