import { parseCalendarTab, type CalendarTab } from "./calendar-nav";
import { parseUpdatesTab, type UpdatesTab } from "./updates-nav";

type PushNavigateOptions =
  | { to: "/" }
  | { to: "/updates"; search?: { tab: UpdatesTab } }
  | { to: "/calendar"; search: { tab: CalendarTab; date?: string } };

export function navigateFromPushUrl(
  url: string,
  navigate: (options: PushNavigateOptions) => void,
): void {
  const path = url.split("?")[0];

  if (path === "/updates" || path.startsWith("/updates/")) {
    const parsed = new URL(url, "http://local");
    const tab = parseUpdatesTab(parsed.searchParams.get("tab"));
    navigate({ to: "/updates", search: { tab } });
    return;
  }

  if (path === "/calendar" || path.startsWith("/calendar/")) {
    const parsed = new URL(url, "http://local");
    const tab = parseCalendarTab(parsed.searchParams.get("tab"));
    const date = parsed.searchParams.get("date") ?? undefined;
    navigate({ to: "/calendar", search: { tab, date } });
    return;
  }

  if (path === "/" || path === "") {
    navigate({ to: "/" });
    return;
  }

  navigate({ to: "/updates" });
}
