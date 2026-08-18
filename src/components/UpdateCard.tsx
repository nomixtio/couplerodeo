import { useState } from "react";
import {
  capacityLevelColor,
  formatCapacityBody,
  parseCapacityLevel,
} from "../../shared/capacity";
import { isGiphyUrl } from "../../shared/updates";
import type { Update } from "../lib/api";
import { respondToUpdate } from "../lib/api";
import { formatRelativeTime } from "../lib/format";
import { GifButton } from "./GifButton";
import { GiphyPickerSheet } from "./GiphyPickerSheet";

interface UpdateCardProps {
  update: Update;
  currentPartnerId: string;
  onResponded?: () => void;
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
  const isLoveUpdate = update.kind === "love";
  const isCapacityUpdate = update.kind === "capacity";
  const capacityLevel = isCapacityUpdate
    ? parseCapacityLevel(update.text)
    : null;
  const isGifUpdate =
    !isLoveUpdate && !isCapacityUpdate && isGiphyUrl(update.text);

  async function handleRespond(gifUrl: string) {
    await respondToUpdate(update.id, gifUrl);
    setReacting(false);
    onResponded?.();
  }

  const reactionIsMine = update.response?.partner_id === currentPartnerId;
  const bubbleClass = [
    "chat-bubble",
    isMine ? "mine" : "theirs",
    isGifUpdate ? "chat-bubble--gif" : "",
    isLoveUpdate ? "chat-bubble--love" : "",
    isCapacityUpdate ? "chat-bubble--capacity" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const capacityLabel =
    capacityLevel != null
      ? `${capacityLevel}% capacity. ${formatCapacityBody(capacityLevel)}`
      : "Capacity check-in";

  return (
    <div className={`updates-chat-thread ${isMine ? "mine" : "theirs"}`}>
      <div className={`chat-message-row ${isMine ? "mine" : "theirs"}`}>
        <div
          className={bubbleClass}
          aria-label={
            isLoveUpdate
              ? "Sent you love"
              : isCapacityUpdate
                ? capacityLabel
                : undefined
          }
        >
          {isLoveUpdate ? (
            <>
              <span className="chat-love-heart" aria-hidden>
                ❤️
              </span>
              {update.text ? (
                <p className="chat-bubble-text">{update.text}</p>
              ) : null}
            </>
          ) : capacityLevel != null ? (
            <>
              <p
                className="chat-capacity-value"
                style={{ color: capacityLevelColor(capacityLevel) }}
              >
                {capacityLevel}%
              </p>
              <p className="chat-bubble-text">{formatCapacityBody(capacityLevel)}</p>
              <div
                className="chat-capacity-bar"
                role="progressbar"
                aria-valuenow={capacityLevel}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-hidden="true"
              >
                <div
                  className="chat-capacity-bar-fill"
                  style={{
                    width: `${capacityLevel}%`,
                    background: capacityLevelColor(capacityLevel, 52),
                  }}
                />
              </div>
            </>
          ) : isGifUpdate ? (
            <img src={update.text} alt="GIF update" loading="lazy" />
          ) : (
            <p className="chat-bubble-text">{update.text}</p>
          )}
        </div>

        <div className="chat-message-meta">
          {canRespond && (
            <GifButton
              className="chat-gif-btn"
              onClick={() => setReacting(true)}
              aria-label="React with GIF"
              title="React with GIF"
            />
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
        title="React with GIF"
      />
    </div>
  );
}
