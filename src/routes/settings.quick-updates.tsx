import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { PageLoader } from "../components/PageLoader";
import { QuickUpdatesEditor } from "../components/QuickUpdatesEditor";
import {
  fetchMe,
  fetchQuickUpdates,
  saveQuickUpdates,
  saveQuickUpdatesSource,
  type MeResponse,
  type QuickUpdatesPayload,
} from "../lib/api";
import { hasSession, partnerDisplayName } from "../lib/partner";
import type { QuickUpdateItem, QuickUpdatesSource } from "../../shared/updates";

export const Route = createFileRoute("/settings/quick-updates")({
  component: QuickUpdatesSettingsPage,
});

type ListTab = "mine" | "partner";

function QuickUpdatesSettingsPage() {
  const navigate = useNavigate();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [payload, setPayload] = useState<QuickUpdatesPayload | null>(null);
  const [tab, setTab] = useState<ListTab>("mine");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [meData, updates] = await Promise.all([
      fetchMe(),
      fetchQuickUpdates(),
    ]);
    setMe(meData);
    setPayload(updates);
    if (!updates.partner) setTab("mine");
  }, []);

  useEffect(() => {
    if (!hasSession()) {
      navigate({ to: "/connect" });
      return;
    }

    load()
      .catch((err) => {
        console.error(err);
        navigate({ to: "/connect" });
      })
      .finally(() => setLoading(false));
  }, [load, navigate]);

  async function handleSaveItems(items: QuickUpdateItem[]) {
    setError("");
    const next = await saveQuickUpdates(items);
    setPayload(next);
  }

  async function handleUseSource(source: QuickUpdatesSource) {
    setError("");
    setSaving(true);
    try {
      const next = await saveQuickUpdatesSource(source);
      setPayload(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not switch lists");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !me || !payload) {
    return (
      <div className="page settings-page">
        <PageLoader label={loading ? "Loading" : "Redirecting"} />
      </div>
    );
  }

  const partnerName = partnerDisplayName(me.partnerName);
  const partnerConnected = Boolean(payload.partner);
  const viewingPartner = tab === "partner";
  const visibleItems = viewingPartner
    ? (payload.partner ?? payload.mine)
    : payload.mine;
  const viewingActive =
    (viewingPartner && payload.source === "partner") ||
    (!viewingPartner && payload.source === "mine");

  return (
    <div className="page settings-page quick-updates-page">
      <div className="note-sheet-toolbar">
        <Link to="/settings" className="note-sheet-back">
          ← Settings
        </Link>
      </div>
      <h1>Quick updates</h1>

      <div className="section-tabs" role="tablist" aria-label="Whose list">
        <button
          type="button"
          role="tab"
          aria-selected={!viewingPartner}
          className={!viewingPartner ? "active" : ""}
          onClick={() => setTab("mine")}
        >
          My list
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={viewingPartner}
          className={viewingPartner ? "active" : ""}
          disabled={!partnerConnected}
          onClick={() => setTab("partner")}
        >
          {partnerName}&apos;s list
        </button>
      </div>

      <p className="hint">
        {payload.source === "partner"
          ? `The Updates drawer is using ${partnerName}'s list.`
          : "The Updates drawer is using your list."}
      </p>
      {!viewingActive ? (
        <button
          type="button"
          className="btn secondary"
          disabled={saving || (viewingPartner && !partnerConnected)}
          onClick={() => {
            handleUseSource(viewingPartner ? "partner" : "mine").catch(
              console.error,
            );
          }}
        >
          Use this list
        </button>
      ) : null}

      {viewingPartner ? (
        <p className="hint">You can look, but only {partnerName} can edit this list.</p>
      ) : null}

      <QuickUpdatesEditor
        items={visibleItems}
        readOnly={viewingPartner}
        disabled={saving}
        onChange={handleSaveItems}
      />

      {error ? <p className="hint error">{error}</p> : null}
    </div>
  );
}
