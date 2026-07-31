import {
  CALENDAR_DATE_RE,
  CALENDAR_NOTES_MAX_LENGTH,
  CALENDAR_TIME_RE,
  CALENDAR_TITLE_MAX_LENGTH,
  isValidCalendarDate,
  isValidCalendarTime,
} from "../shared/calendar";

export interface CalendarEventInput {
  title: string;
  eventDate: string;
  eventTime: string | null;
  notes: string | null;
  remindAt: number | null;
}

export function normalizeCalendarTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > CALENDAR_TITLE_MAX_LENGTH) return null;
  return trimmed;
}

export function normalizeCalendarNotes(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > CALENDAR_NOTES_MAX_LENGTH) return null;
  return trimmed;
}

export function normalizeEventDate(value: unknown): string | null {
  if (typeof value !== "string" || !CALENDAR_DATE_RE.test(value)) return null;
  if (!isValidCalendarDate(value)) return null;
  return value;
}

export function normalizeRemindAt(value: unknown, now: number): number | null {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value <= now) return null;
  return Math.floor(value);
}

export function normalizeEventTime(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || !CALENDAR_TIME_RE.test(value)) return null;
  if (!isValidCalendarTime(value)) return null;
  return value;
}

export function parseCalendarEventBody(
  body: {
    title?: unknown;
    eventDate?: unknown;
    eventTime?: unknown;
    notes?: unknown;
    remindAt?: unknown;
  },
  now = Date.now(),
):
  | { ok: true; data: CalendarEventInput }
  | { ok: false; error: string } {
  const title = normalizeCalendarTitle(body.title);
  if (!title) {
    return {
      ok: false,
      error: `Title must be 1–${CALENDAR_TITLE_MAX_LENGTH} characters`,
    };
  }

  const eventDate = normalizeEventDate(body.eventDate);
  if (!eventDate) {
    return { ok: false, error: "Invalid event date" };
  }

  const eventTime = normalizeEventTime(body.eventTime);
  if (body.eventTime != null && body.eventTime !== "" && eventTime === null) {
    return { ok: false, error: "Invalid event time" };
  }

  const notes = normalizeCalendarNotes(body.notes);
  if (body.notes != null && body.notes !== "" && notes === null) {
    return {
      ok: false,
      error: `Notes must be at most ${CALENDAR_NOTES_MAX_LENGTH} characters`,
    };
  }

  let remindAt: number | null = null;
  if (body.remindAt != null) {
    remindAt = normalizeRemindAt(body.remindAt, now);
    if (remindAt === null) {
      return { ok: false, error: "Reminder must be in the future" };
    }
  }

  return {
    ok: true,
    data: { title, eventDate, eventTime, notes, remindAt },
  };
}
