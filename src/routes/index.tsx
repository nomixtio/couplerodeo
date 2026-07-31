import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { fetchMe, sendLove, shareCapacity, type MeResponse } from "../lib/api";
import { formatCapacityBody } from "../../shared/capacity";
import { LOVE_MESSAGE_MAX_LENGTH } from "../lib/love";
import { hasSession, partnerDisplayName } from "../lib/partner";
import { usePushRefresh } from "../components/PushListener";
import { PageLoader } from "../components/PageLoader";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function HomePage() {
  const navigate = useNavigate();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [message, setMessage] = useState("");
  const [capacityLevel, setCapacityLevel] = useState(50);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sharingCapacity, setSharingCapacity] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [capacityFeedback, setCapacityFeedback] = useState("");
  const [error, setError] = useState("");
  const [capacityError, setCapacityError] = useState("");

  const loadMe = useCallback(async () => {
    const data = await fetchMe();
    if (!data.partnerConnected) {
      navigate({ to: "/pairing" });
      return;
    }
    setMe(data);
    if (data.myCapacity.level != null) {
      setCapacityLevel(data.myCapacity.level);
    }
  }, [navigate]);

  useEffect(() => {
    if (!hasSession()) {
      navigate({ to: "/connect" });
      return;
    }

    loadMe()
      .catch(() => {
        navigate({ to: "/connect" });
      })
      .finally(() => setLoading(false));
  }, [navigate, loadMe]);

  usePushRefresh(() => {
    loadMe().catch(console.error);
  });

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible" && hasSession()) {
        loadMe().catch(console.error);
      }
    }

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadMe]);

  async function handleSendLove(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;

    setSending(true);
    setError("");
    setFeedback("");
    try {
      const result = await sendLove(message.trim() || undefined);
      setMessage("");
      setFeedback(
        result.sent
          ? `Love sent to ${me.partnerName}!`
          : `Saved, but ${partnerDisplayName(me.partnerName)} may not get a push alert yet.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send love");
    } finally {
      setSending(false);
    }
  }

  async function handleShareCapacity(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;

    setSharingCapacity(true);
    setCapacityError("");
    setCapacityFeedback("");
    try {
      const result = await shareCapacity(capacityLevel);
      const now = Date.now();
      setMe({
        ...me,
        myCapacity: { level: capacityLevel, updatedAt: now },
      });
      setCapacityFeedback(
        result.sent
          ? `Capacity shared with ${me.partnerName}!`
          : `Saved, but ${partnerDisplayName(me.partnerName)} may not get a push alert yet.`,
      );
    } catch (err) {
      setCapacityError(
        err instanceof Error ? err.message : "Could not share capacity",
      );
    } finally {
      setSharingCapacity(false);
    }
  }

  if (loading || !me) {
    return (
      <div className="page home-page">
        <PageLoader label={loading ? "Loading" : "Redirecting"} />
      </div>
    );
  }

  const partnerCapacity = me.partnerCapacity.level;

  return (
    <div className="page home-page">
      <div className="home-greeting">
        <p className="home-greeting-cheer">
        Hi {partnerDisplayName(me.myName)}. Glad you&apos;re here, hope today feels good.
        </p>
      </div>

      <section className="card love-card">
        <form onSubmit={handleSendLove} className="love-form">
          <button
            type="submit"
            className="love-heart-btn"
            disabled={sending}
            aria-label={`Send love to ${me.partnerName}`}
          >
            <span className="love-heart-icon" aria-hidden>
              ❤️
            </span>
          </button>
          <p className="love-action-label">
            {sending ? "Sending…" : `Send love to ${me.partnerName}`}
          </p>

          <label className="love-message-label">
            Optional short message {message.length}/{LOVE_MESSAGE_MAX_LENGTH}
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Miss you!"
              maxLength={LOVE_MESSAGE_MAX_LENGTH}
              disabled={sending}
            />
          </label>
        </form>

        {feedback && <p className="hint success">{feedback}</p>}
        {error && <p className="hint error">{error}</p>}
      </section>

      <section className="card capacity-card">
        <form onSubmit={handleShareCapacity} className="capacity-form">
          <h2 className="capacity-heading">How&apos;s your capacity?</h2>
          <p className="capacity-hint">
            Share how much energy you have left so {me.partnerName} knows how
            to meet you today.
          </p>

          <div className="capacity-slider-row">
            <output
              className="capacity-value"
              htmlFor="capacity-slider"
              style={{ color: `hsl(${capacityLevel * 1.2}, 65%, 42%)` }}
            >
              {capacityLevel}%
            </output>
            <p className="capacity-sentiment">
              {formatCapacityBody(capacityLevel)}
            </p>
            <input
              id="capacity-slider"
              type="range"
              min={0}
              max={100}
              step={1}
              value={capacityLevel}
              onChange={(e) => setCapacityLevel(Number(e.target.value))}
              disabled={sharingCapacity}
              className="capacity-slider"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={capacityLevel}
              aria-label="Your capacity from 0 to 100 percent"
            />
            <div className="capacity-labels">
              <span>Low</span>
              <span>Full</span>
            </div>
          </div>

          <button
            type="submit"
            className="btn primary capacity-share-btn"
            disabled={sharingCapacity}
          >
            {sharingCapacity
              ? "Sharing…"
              : `Share with ${me.partnerName}`}
          </button>
        </form>

        {capacityFeedback && (
          <p className="hint success">{capacityFeedback}</p>
        )}
        {capacityError && <p className="hint error">{capacityError}</p>}
      </section>

      {partnerCapacity != null && (
        <section className="card capacity-partner-card">
          <p className="capacity-partner">
            <strong>{me.partnerName}</strong>
            <span
              className="capacity-partner-level"
              style={{ color: `hsl(${partnerCapacity * 1.2}, 65%, 42%)` }}
            >
              {partnerCapacity}% capacity
            </span>
            {me.partnerCapacity.updatedAt != null && (
              <span className="capacity-partner-time">
                {formatRelativeTime(me.partnerCapacity.updatedAt)}
              </span>
            )}
          </p>
          <div
            className="capacity-partner-bar"
            role="progressbar"
            aria-valuenow={partnerCapacity}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${me.partnerName}'s capacity`}
          >
            <div
              className="capacity-partner-bar-fill"
              style={{
                width: `${partnerCapacity}%`,
                background: `hsl(${partnerCapacity * 1.2}, 65%, 52%)`,
              }}
            />
          </div>
        </section>
      )}
    </div>
  );
}
