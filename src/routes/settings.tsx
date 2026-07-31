import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { EnableNotifications } from "../components/EnableNotifications";
import { AppRefresh } from "../components/AppRefresh";
import { PageLoader } from "../components/PageLoader";
import { fetchMe, logout, type MeResponse } from "../lib/api";
import { hasSession, partnerDisplayName } from "../lib/partner";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hasSession()) {
      navigate({ to: "/connect" });
      return;
    }

    fetchMe()
      .then(setMe)
      .catch((err) => {
        console.error(err);
        navigate({ to: "/connect" });
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  async function copyCode() {
    if (!me) return;
    try {
      await navigator.clipboard.writeText(me.myCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard");
    }
  }

  async function handleDisconnect() {
    await logout();
    navigate({ to: "/connect" });
  }

  if (loading || !me) {
    return (
      <div className="page settings-page">
        <PageLoader label={loading ? "Loading" : "Redirecting"} />
      </div>
    );
  }

  return (
    <div className="page settings-page">
      <h1>Settings</h1>
      <section className="card setup-card">
        <h2>Your couple</h2>
        <p className="hint">{me.partnerName} & {me.myName}</p>
      </section>

      <section className="card setup-card">
        <h2>Your code</h2>
        <p className="hint">
          {me.partnerConnected
            ? `If ${partnerDisplayName(me.partnerName)} gets a new phone, give them this code so they can reconnect.`
            : "Share this code with your partner so they can join."}
        </p>
        <div className="code-display">
          <code>{me.myCode}</code>
          <button type="button" className="btn ghost" onClick={copyCode}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        {me.partnerConnected ? (
          <p className="hint success">Connected with {me.partnerName}</p>
        ) : (
          <p className="hint">
            Waiting for your partner — see the{" "}
            <Link to="/pairing">pairing page</Link> to share your code.
          </p>
        )}
      </section>

      <section className="card setup-card">
        <h2>App</h2>
        <p className="hint">
          Pull the latest version after a deploy. Especially useful if you
          installed the app on your home screen.
        </p>
        <AppRefresh />
      </section>

      <section className="card setup-card">
        <h2>Notifications</h2>
        <p className="hint">
          Enable notifications so you know when{" "}
          {partnerDisplayName(me.partnerName)} sends a question or answers yours.
          You can test, refresh, or reset them here anytime.
        </p>
        <EnableNotifications />
      </section>

      <section className="card setup-card">
        <button type="button" className="btn ghost" onClick={handleDisconnect}>
          Disconnect
        </button>
      </section>

      {error && <p className="hint error">{error}</p>}
    </div>
  );
}
