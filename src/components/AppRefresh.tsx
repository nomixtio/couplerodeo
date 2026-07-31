import { useEffect, useState } from "react";
import { APP_BUILD } from "../lib/app";
import { checkForAppUpdate, refreshAppToLatest } from "../lib/app-update";

type RefreshStatus = "checking" | "upToDate" | "updateAvailable" | "error";

export function AppRefresh() {
  const [status, setStatus] = useState<RefreshStatus>("checking");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    checkForAppUpdate().then((result) => {
      if (cancelled) return;

      if (result.kind === "error") {
        setStatus("error");
        setMessage(result.message);
        return;
      }

      if (result.kind === "updateAvailable") {
        setStatus("updateAvailable");
        setMessage(
          `Update available (build ${result.localBuild} → ${result.serverBuild}).`,
        );
        return;
      }

      setStatus("upToDate");
      setMessage("You're on the latest version.");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRefresh() {
    setBusy(true);
    setMessage("Refreshing…");
    await refreshAppToLatest();
  }

  const canRefresh =
    (status === "updateAvailable" || status === "error") && !busy;

  return (
    <div className="notifications-block">
      <p className="hint">Build {APP_BUILD}</p>
      <div className="notification-actions">
        <button
          type="button"
          className="btn secondary"
          onClick={handleRefresh}
          disabled={!canRefresh}
        >
          {busy ? "Refreshing…" : "Refresh app"}
        </button>
      </div>
      {message && (
        <p className={`hint ${status === "error" ? "error" : ""}`}>{message}</p>
      )}
    </div>
  );
}
