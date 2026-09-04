import { APP_SLUG } from "./app";
import { fetchUnreadCounts } from "./api";
import type { UnreadCounts } from "../../shared/unread";

export const BADGE_REFRESH_EVENT = `${APP_SLUG}-badge-refresh`;

export function syncAppBadge(count: number) {
  if (!("setAppBadge" in navigator)) return;
  if (count > 0) {
    void navigator.setAppBadge(count);
  } else {
    void navigator.clearAppBadge();
  }
}

export async function refreshUnreadState(): Promise<UnreadCounts> {
  const counts = await fetchUnreadCounts();
  syncAppBadge(counts.total);
  return counts;
}

export async function refreshAppBadgeCount() {
  const counts = await refreshUnreadState();
  return counts.total;
}

export function requestBadgeRefresh() {
  window.dispatchEvent(new Event(BADGE_REFRESH_EVENT));
}
