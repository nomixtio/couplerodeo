import { useEffect } from "react";
import { markSectionSeen } from "./api";
import { requestBadgeRefresh } from "./app-badge";
import type { UnreadSection } from "../../shared/unread";

export function useMarkSectionSeenOnVisit(
  section: UnreadSection,
  ready = true,
) {
  useEffect(() => {
    if (!ready) return;

    markSectionSeen(section, Date.now())
      .then(() => {
        requestBadgeRefresh();
      })
      .catch(console.error);
  }, [section, ready]);
}
