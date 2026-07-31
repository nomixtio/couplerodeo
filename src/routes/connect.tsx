import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { connectWithPartnerCode, createCouple, fetchMe } from "../lib/api";
import { APP_NAME } from "../lib/app";
import { hasSession } from "../lib/partner";
import { PageLoader } from "../components/PageLoader";

export const Route = createFileRoute("/connect")({
  component: ConnectPage,
});

type ConnectMode = "choose" | "create" | "join";

function ConnectPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<ConnectMode>("choose");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkingSession, setCheckingSession] = useState(hasSession());

  useEffect(() => {
    if (!hasSession()) {
      setCheckingSession(false);
      return;
    }

    fetchMe()
      .then((me) => {
        navigate({ to: me.partnerConnected ? "/" : "/pairing" });
      })
      .catch(() => {
        setCheckingSession(false);
      });
  }, [navigate]);

  function goToChoose() {
    setMode("choose");
    setError("");
    setName("");
    setCode("");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await createCouple(name);
      navigate({ to: "/pairing" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create couple");
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await connectWithPartnerCode(code, name.trim() || undefined);
      navigate({ to: "/settings" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setBusy(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="page connect-page">
        <PageLoader />
      </div>
    );
  }

  return (
    <div className="page connect-page">
      <h1>{APP_NAME}</h1>
      <p className="lead">
        A small space for couples — no chat, just questions, life updates, capacity check-ins,
        and quick love notes when you want to reach each other.
      </p>

      {mode === "choose" && (
        <section className="card setup-card">
          <h2>Connect with your partner</h2>
          <p className="hint">
            Create a couple and share your code, or enter your partner&apos;s code to join or
            reconnect on a new device.
          </p>
          <div className="pairing-actions">
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                setMode("create");
                setError("");
                setName("");
              }}
            >
              Create a couple
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setMode("join");
                setError("");
                setName("");
                setCode("");
              }}
            >
              Enter partner&apos;s code
            </button>
          </div>
        </section>
      )}

      {mode === "create" && (
        <section className="card setup-card">
          <h2>Create a couple</h2>
          <p className="hint">Choose how your partner will see you in the app.</p>
          <form onSubmit={handleCreate} className="pairing-form">
            <label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                maxLength={30}
                required
                autoFocus
              />
            </label>
            <div className="pairing-actions">
              <button type="submit" className="btn primary" disabled={busy || !name.trim()}>
                {busy ? "Creating…" : "Create couple"}
              </button>
              <button type="button" className="btn ghost" onClick={goToChoose}>
                Back
              </button>
            </div>
          </form>
        </section>
      )}

      {mode === "join" && (
        <section className="card setup-card">
          <h2>Enter partner&apos;s code</h2>
          <p className="hint">
            Use the code your partner shared with you — not your own personal code. If you got a
            new phone, ask your partner for their code again and leave your name blank.
          </p>
          <form onSubmit={handleJoin} className="pairing-form">
            <label>
              Your name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Only needed the first time you join"
                maxLength={30}
                autoFocus
              />
            </label>
            <label>
              Partner&apos;s code
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Your partner's code"
                required
              />
            </label>
            <div className="pairing-actions">
              <button type="submit" className="btn primary" disabled={busy}>
                {busy ? "Connecting…" : "Connect"}
              </button>
              <button type="button" className="btn ghost" onClick={goToChoose}>
                Back
              </button>
            </div>
          </form>
        </section>
      )}

      {error && <p className="hint error">{error}</p>}
    </div>
  );
}
