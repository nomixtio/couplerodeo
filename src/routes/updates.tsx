import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { UPDATES_PAGE_SIZE } from "../../shared/updates";
import { fetchMe, fetchUpdates } from "../lib/api";
import type { MeResponse, Update } from "../lib/api";
import { UpdateComposer } from "../components/UpdateComposer";
import { UpdateCard } from "../components/UpdateCard";
import { usePushRefresh } from "../components/PushListener";
import { PageLoader } from "../components/PageLoader";
import { hasSession } from "../lib/partner";

export const Route = createFileRoute("/updates")({
  component: UpdatesPage,
});

function mergeUpdates(existing: Update[], incoming: Update[]): Update[] {
  const byId = new Map(existing.map((update) => [update.id, update]));
  for (const update of incoming) {
    byId.set(update.id, update);
  }
  return [...byId.values()].sort((a, b) => a.created_at - b.created_at);
}

function UpdatesPage() {
  const navigate = useNavigate();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [drawerHeight, setDrawerHeight] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const stickToBottomRef = useRef(false);
  const loadingOlderRef = useRef(false);
  const updatesRef = useRef<Update[]>([]);
  const hasMoreRef = useRef(false);

  useEffect(() => {
    updatesRef.current = updates;
  }, [updates]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const container = scrollRef.current;
    if (!container) return;

    const scroll = () => {
      const top = Math.max(0, container.scrollHeight - container.clientHeight);
      if (behavior === "smooth") {
        container.scrollTo({ top, behavior: "smooth" });
      } else {
        container.scrollTop = top;
      }
    };

    scroll();
    requestAnimationFrame(scroll);
  }, []);

  const loadOlder = useCallback(async () => {
    if (loadingOlderRef.current || !hasMoreRef.current) return;

    const oldest = updatesRef.current[0];
    if (!oldest) return;

    loadingOlderRef.current = true;
    setLoadingOlder(true);

    const container = scrollRef.current;
    const previousHeight = container?.scrollHeight ?? 0;

    try {
      const data = await fetchUpdates({
        limit: UPDATES_PAGE_SIZE,
        before: oldest.created_at,
      });
      setUpdates((current) => mergeUpdates(data.updates, current));
      setHasMore(data.hasMore);

      requestAnimationFrame(() => {
        if (!container) return;
        container.scrollTop = container.scrollHeight - previousHeight;
      });
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, []);

  const refreshLatest = useCallback(async () => {
    const data = await fetchUpdates({ limit: UPDATES_PAGE_SIZE });
    let addedNewMessages = false;

    setUpdates((current) => {
      if (!hasMoreRef.current && current.length <= UPDATES_PAGE_SIZE) {
        const newest = current[current.length - 1]?.created_at ?? 0;
        const latestNewest = data.updates[data.updates.length - 1]?.created_at ?? 0;
        addedNewMessages = latestNewest > newest;
        return data.updates;
      }

      const newest = current[current.length - 1]?.created_at ?? 0;
      const newer = data.updates.filter((update) => update.created_at > newest);
      if (newer.length > 0) {
        addedNewMessages = true;
        return mergeUpdates(current, newer);
      }

      return current.map((update) => {
        const refreshed = data.updates.find((item) => item.id === update.id);
        return refreshed ?? update;
      });
    });

    if (addedNewMessages && isNearBottomRef.current) {
      stickToBottomRef.current = true;
      requestAnimationFrame(() => scrollToBottom("auto"));
    }
  }, [scrollToBottom]);

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
        setUpdates(data.updates);
        setHasMore(data.hasMore);
      })
      .catch((err) => {
        console.error(err);
        navigate({ to: "/connect" });
      })
      .finally(() => {
        stickToBottomRef.current = true;
        setLoadingInitial(false);
      });
  }, [navigate]);

  useLayoutEffect(() => {
    if (loadingInitial || drawerHeight === 0) return;
    if (stickToBottomRef.current || isNearBottomRef.current) {
      scrollToBottom("auto");
      stickToBottomRef.current = false;
    }
  }, [loadingInitial, drawerHeight, scrollToBottom]);

  useEffect(() => {
    if (loadingInitial) return;

    const container = scrollRef.current;
    if (!container) return;

    let lastClientHeight = container.clientHeight;

    const observer = new ResizeObserver(() => {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      const clientHeightChanged = container.clientHeight !== lastClientHeight;
      lastClientHeight = container.clientHeight;

      if (stickToBottomRef.current || (isNearBottomRef.current && !clientHeightChanged)) {
        container.scrollTop = Math.max(
          0,
          container.scrollHeight - container.clientHeight,
        );
        stickToBottomRef.current = false;
        return;
      }

      if (clientHeightChanged) {
        container.scrollTop = Math.max(
          0,
          container.scrollHeight - container.clientHeight - distanceFromBottom,
        );
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [loadingInitial]);

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
    isNearBottomRef.current = distanceFromBottom < 96;

    if (container.scrollTop < 96) {
      loadOlder().catch(console.error);
    }
  }

  async function handleUpdateSent() {
    stickToBottomRef.current = true;
    await refreshLatest();
    scrollToBottom("auto");
  }

  if (!me) {
    return (
      <div className="page updates-chat-page">
        <PageLoader label={loadingInitial ? "Loading" : "Redirecting"} />
      </div>
    );
  }

  return (
    <div className="page updates-chat-page">
      <div
        ref={scrollRef}
        className="updates-chat-scroll"
        onScroll={handleScroll}
        aria-label="Updates conversation"
      >
        <div
          ref={messagesRef}
          className="updates-chat-messages"
          style={
            drawerHeight > 0
              ? { paddingBottom: `calc(${drawerHeight}px + 0.5rem)` }
              : undefined
          }
        >
          {loadingOlder && (
            <p className="hint updates-chat-loading-older">Loading older updates…</p>
          )}

          {!loadingOlder && hasMore && updates.length > 0 && (
            <p className="hint updates-chat-load-hint">Scroll up for older updates</p>
          )}

          {loadingInitial ? (
            <p className="hint">Loading…</p>
          ) : updates.length === 0 ? (
            <p className="hint updates-empty">
              No updates yet. Send the first one below.
            </p>
          ) : (
            updates.map((update) => (
              <UpdateCard
                key={update.id}
                update={update}
                currentPartnerId={me.partnerId}
                onResponded={() => refreshLatest().catch(console.error)}
              />
            ))
          )}
        </div>
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
