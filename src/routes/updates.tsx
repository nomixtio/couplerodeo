import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { fetchMe, fetchUpdates } from "../lib/api";
import type { MeResponse, Update } from "../lib/api";
import { UpdateComposer } from "../components/UpdateComposer";
import { UpdateCard } from "../components/UpdateCard";
import { usePushRefresh } from "../components/PushListener";
import { PageLoader } from "../components/PageLoader";
import { parseUpdatesTab, type UpdatesTab } from "../lib/updates-nav";
import { hasSession } from "../lib/partner";

export const Route = createFileRoute("/updates")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: parseUpdatesTab(typeof search.tab === "string" ? search.tab : undefined),
  }),
  component: UpdatesPage,
});

function UpdatesPage() {
  const navigate = useNavigate();
  const { tab } = Route.useSearch();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUpdates = useCallback(async () => {
    const data = await fetchUpdates();
    setUpdates(data.updates);
  }, []);

  useEffect(() => {
    if (!hasSession()) {
      navigate({ to: "/connect" });
      return;
    }

    Promise.all([fetchMe(), fetchUpdates()])
      .then(([meData, data]) => {
        if (!meData.partnerConnected) {
          navigate({ to: "/pairing" });
          return;
        }
        setMe(meData);
        setUpdates(data.updates);
      })
      .catch((err) => {
        console.error(err);
        navigate({ to: "/connect" });
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadUpdates().catch(console.error);
    }, 10000);
    return () => clearInterval(interval);
  }, [loadUpdates]);

  usePushRefresh(() => {
    loadUpdates().catch(console.error);
  });

  function selectTab(next: UpdatesTab) {
    navigate({ to: "/updates", search: { tab: next } });
  }

  async function handleUpdateSent() {
    await loadUpdates();
    navigate({ to: "/updates", search: { tab: "all" } });
  }

  if (!me) {
    return (
      <div className="page updates-page">
        <PageLoader label={loading ? "Loading" : "Redirecting"} />
      </div>
    );
  }

  return (
    <div className="page updates-page">
      <div className="page-header">
        <h1>Updates</h1>
      </div>

      <div className="page-tabs" role="tablist" aria-label="Updates">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "send"}
          className={tab === "send" ? "active" : ""}
          onClick={() => selectTab("send")}
        >
          Send
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "all"}
          className={tab === "all" ? "active" : ""}
          onClick={() => selectTab("all")}
        >
          All updates
        </button>
      </div>

      {tab === "send" && (
        <section role="tabpanel" aria-label="Send">
          <UpdateComposer
            partnerName={me.partnerName}
            onSent={() => handleUpdateSent().catch(console.error)}
          />
        </section>
      )}

      {tab === "all" && (
        <section className="thread" role="tabpanel" aria-label="All updates">
          {loading ? (
            <p className="hint">Loading…</p>
          ) : updates.length === 0 ? (
            <p className="hint">
              No updates yet. Switch to Send to share the first one!
            </p>
          ) : (
            updates.map((update) => (
              <UpdateCard
                key={update.id}
                update={update}
                currentPartnerId={me.partnerId}
                onResponded={() => loadUpdates().catch(console.error)}
              />
            ))
          )}
        </section>
      )}
    </div>
  );
}
