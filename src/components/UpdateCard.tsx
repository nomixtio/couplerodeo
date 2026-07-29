import { useState } from "react";
import type { Update } from "../lib/api";
import { respondToUpdate } from "../lib/api";
import { formatUpdateDate } from "../lib/format";
import { partnerLabel } from "../lib/partner";
import { GiphyPicker } from "./GiphyPicker";

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

  async function handleRespond(gifUrl: string) {
    await respondToUpdate(update.id, gifUrl);
    setReacting(false);
    onResponded?.();
  }

  return (
    <article className={`update-card card ${isMine ? "mine" : "theirs"}`}>
      <header>
        <span className="badge">update</span>
        <span className="meta">
          {partnerLabel(
            update.from_partner_id,
            currentPartnerId,
            update.from_label,
          )}{" "}
          · {formatUpdateDate(update.created_at)}
        </span>
      </header>

      <p className="update-text">{update.text}</p>

      {update.response && (
        <div className="answer-block answered">
          <strong>
            {partnerLabel(
              update.response.partner_id,
              currentPartnerId,
              update.response.responder_label,
            )}{" "}
            reacted:
          </strong>
          <div className="gif-result">
            <img
              src={update.response.gif_url}
              alt="GIF reaction"
              loading="lazy"
            />
          </div>
        </div>
      )}

      {canRespond && !reacting && (
        <button
          type="button"
          className="btn ghost update-react-btn"
          onClick={() => setReacting(true)}
        >
          React with GIF
        </button>
      )}

      {canRespond && reacting && (
        <GiphyPicker
          onSelect={handleRespond}
          onCancel={() => setReacting(false)}
        />
      )}
    </article>
  );
}
