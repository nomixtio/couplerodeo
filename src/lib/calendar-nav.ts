export type CalendarTab = "month" | "upcoming" | "add";

export function parseCalendarTab(
  value: string | null | undefined,
): CalendarTab {
  if (value === "upcoming") return "upcoming";
  if (value === "add") return "add";
  return "month";
}

export function calendarUrl(tab: CalendarTab = "month"): string {
  if (tab === "month") return "/calendar?tab=month";
  if (tab === "add") return "/calendar?tab=add";
  return "/calendar?tab=upcoming";
}
