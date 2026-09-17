import { describe, expect, it } from "vitest";
import {
  EMPTY_UNREAD_COUNTS,
  isUnreadSection,
  sumUnreadCounts,
} from "./unread";

describe("sumUnreadCounts", () => {
  it("sums section counts without total", () => {
    expect(
      sumUnreadCounts({ updates: 2, notes: 1, calendar: 0, plans: 3 }),
    ).toBe(6);
    expect(
      sumUnreadCounts({ updates: 0, notes: 0, calendar: 0, plans: 0 }),
    ).toBe(0);
  });

  it("empty counts sum to zero", () => {
    const { total: _total, ...rest } = EMPTY_UNREAD_COUNTS;
    expect(sumUnreadCounts(rest)).toBe(0);
  });
});

describe("isUnreadSection", () => {
  it("accepts known sections only", () => {
    expect(isUnreadSection("updates")).toBe(true);
    expect(isUnreadSection("notes")).toBe(true);
    expect(isUnreadSection("calendar")).toBe(true);
    expect(isUnreadSection("plans")).toBe(true);
    expect(isUnreadSection("total")).toBe(false);
    expect(isUnreadSection("")).toBe(false);
    expect(isUnreadSection(null)).toBe(false);
  });
});
