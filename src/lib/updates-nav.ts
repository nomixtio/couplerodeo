export type UpdatesTab = "send" | "all";

export function parseUpdatesTab(
  value: string | null | undefined,
): UpdatesTab {
  if (value === "send") return "send";
  return "all";
}

export function updatesUrl(tab: UpdatesTab = "send"): string {
  return tab === "send" ? "/updates?tab=send" : "/updates?tab=all";
}
