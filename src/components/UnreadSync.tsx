import { useEffect, useState } from "react";
import {
  BADGE_REFRESH_EVENT,
  refreshUnreadState,
} from "../lib/app-badge";
import { hasSession } from "../lib/partner";
import {
  EMPTY_UNREAD_COUNTS,
  type UnreadCounts,
} from "../../shared/unread";
import { UnreadCountsProvider } from "../lib/unread-counts";
import { PUSH_EVENT } from "./PushListener";

export function UnreadSync({ children }: { children: React.ReactNode }) {
  const [counts, setCounts] = useState<UnreadCounts>(EMPTY_UNREAD_COUNTS);

  useEffect(() => {
    if (!hasSession()) return;

    refreshUnreadState()
      .then(setCounts)
      .catch(console.error);

    function handleRefresh() {
      refreshUnreadState()
        .then(setCounts)
        .catch(console.error);
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        handleRefresh();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener(PUSH_EVENT, handleRefresh);
    window.addEventListener(BADGE_REFRESH_EVENT, handleRefresh);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener(PUSH_EVENT, handleRefresh);
      window.removeEventListener(BADGE_REFRESH_EVENT, handleRefresh);
    };
  }, []);

  return (
    <UnreadCountsProvider counts={counts}>{children}</UnreadCountsProvider>
  );
}
