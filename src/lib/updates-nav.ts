export type UpdatesTab = "send" | "all";

export function parseUpdatesTab(
  value: string | null | undefined,
): UpdatesTab {
  if (value === "all") return "all";
  return "send";
}

export function updatesUrl(tab: UpdatesTab = "send"): string {
  return tab === "send" ? "/updates?tab=send" : "/updates?tab=all";
}
