export type CalendarTab = "month" | "upcoming" | "add";

export function parseCalendarTab(
  value: string | null | undefined,
): CalendarTab {
  if (value === "month") return "month";
  if (value === "add") return "add";
  return "upcoming";
}

export function calendarUrl(tab: CalendarTab = "upcoming"): string {
  if (tab === "month") return "/calendar?tab=month";
  if (tab === "add") return "/calendar?tab=add";
  return "/calendar?tab=upcoming";
}
