import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  UPDATES_PAGE_SIZE,
  type UpdateKind,
} from "../../shared/updates";
import { fetchMe, fetchUpdates } from "../lib/api";
import type { MeResponse, Update } from "../lib/api";
import { PageFilter } from "../components/PageFilter";
import { UpdateComposer } from "../components/UpdateComposer";
import { UpdateCard } from "../components/UpdateCard";
import { usePushRefresh } from "../components/PushListener";
import { PageLoader } from "../components/PageLoader";
import { hasSession } from "../lib/partner";

type UpdatesFilter = "all" | UpdateKind;

const UPDATE_FILTER_OPTIONS: readonly {
  value: UpdatesFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "capacity", label: "Capacity" },
  { value: "love", label: "Love" },
  { value: "location", label: "Location" },
  { value: "question", label: "Questions" },
  { value: "media", label: "Media" },
  { value: "text", label: "Updates" },
];

const UPDATE_FILTER_LABELS = Object.fromEntries(
  UPDATE_FILTER_OPTIONS.map((option) => [option.value, option.label]),
) as Record<UpdatesFilter, string>;

function parseUpdatesFilter(value: unknown): UpdatesFilter {
  return UPDATE_FILTER_OPTIONS.some((option) => option.value === value)
    ? (value as UpdatesFilter)
    : "all";
}

export const Route = createFileRoute("/updates")({
  validateSearch: (search: Record<string, unknown>) => ({
    filter: parseUpdatesFilter(search.filter),
  }),
  component: UpdatesPage,
});

function mergeUpdates(existing: Update[], incoming: Update[]): Update[] {
  const byId = new Map(existing.map((update) => [update.id, update]));
  for (const update of incoming) {
    byId.set(update.id, update);
  }
  return [...byId.values()].sort(
    (a, b) => b.created_at - a.created_at || b.id.localeCompare(a.id),
  );
}

function UpdatesPage() {
  const navigate = useNavigate();
  const { filter } = Route.useSearch();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [drawerHeight, setDrawerHeight] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearTopRef = useRef(true);
  const loadingOlderRef = useRef(false);
  const updatesRef = useRef<Update[]>([]);
  const hasMoreRef = useRef(false);

  useEffect(() => {
    updatesRef.current = updates;
  }, [updates]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const scrollToTop = useCallback((behavior: ScrollBehavior = "auto") => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTo({ top: 0, behavior });
  }, []);

  const loadOlder = useCallback(async () => {
    if (loadingOlderRef.current || !hasMoreRef.current) return;

    const oldest = updatesRef.current[updatesRef.current.length - 1];
    if (!oldest) return;

    loadingOlderRef.current = true;
    setLoadingOlder(true);

    try {
      const data = await fetchUpdates({
        limit: UPDATES_PAGE_SIZE,
        before: oldest.created_at,
      });
      setUpdates((current) => mergeUpdates(current, data.updates));
      setHasMore(data.hasMore);
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, []);

  const refreshLatest = useCallback(async () => {
    const data = await fetchUpdates({ limit: UPDATES_PAGE_SIZE });
    const latest = mergeUpdates([], data.updates);
    const previousNewest = updatesRef.current[0]?.created_at ?? 0;
    const latestNewest = latest[0]?.created_at ?? 0;
    const addedNewUpdates = latestNewest > previousNewest;
    const canReplaceLatestPage =
      !hasMoreRef.current && updatesRef.current.length <= UPDATES_PAGE_SIZE;

    if (canReplaceLatestPage) {
      setUpdates(latest);
      setHasMore(data.hasMore);
    } else {
      setUpdates((current) => mergeUpdates(current, latest));
    }

    if (addedNewUpdates && isNearTopRef.current) {
      requestAnimationFrame(() => scrollToTop("smooth"));
    }
  }, [scrollToTop]);

  useEffect(() => {
    if (!hasSession()) {
      navigate({ to: "/connect" });
      return;
    }

    Promise.all([fetchMe(), fetchUpdates({ limit: UPDATES_PAGE_SIZE })])
      .then(([meData, data]) => {
        if (!meData.partnerConnected) {
          navigate({ to: "/pairing" });
          return;
        }
        setMe(meData);
        setUpdates(mergeUpdates([], data.updates));
        setHasMore(data.hasMore);
      })
      .catch((err) => {
        console.error(err);
        navigate({ to: "/connect" });
      })
      .finally(() => {
        setLoadingInitial(false);
      });
  }, [navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshLatest().catch(console.error);
    }, 10000);
    return () => clearInterval(interval);
  }, [refreshLatest]);

  usePushRefresh(() => {
    refreshLatest().catch(console.error);
  });

  function handleScroll() {
    const container = scrollRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    isNearTopRef.current = container.scrollTop < 96;

    if (distanceFromBottom < 160) {
      loadOlder().catch(console.error);
    }
  }

  async function handleUpdateSent() {
    await refreshLatest();
    scrollToTop("smooth");
  }

  function selectFilter(next: UpdatesFilter) {
    navigate({ to: "/updates", search: { filter: next } });
    scrollToTop("auto");
  }

  const filteredUpdates =
    filter === "all"
      ? updates
      : updates.filter((update) => update.kind === filter);
  const emptyFilterLabel = UPDATE_FILTER_LABELS[filter].toLocaleLowerCase();

  if (!me) {
    return (
      <div className="page updates-page">
        <PageLoader label={loadingInitial ? "Loading" : "Redirecting"} />
      </div>
    );
  }

  return (
    <div className="page updates-page">
      <div
        ref={scrollRef}
        className="updates-feed-scroll"
        onScroll={handleScroll}
        aria-label="Updates feed"
      >
        <div className="page-header">
          <h1>Updates</h1>
          <div className="notes-header-actions">
            <PageFilter
              value={filter}
              options={UPDATE_FILTER_OPTIONS}
              label="Filter updates"
              onChange={selectFilter}
            />
          </div>
        </div>

        <section
          className="updates-feed"
          aria-label={filter === "all" ? "All updates" : UPDATE_FILTER_LABELS[filter]}
          style={
            drawerHeight > 0
              ? { paddingBottom: `calc(${drawerHeight}px + 1rem)` }
              : undefined
          }
        >
          {loadingInitial ? (
            <p className="hint">Loading…</p>
          ) : updates.length === 0 ? (
            <p className="hint updates-empty">
              No updates yet. Send the first one below.
            </p>
          ) : filteredUpdates.length === 0 ? (
            <div className="updates-empty">
              <p>No {emptyFilterLabel} to show yet.</p>
              <span>Try another filter or load earlier updates.</span>
            </div>
          ) : (
            filteredUpdates.map((update) => (
              <UpdateCard
                key={update.id}
                update={update}
                currentPartnerId={me.partnerId}
                partnerName={me.partnerName}
                onResponded={() => refreshLatest().catch(console.error)}
              />
            ))
          )}

          {hasMore && (
            <div className="updates-load-more">
              <button
                type="button"
                onClick={() => loadOlder().catch(console.error)}
                disabled={loadingOlder}
              >
                {loadingOlder ? "Loading…" : "Load earlier updates"}
              </button>
            </div>
          )}
        </section>
      </div>

      <UpdateComposer
        variant="footer"
        partnerName={me.partnerName}
        onHeightChange={setDrawerHeight}
        onSent={() => handleUpdateSent().catch(console.error)}
      />
    </div>
  );
}
