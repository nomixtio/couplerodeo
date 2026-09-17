import { describe, expect, it } from "vitest";
import {
  compareCalendarEvents,
  isValidCalendarDate,
  isValidCalendarTime,
  monthRange,
} from "./calendar";

describe("isValidCalendarDate", () => {
  it("accepts real dates and rejects impossible ones", () => {
    expect(isValidCalendarDate("2026-09-17")).toBe(true);
    expect(isValidCalendarDate("2026-02-30")).toBe(false);
    expect(isValidCalendarDate("2026-13-01")).toBe(false);
    expect(isValidCalendarDate("not-a-date")).toBe(false);
  });
});

describe("isValidCalendarTime", () => {
  it("accepts HH:MM and rejects out-of-range values", () => {
    expect(isValidCalendarTime("09:30")).toBe(true);
    expect(isValidCalendarTime("23:59")).toBe(true);
    expect(isValidCalendarTime("24:00")).toBe(false);
    expect(isValidCalendarTime("9:30")).toBe(false);
    expect(isValidCalendarTime("")).toBe(false);
  });
});

describe("monthRange", () => {
  it("covers the full month including leap years", () => {
    expect(monthRange(2026, 0)).toEqual({ from: "2026-01-01", to: "2026-01-31" });
    expect(monthRange(2024, 1)).toEqual({ from: "2024-02-01", to: "2024-02-29" });
  });
});

describe("compareCalendarEvents", () => {
  it("sorts by date, then time (null first), then created_at", () => {
    const a = { event_date: "2026-09-18", event_time: null, created_at: 3 };
    const b = { event_date: "2026-09-18", event_time: "09:00", created_at: 1 };
    const c = { event_date: "2026-09-17", event_time: "23:00", created_at: 2 };
    expect([b, a, c].sort(compareCalendarEvents)).toEqual([c, a, b]);
  });
});
