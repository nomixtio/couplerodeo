import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchMe, type MeResponse } from "../lib/api";
import { hasSession } from "../lib/partner";

export const Route = createFileRoute("/pairing")({
  component: PairingPage,
});

function PairingPage() {
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

    let cancelled = false;

    async function load() {
      try {
        const data = await fetchMe();
        if (cancelled) return;
        if (data.partnerConnected) {
          navigate({ to: "/" });
          return;
        }
        setMe(data);
      } catch (err) {
        console.error(err);
        if (!cancelled) navigate({ to: "/connect" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(() => {
      fetchMe()
        .then((data) => {
          if (data.partnerConnected) {
            navigate({ to: "/notifications" });
          }
        })
        .catch(console.error);
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
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

  if (loading || !me) {
    return (
      <div className="page pairing-page">
        <p className="hint">{loading ? "Loading…" : "Redirecting…"}</p>
      </div>
    );
  }

  return (
    <div className="page pairing-page">
      <h1>Hi {me.myName}!</h1>
      <p className="lead">
        Share your code with your partner so they can join. Once they connect, you&apos;ll both be
        able to start asking questions.
      </p>

      <section className="card setup-card">
        <h2>{me.myName}&apos;s code</h2>
        <p className="hint">Your partner should enter this code on their device.</p>
        <div className="code-display">
          <code>{me.myCode}</code>
          <button type="button" className="btn ghost" onClick={copyCode}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </section>

      <p className="hint">
        We&apos;ll take you to Notifications automatically when your partner joins. You can also
        check <Link to="/settings">Settings</Link> for your code later.
      </p>

      {error && <p className="hint error">{error}</p>}
    </div>
  );
}
