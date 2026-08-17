export type UpdatesTab = "send" | "all";

export function parseUpdatesTab(
  value: string | null | undefined,
): UpdatesTab {
  return value === "send" ? "send" : "all";
}

export function updatesUrl(tab: UpdatesTab = "all"): string {
  return tab === "send" ? "/updates?tab=send" : "/updates?tab=all";
}
