import { useCallback, useEffect, useState } from "react";
import {
  checkForAppUpdate,
  dismissUpdatePrompt,
  getDismissedUpdateBuild,
  refreshAppToLatest,
} from "../lib/app-update";

export function AppUpdatePrompt() {
  const [serverBuild, setServerBuild] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const evaluateUpdate = useCallback(async () => {
    const result = await checkForAppUpdate();
    if (result.kind !== "updateAvailable") {
      setServerBuild(null);
      return;
    }

    if (getDismissedUpdateBuild() === result.serverBuild) {
      setServerBuild(null);
      return;
    }

    setServerBuild(result.serverBuild);
  }, []);

  useEffect(() => {
    evaluateUpdate().catch(console.error);

    function onVisible() {
      if (document.visibilityState === "visible") {
        evaluateUpdate().catch(console.error);
      }
    }

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [evaluateUpdate]);

  function handleDismiss() {
    if (serverBuild != null) {
      dismissUpdatePrompt(serverBuild);
    }
    setServerBuild(null);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await refreshAppToLatest();
  }

  if (serverBuild == null) return null;

  return (
    <div className="app-update-banner" role="status" aria-live="polite">
      <div className="app-update-banner-text">
        <strong>New version available</strong>
        <span>Refresh to get the latest updates.</span>
      </div>
      <div className="app-update-banner-actions">
        <button
          type="button"
          className="btn primary"
          onClick={() => handleRefresh().catch(console.error)}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={handleDismiss}
          disabled={refreshing}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
