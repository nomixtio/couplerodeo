export const CALENDAR_TITLE_MAX_LENGTH = 100;
export const CALENDAR_NOTES_MAX_LENGTH = 500;
export const CALENDAR_UPCOMING_LIMIT = 60;

export const CALENDAR_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const CALENDAR_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidCalendarDate(value: string): boolean {
  if (!CALENDAR_DATE_RE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function formatCalendarDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatCalendarTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCalendarEventWhen(
  dateStr: string,
  timeStr: string | null,
): string {
  const datePart = formatCalendarDate(dateStr);
  if (!timeStr) return datePart;
  return `${datePart} · ${formatCalendarTime(timeStr)}`;
}

export function isValidCalendarTime(value: string): boolean {
  if (!CALENDAR_TIME_RE.test(value)) return false;
  const [hours, minutes] = value.split(":").map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

export function monthRange(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

export function todayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function toDatetimeLocalValue(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function reminderPresetAt9am(
  eventDate: string,
  daysBefore: number,
  eventTime: string | null = null,
): number {
  const [year, month, day] = eventDate.split("-").map(Number);
  let hours = 9;
  let minutes = 0;
  if (eventTime && isValidCalendarTime(eventTime)) {
    [hours, minutes] = eventTime.split(":").map(Number);
  }
  const date = new Date(year, month - 1, day - daysBefore, hours, minutes, 0, 0);
  return date.getTime();
}

export function compareCalendarEvents(
  a: { event_date: string; event_time: string | null; created_at: number },
  b: { event_date: string; event_time: string | null; created_at: number },
): number {
  if (a.event_date !== b.event_date) {
    return a.event_date.localeCompare(b.event_date);
  }
  if (a.event_time === b.event_time) {
    return a.created_at - b.created_at;
  }
  if (a.event_time === null) return -1;
  if (b.event_time === null) return 1;
  return a.event_time.localeCompare(b.event_time);
}
