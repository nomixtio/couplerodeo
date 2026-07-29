import { useCallback, useEffect, useState } from "react";
import { searchGiphy, type GiphyGif } from "../lib/api";

interface GiphyPickerProps {
  onSelect: (gifUrl: string) => Promise<void>;
  onCancel?: () => void;
  disabled?: boolean;
  initialQuery?: string;
}

export function GiphyPicker({
  onSelect,
  onCancel,
  disabled = false,
  initialQuery = "ok",
}: GiphyPickerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState("");
  const [error, setError] = useState("");

  const loadGifs = useCallback(async (searchQuery: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await searchGiphy(searchQuery);
      setGifs(data.gifs);
    } catch (err) {
      setGifs([]);
      setError(err instanceof Error ? err.message : "Could not load GIFs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadGifs(query).catch(console.error);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, loadGifs]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUrl) return;
    setSubmitting(true);
    setError("");
    try {
      await onSelect(selectedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send GIF");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="giphy-picker-form">
      <label className="giphy-search-label">
        Search GIFs
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Giphy…"
          disabled={disabled || submitting}
        />
      </label>

      {loading ? (
        <p className="hint">Loading GIFs…</p>
      ) : gifs.length === 0 ? (
        <p className="hint">No GIFs found. Try another search.</p>
      ) : (
        <div className="gif-picker" role="listbox" aria-label="Choose a GIF">
          {gifs.map((gif) => (
            <button
              key={gif.id}
              type="button"
              role="option"
              aria-selected={selectedUrl === gif.url}
              className={selectedUrl === gif.url ? "active" : ""}
              onClick={() => setSelectedUrl(gif.url)}
              title={gif.title}
              disabled={disabled || submitting}
            >
              <img src={gif.url} alt={gif.title} loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {error && <p className="hint error">{error}</p>}

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
    </form>
  );
}
