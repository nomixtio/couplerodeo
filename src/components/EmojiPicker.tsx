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

export function EmojiPicker({ onSelect, disabled = false }: EmojiPickerProps) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<PickerGroup>("smileys-emotion");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const isSearching = normalizedQuery.length > 0;

  const emojis = useMemo(() => {
    const pool =
      isSearching || group === ALL_GROUP
        ? [...PUNK_CATALOG, ...OPENMOJI_CATALOG]
        : group === PUNK_GROUP_ID
          ? PUNK_CATALOG
          : OPENMOJI_CATALOG.filter((emoji) => emoji.group === group);

    return pool.filter((emoji) => matchesQuery(emoji, normalizedQuery));
  }, [group, isSearching, normalizedQuery]);

  async function handlePick(hexcode: string) {
    if (disabled || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onSelect(hexcode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send emoji");
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
          aria-selected={isSearching || group === ALL_GROUP}
          className={isSearching || group === ALL_GROUP ? "active" : ""}
          onClick={() => setGroup(ALL_GROUP)}
          disabled={disabled || submitting}
        >
          All
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={!isSearching && group === PUNK_GROUP_ID}
          className={!isSearching && group === PUNK_GROUP_ID ? "active" : ""}
          onClick={() => {
            setQuery("");
            setGroup(PUNK_GROUP_ID);
          }}
          disabled={disabled || submitting}
        >
          Punk
        </button>
        {OPENMOJI_GROUPS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={!isSearching && group === item.id}
            className={!isSearching && group === item.id ? "active" : ""}
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
      {submitting && <p className="hint media-picker-sending">Sending emoji…</p>}
      <p className="emoji-picker-credit">
        Emoji by{" "}
        <a href="https://openmoji.org/" target="_blank" rel="noopener noreferrer">
          OpenMoji
        </a>{" "}
        (CC BY-SA 4.0). Punk remixes included.
      </p>
    </div>
  );
}
