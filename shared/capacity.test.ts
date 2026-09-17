import { describe, expect, it } from "vitest";
import {
  capacityLevelColor,
  formatCapacityBody,
  parseCapacityLevel,
  serializeCapacityLevel,
} from "./capacity";

describe("formatCapacityBody", () => {
  it("buckets levels into copy", () => {
    expect(formatCapacityBody(0)).toMatch(/gentleness/);
    expect(formatCapacityBody(50)).toMatch(/Limited/);
    expect(formatCapacityBody(75)).toBe("Doing okay");
    expect(formatCapacityBody(100)).toMatch(/Feeling good/);
  });
});

describe("serialize / parse capacity level", () => {
  it("round-trips valid levels", () => {
    expect(parseCapacityLevel(serializeCapacityLevel(42))).toBe(42);
    expect(parseCapacityLevel("  7 ")).toBe(7);
  });

  it("rejects out-of-range and malformed values", () => {
    expect(parseCapacityLevel("101")).toBeNull();
    expect(parseCapacityLevel("-1")).toBeNull();
    expect(parseCapacityLevel("4.5")).toBeNull();
    expect(parseCapacityLevel("abc")).toBeNull();
    expect(parseCapacityLevel("")).toBeNull();
  });
});

describe("capacityLevelColor", () => {
  it("maps 0..100 onto a hue range", () => {
    expect(capacityLevelColor(0)).toBe("hsl(0, 65%, 42%)");
    expect(capacityLevelColor(100)).toBe("hsl(120, 65%, 42%)");
  });
});
