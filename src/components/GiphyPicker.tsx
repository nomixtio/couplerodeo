import { useCallback, useEffect, useRef, useState } from "react";
import { searchGiphy, type GiphyGif } from "../lib/api";

interface GiphyPickerProps {
  onSelect: (gifUrl: string) => Promise<void>;
  onCancel?: () => void;
  disabled?: boolean;
  variant?: "default" | "sheet";
}

function mergeGifs(current: GiphyGif[], incoming: GiphyGif[]) {
  const seen = new Set(current.map((gif) => gif.id));
  const next = [...current];
  for (const gif of incoming) {
    if (seen.has(gif.id)) continue;
    seen.add(gif.id);
    next.push(gif);
  }
  return next;
}

export function GiphyPicker({
  onSelect,
  onCancel,
  disabled = false,
  variant = "default",
}: GiphyPickerProps) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextOffset, setNextOffset] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState("");
  const [error, setError] = useState("");
  const isSheet = variant === "sheet";
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(false);
  const queryRef = useRef(query);
  const hasMoreRef = useRef(hasMore);
  const nextOffsetRef = useRef(nextOffset);
  const scrollRef = useRef<HTMLDivElement>(null);

  queryRef.current = query;
  hasMoreRef.current = hasMore;
  nextOffsetRef.current = nextOffset;

  const loadPage = useCallback(async (searchQuery: string, offset: number, append: boolean) => {
    if (append && inFlightRef.current) return;
    const requestId = ++requestIdRef.current;
    inFlightRef.current = true;
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setLoadingMore(false);
      setHasMore(true);
      hasMoreRef.current = true;
      setNextOffset(0);
      nextOffsetRef.current = 0;
    }
    setError("");
    try {
      const data = await searchGiphy(searchQuery, offset);
      if (requestId !== requestIdRef.current) return;
      const nextOffsetValue = offset + data.gifs.length;
      setGifs((prev) => (append ? mergeGifs(prev, data.gifs) : data.gifs));
      setHasMore(data.hasMore);
      hasMoreRef.current = data.hasMore;
      setNextOffset(nextOffsetValue);
      nextOffsetRef.current = nextOffsetValue;
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      if (!append) setGifs([]);
      setHasMore(false);
      hasMoreRef.current = false;
      setError(err instanceof Error ? err.message : "Could not load GIFs");
    } finally {
      if (requestId === requestIdRef.current) {
        inFlightRef.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPage(query, 0, false).catch(console.error);
    }, query.trim() ? 300 : 0);
    return () => clearTimeout(timer);
  }, [query, loadPage]);

  function handleScroll() {
    const root = scrollRef.current;
    if (
      !root ||
      inFlightRef.current ||
      !hasMoreRef.current ||
      disabled ||
      submitting
    ) {
      return;
    }
    const remaining = root.scrollHeight - root.scrollTop - root.clientHeight;
    if (remaining > 160) return;
    loadPage(queryRef.current, nextOffsetRef.current, true).catch(console.error);
  }

  async function handlePick(gifUrl: string) {
    if (disabled || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onSelect(gifUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send GIF");
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUrl) return;
    await handlePick(selectedUrl);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`giphy-picker-form media-picker${isSheet ? " giphy-picker-form--sheet" : ""}`}
    >
      <label className="giphy-search-label media-picker-search">
        Search GIFs
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Giphy…"
          disabled={disabled || submitting}
        />
      </label>

      {loading && gifs.length === 0 ? (
        <p className="hint">Loading GIFs…</p>
      ) : gifs.length === 0 ? (
        <p className="hint">{error || "No GIFs found. Try another search."}</p>
      ) : (
        <div
          ref={scrollRef}
          className={`gif-picker media-picker-grid${isSheet ? " gif-picker--sheet" : ""}`}
          role="listbox"
          aria-label="Choose a GIF"
          onScroll={handleScroll}
        >
          {gifs.map((gif) => (
            <button
              key={gif.id}
              type="button"
              role="option"
              aria-selected={!isSheet && selectedUrl === gif.url}
              className={!isSheet && selectedUrl === gif.url ? "active" : ""}
              onClick={() => {
                if (isSheet) {
                  handlePick(gif.url).catch(console.error);
                } else {
                  setSelectedUrl(gif.url);
                }
              }}
              title={gif.title}
              disabled={disabled || submitting}
            >
              <img src={gif.url} alt={gif.title} loading="lazy" />
            </button>
          ))}
          {loadingMore && (
            <p className="hint gif-picker-status">Loading more…</p>
          )}
        </div>
      )}

      {error && gifs.length > 0 && <p className="hint error">{error}</p>}

      {!isSheet && (
        <div className="giphy-picker-actions">
          {onCancel && (
            <button
              type="button"
              className="btn ghost"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="btn primary"
            disabled={!selectedUrl || disabled || submitting || loading}
          >
            {submitting ? "Sending…" : "Send GIF reaction"}
          </button>
        </div>
      )}

      {isSheet && submitting && (
        <p className="hint giphy-sheet-sending media-picker-sending">Sending GIF…</p>
      )}
    </form>
  );
}
