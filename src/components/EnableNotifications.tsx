import { useEffect, useState } from "react";
import {
  subscribeToPush,
  sendTestPush,
  getPushStatus,
  isPushSupported,
  isStandalonePwa,
  isIos,
  formatPushError,
  resetPushNotifications,
} from "../lib/push";
import { APP_NAME } from "../lib/app";

export function EnableNotifications() {
  const [status, setStatus] = useState<
    "checking" | "idle" | "loading" | "testing" | "resetting" | "done" | "error"
  >("checking");
  const [message, setMessage] = useState("");

  const canCheckPush = isPushSupported() && !(isIos() && !isStandalonePwa());

  useEffect(() => {
    if (!canCheckPush) {
      setStatus("idle");
      return;
    }

    let cancelled = false;

    (async () => {
      const { permission, subscribed } = await getPushStatus();
      if (cancelled) return;

      if (permission === "denied") {
        setStatus("error");
        setMessage("Notifications blocked. Enable them in Settings → Notifications.");
      } else if (subscribed) {
        setStatus("done");
      } else {
        setStatus("idle");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canCheckPush]);

  if (!isPushSupported()) {
    return (
      <p className="hint warning">
        Push notifications require a supported browser (Safari 16.4+ on iOS with PWA installed).
      </p>
    );
  }

  if (isIos() && !isStandalonePwa()) {
    return (
      <div className="notifications-block">
        <p className="hint warning">
          On iPhone, push only works in the installed app. Open Safari → Share → Add to Home
          Screen, then open {APP_NAME} from your home screen and enable notifications here.
        </p>
      </div>
    );
  }

  async function handleEnable() {
    setStatus("loading");
    setMessage("");
    try {
      await subscribeToPush({ forceRefresh: true });
      setStatus("testing");
      setMessage("Subscription refreshed. Sending test notification…");

      const result = await sendTestPush();
      setStatus("done");
      if (result.sent) {
        setMessage("Notifications enabled. You should see a test alert now.");
      } else {
        setMessage(
          `Subscription saved but test push failed: ${result.error ?? "unknown error"}. Try again or check browser notification settings.`,
        );
      }
    } catch (err) {
      setStatus("error");
      setMessage(formatPushError(err));
    }
  }

  async function handleTest() {
    setStatus("testing");
    setMessage("Sending test notification…");
    try {
      const result = await sendTestPush();
      setStatus("done");
      setMessage(
        result.sent
          ? "Test sent — check for a notification or in-app banner."
          : `Test failed: ${result.error ?? "unknown error"}`,
      );
    } catch (err) {
      setStatus("error");
      setMessage(formatPushError(err));
    }
  }

  async function handleReset() {
    setStatus("resetting");
    setMessage("Clearing notification subscription…");
    try {
      await resetPushNotifications();
      setStatus("idle");
      setMessage("Notifications reset. Enable them again when you are ready.");
    } catch (err) {
      setStatus("error");
      setMessage(formatPushError(err));
    }
  }

  const busy =
    status === "checking" ||
    status === "loading" ||
    status === "testing" ||
    status === "resetting";

  return (
    <div className="notifications-block">
      {status === "done" && (
        <p className="hint success">Notifications enabled</p>
      )}
      <div className="notification-actions">
        {status !== "done" && (
          <button
            type="button"
            className="btn secondary"
            onClick={handleEnable}
            disabled={busy}
          >
            {status === "checking" ? "Checking…" : "Enable notifications"}
          </button>
        )}
        {status === "done" && (
          <>
            <button
              type="button"
              className="btn ghost"
              onClick={handleTest}
              disabled={busy}
            >
              Send test
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={handleEnable}
              disabled={busy}
            >
              Refresh subscription
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={handleReset}
              disabled={busy}
            >
              Reset notifications
            </button>
          </>
        )}
        {(status === "idle" || status === "error") && (
          <button
            type="button"
            className="btn ghost"
            onClick={handleReset}
            disabled={busy}
          >
            Reset notifications
          </button>
        )}
      </div>
      {status === "done" && isIos() && (
        <p className="hint">
          On iPhone, notifications appear when the app is in the background or closed — not while
          you are actively using it.
        </p>
      )}
      {status === "done" && !isIos() && (
        <p className="hint">
          When this tab is open, alerts appear as an in-app banner. System notifications show when
          the tab is in the background. Also check macOS Settings → Notifications → Chrome.
        </p>
      )}
      {message && <p className={`hint ${status === "error" ? "error" : ""}`}>{message}</p>}
    </div>
  );
}
