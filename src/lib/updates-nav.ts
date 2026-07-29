export type UpdatesTab = "send" | "received";

export function parseUpdatesTab(
  value: string | null | undefined,
): UpdatesTab {
  return value === "send" ? "send" : "received";
}

export function updatesUrl(tab: UpdatesTab = "received"): string {
  return tab === "send" ? "/updates?tab=send" : "/updates?tab=received";
}
