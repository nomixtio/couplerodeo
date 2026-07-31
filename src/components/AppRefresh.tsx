import { useState } from "react";
import { APP_BUILD } from "../lib/app";
import { checkForAppUpdate, refreshAppToLatest } from "../lib/app-update";

export function AppRefresh() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function handleRefresh() {
    setBusy(true);
    setMessage("Checking for updates…");

    const status = await checkForAppUpdate();
    if (status.kind === "error") {
      setMessage(status.message);
      setBusy(false);
      return;
    }

    if (status.kind === "updateAvailable") {
      setMessage(
        `Update found (build ${status.localBuild} → ${status.serverBuild}), refreshing…`,
      );
    } else {
      setMessage("You're on the latest version. Refreshing…");
    }

    await refreshAppToLatest();
  }

  return (
    <div className="notifications-block">
      <p className="hint">Build {APP_BUILD}</p>
      <div className="notification-actions">
        <button
          type="button"
          className="btn secondary"
          onClick={handleRefresh}
          disabled={busy}
        >
          {busy ? "Refreshing…" : "Refresh app"}
        </button>
      </div>
      {message && <p className="hint">{message}</p>}
    </div>
  );
}
