import { describe, expect, it } from "vitest";
import { parseCalendarEventBody } from "./calendar";

const FUTURE = Date.now() + 24 * 60 * 60 * 1000;

describe("parseCalendarEventBody", () => {
  it("accepts a minimal valid event", () => {
    expect(
      parseCalendarEventBody({ title: " Dinner ", eventDate: "2026-09-20" }, FUTURE),
    ).toEqual({
      ok: true,
      data: {
        title: "Dinner",
        eventDate: "2026-09-20",
        eventTime: null,
        notes: null,
        remindAt: null,
      },
    });
  });

  it("accepts time, notes and future reminders", () => {
    const result = parseCalendarEventBody(
      {
        title: "Trip",
        eventDate: "2026-10-01",
        eventTime: "09:30",
        notes: "bring snacks",
        remindAt: FUTURE + 1000,
      },
      FUTURE,
    );
    expect(result.ok).toBe(true);
  });

  it("rejects bad titles, dates, times and past reminders", () => {
    expect(parseCalendarEventBody({ title: "", eventDate: "2026-09-20" }, FUTURE).ok).toBe(false);
    expect(parseCalendarEventBody({ title: "T", eventDate: "2026-02-30" }, FUTURE).ok).toBe(false);
    expect(
      parseCalendarEventBody({ title: "T", eventDate: "2026-09-20", eventTime: "25:00" }, FUTURE).ok,
    ).toBe(false);
    expect(
      parseCalendarEventBody({ title: "T", eventDate: "2026-09-20", remindAt: FUTURE - 1000 }, FUTURE).ok,
    ).toBe(false);
  });
});
