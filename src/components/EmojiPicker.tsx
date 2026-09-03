import { useMemo, useState } from "react";
import {
  OPENMOJI_CATALOG,
  OPENMOJI_GROUPS,
  PUNK_CATALOG,
  PUNK_GROUP_ID,
  emojiImageUrl,
  type OpenMojiGroupId,
  type OpenMojiItem,
} from "../../shared/openmoji";

interface EmojiPickerProps {
  onSelect: (hexcode: string) => Promise<void>;
  disabled?: boolean;
  includePunk?: boolean;
  busyLabel?: string;
}

const ALL_GROUP = "all";
type PickerGroup = OpenMojiGroupId | typeof ALL_GROUP | typeof PUNK_GROUP_ID;

function matchesQuery(emoji: OpenMojiItem, query: string) {
  if (!query) return true;
  return (
    emoji.annotation.toLowerCase().includes(query) ||
    emoji.tags.toLowerCase().includes(query) ||
    emoji.hexcode.toLowerCase().includes(query)
  );
}

export function EmojiPicker({
  onSelect,
  disabled = false,
  includePunk = true,
  busyLabel = "Sending emoji…",
}: EmojiPickerProps) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<PickerGroup>("smileys-emotion");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const isSearching = normalizedQuery.length > 0;
  const activeGroup =
    !includePunk && group === PUNK_GROUP_ID ? ALL_GROUP : group;

  const emojis = useMemo(() => {
    const catalogPool = includePunk
      ? [...PUNK_CATALOG, ...OPENMOJI_CATALOG]
      : OPENMOJI_CATALOG;
    const pool =
      isSearching || activeGroup === ALL_GROUP
        ? catalogPool
        : activeGroup === PUNK_GROUP_ID
          ? PUNK_CATALOG
          : OPENMOJI_CATALOG.filter((emoji) => emoji.group === activeGroup);

    return pool.filter((emoji) => matchesQuery(emoji, normalizedQuery));
  }, [activeGroup, includePunk, isSearching, normalizedQuery]);

  async function handlePick(hexcode: string) {
    if (disabled || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onSelect(hexcode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not choose emoji");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="media-picker emoji-picker">
      <label className="media-picker-search">
        Search emoji
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search OpenMoji…"
          disabled={disabled || submitting}
        />
      </label>

      <div
        className="emoji-picker-groups"
        role="tablist"
        aria-label="Emoji categories"
      >
        <button
          type="button"
          role="tab"
          aria-selected={isSearching || activeGroup === ALL_GROUP}
          className={isSearching || activeGroup === ALL_GROUP ? "active" : ""}
          onClick={() => setGroup(ALL_GROUP)}
          disabled={disabled || submitting}
        >
          All
        </button>
        {includePunk ? (
          <button
            type="button"
            role="tab"
            aria-selected={!isSearching && activeGroup === PUNK_GROUP_ID}
            className={!isSearching && activeGroup === PUNK_GROUP_ID ? "active" : ""}
            onClick={() => {
              setQuery("");
              setGroup(PUNK_GROUP_ID);
            }}
            disabled={disabled || submitting}
          >
            Punk
          </button>
        ) : null}
        {OPENMOJI_GROUPS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={!isSearching && activeGroup === item.id}
            className={!isSearching && activeGroup === item.id ? "active" : ""}
            onClick={() => {
              setQuery("");
              setGroup(item.id);
            }}
            disabled={disabled || submitting}
          >
            {item.label}
          </button>
        ))}
      </div>

      {emojis.length === 0 ? (
        <p className="hint">No emoji found. Try another search.</p>
      ) : (
        <div className="emoji-picker-grid" role="listbox" aria-label="Choose an emoji">
          {emojis.map((emoji) => (
            <button
              key={emoji.hexcode}
              type="button"
              role="option"
              title={emoji.annotation}
              aria-label={emoji.annotation}
              disabled={disabled || submitting}
              onClick={() => {
                handlePick(emoji.hexcode).catch(console.error);
              }}
            >
              <img
                src={emojiImageUrl(emoji.hexcode)}
                alt=""
                loading="lazy"
                decoding="async"
              />
            </button>
          ))}
        </div>
      )}

      {error && <p className="hint error">{error}</p>}
      {submitting && busyLabel ? (
        <p className="hint media-picker-sending">{busyLabel}</p>
      ) : null}
      <p className="emoji-picker-credit">
        Emoji by{" "}
        <a href="https://openmoji.org/" target="_blank" rel="noopener noreferrer">
          OpenMoji
        </a>{" "}
        (CC BY-SA 4.0).
      </p>
    </div>
  );
}
