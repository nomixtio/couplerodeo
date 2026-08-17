import { useState } from "react";
import type { Update } from "../lib/api";
import { respondToUpdate } from "../lib/api";
import { formatRelativeTime } from "../lib/format";
import { GiphyPickerSheet } from "./GiphyPickerSheet";

interface UpdateCardProps {
  update: Update;
  currentPartnerId: string;
  onResponded?: () => void;
}

function GifReactIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M8 10h.01M12 10h.01M16 10h.01M8 14h8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function UpdateCard({
  update,
  currentPartnerId,
  onResponded,
}: UpdateCardProps) {
  const [reacting, setReacting] = useState(false);
  const isMine = update.from_partner_id === currentPartnerId;
  const canRespond =
    !update.response && update.from_partner_id !== currentPartnerId;

  async function handleRespond(gifUrl: string) {
    await respondToUpdate(update.id, gifUrl);
    setReacting(false);
    onResponded?.();
  }

  const reactionIsMine = update.response?.partner_id === currentPartnerId;

  return (
    <div className={`updates-chat-thread ${isMine ? "mine" : "theirs"}`}>
      <div className={`chat-message-row ${isMine ? "mine" : "theirs"}`}>
        <div className={`chat-bubble ${isMine ? "mine" : "theirs"}`}>
          <p className="chat-bubble-text">{update.text}</p>
        </div>

        <div className="chat-message-meta">
          {canRespond && (
            <button
              type="button"
              className="chat-react-icon-btn"
              onClick={() => setReacting(true)}
              aria-label="React with GIF"
              title="React with GIF"
            >
              <GifReactIcon />
            </button>
          )}
          <time className="chat-timestamp" dateTime={new Date(update.created_at).toISOString()}>
            {formatRelativeTime(update.created_at)}
          </time>
        </div>
      </div>

      {update.response && (
        <div
          className={`chat-reaction-thread ${reactionIsMine ? "mine" : "theirs"}`}
        >
          <div
            className={`chat-bubble chat-bubble--gif ${reactionIsMine ? "mine" : "theirs"}`}
          >
            <img
              src={update.response.gif_url}
              alt="GIF reaction"
              loading="lazy"
            />
          </div>
        </div>
      )}

      <GiphyPickerSheet
        open={reacting}
        onClose={() => setReacting(false)}
        onSelect={handleRespond}
      />
    </div>
  );
}
