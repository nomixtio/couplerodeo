import { parseCalendarTab, type CalendarTab } from "./calendar-nav";
import { parseUpdatesTab, type UpdatesTab } from "./updates-nav";

export type QuestionsTab = "answers" | "ask";

export function parseQuestionsTab(value: string | null | undefined): QuestionsTab {
  return value === "ask" ? "ask" : "answers";
}

export function questionsUrl(tab: QuestionsTab = "answers"): string {
  return tab === "ask" ? "/questions?tab=ask" : "/questions?tab=answers";
}

type PushNavigateOptions =
  | { to: "/" }
  | { to: "/questions"; search: { tab: QuestionsTab } }
  | { to: "/updates"; search: { tab: UpdatesTab } }
  | { to: "/calendar"; search: { tab: CalendarTab; date?: string } }
  | { to: "/answer/$questionId"; params: { questionId: string } };

export function navigateFromPushUrl(
  url: string,
  navigate: (options: PushNavigateOptions) => void,
): void {
  const path = url.split("?")[0];

  if (path.startsWith("/answer/")) {
    const questionId = path.slice("/answer/".length);
    navigate({ to: "/answer/$questionId", params: { questionId } });
    return;
  }

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

  if (path === "/questions" || path.startsWith("/questions/")) {
    const parsed = new URL(url, "http://local");
    const tab = parseQuestionsTab(parsed.searchParams.get("tab"));
    navigate({ to: "/questions", search: { tab } });
    return;
  }

  if (path === "/" || path === "") {
    navigate({ to: "/" });
    return;
  }

  navigate({ to: "/questions", search: { tab: "answers" } });
}
