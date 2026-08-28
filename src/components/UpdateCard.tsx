import { useState } from "react";
import {
  capacityLevelColor,
  formatCapacityBody,
  parseCapacityLevel,
} from "../../shared/capacity";
import {
  buildMapsUrl,
  formatAccuracyM,
  formatCoordinates,
} from "../../shared/location";
import { isGiphyUrl } from "../../shared/updates";
import { planMediaFullSrc, planMediaMosaicSrc } from "../../shared/plans";
import { emojiById, emojiImageUrl } from "../../shared/openmoji";
import type { Update } from "../lib/api";
import { respondToUpdate, respondToUpdateWithEmoji } from "../lib/api";
import { formatRelativeTime } from "../lib/format";
import { AnswerQuestionSheet } from "./AnswerInputs";
import { EmojiButton } from "./EmojiButton";
import { GifButton } from "./GifButton";
import { LocationMap } from "./LocationMap";
import {
  ReactionPickerSheet,
  type ReactionTab,
} from "./ReactionPickerSheet";

interface UpdateCardProps {
  update: Update;
  currentPartnerId: string;
  partnerName?: string | null;
  onResponded?: () => void;
}

const UPDATE_KIND_LABELS: Record<Update["kind"], string> = {
  text: "Update",
  love: "Love",
  capacity: "Capacity",
  question: "Question",
  location: "Location",
  media: "Media",
};

function UpdateTypeIcon({ kind }: { kind: Update["kind"] }) {
  if (kind === "love") {
    return <span aria-hidden="true">♥</span>;
  }

  if (kind === "capacity") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="6" width="16" height="12" rx="3" />
        <path d="M21 10v4" />
        <path d="M7 10h5v4H7z" />
      </svg>
    );
  }

  if (kind === "location") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    );
  }

  if (kind === "question") {
    return <span aria-hidden="true">?</span>;
  }

  if (kind === "media") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="6" width="18" height="14" rx="2.5" />
        <circle cx="8.5" cy="10.5" r="1.4" />
        <path d="M7 18.5 11.2 13l2.4 2.6 2.1-2.5L21 18.5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function QuestionAnswerValue({ update }: { update: Update }) {
  const value = update.response?.value;
  if (!value) return null;

  if (update.question?.type === "scale") {
    return (
      <p className="update-card-text update-response-scale">
        <span className="update-response-scale-number">{value}</span>
        <span> / 5</span>
      </p>
    );
  }

  return <p className="update-card-text">{value}</p>;
}

function MediaUpdateBody({ update }: { update: Update }) {
  const media = update.media;
  const removed = !media || media.deleted_at != null;
  const kindLabel = media?.type === "video" ? "video" : "photo";

  if (removed) {
    return (
      <p className="hint update-media-placeholder">
        This {kindLabel} was removed
      </p>
    );
  }

  if (media.status === "processing") {
    return <p className="hint update-media-placeholder">Processing video…</p>;
  }

  if (media.status === "failed") {
    return (
      <p className="hint update-media-placeholder">This {kindLabel} is unavailable</p>
    );
  }

  const fullSrc = planMediaFullSrc(media);
  const mosaicSrc = planMediaMosaicSrc(media);

  if (media.type === "image" && (fullSrc || mosaicSrc)) {
    return (
      <img
        className="update-feed-gif"
        src={fullSrc ?? mosaicSrc ?? ""}
        alt="Photo update"
        loading="lazy"
      />
    );
  }

  if (media.type === "video" && fullSrc) {
    return (
      <video
        className="update-feed-video"
        controls
        playsInline
        poster={media.thumbnail_url ?? mosaicSrc ?? undefined}
        src={fullSrc}
      />
    );
  }

  return (
    <p className="hint update-media-placeholder">This {kindLabel} is unavailable</p>
  );
}

export function UpdateCard({
  update,
  currentPartnerId,
  partnerName,
  onResponded,
}: UpdateCardProps) {
  const [reactingTab, setReactingTab] = useState<ReactionTab | null>(null);
  const [answering, setAnswering] = useState(false);
  const isMine = update.from_partner_id === currentPartnerId;
  const isLoveUpdate = update.kind === "love";
  const isCapacityUpdate = update.kind === "capacity";
  const isQuestionUpdate = update.kind === "question";
  const isLocationUpdate = update.kind === "location";
  const isMediaUpdate = update.kind === "media";
  const capacityLevel = isCapacityUpdate
    ? parseCapacityLevel(update.text)
    : null;
  const isGifUpdate =
    !isLoveUpdate &&
    !isCapacityUpdate &&
    !isQuestionUpdate &&
    !isLocationUpdate &&
    !isMediaUpdate &&
    isGiphyUrl(update.text);
  const canRespond =
    !isQuestionUpdate &&
    !update.response &&
    update.from_partner_id !== currentPartnerId;
  const canAnswer =
    isQuestionUpdate &&
    !!update.question &&
    !update.response &&
    update.from_partner_id !== currentPartnerId;
  const answerIsMine = update.response?.partner_id === currentPartnerId;

  async function handleRespondGif(gifUrl: string) {
    await respondToUpdate(update.id, gifUrl);
    setReactingTab(null);
    onResponded?.();
  }

  async function handleRespondEmoji(hexcode: string) {
    await respondToUpdateWithEmoji(update.id, hexcode);
    setReactingTab(null);
    onResponded?.();
  }

  const capacityLabel =
    capacityLevel != null
      ? `${capacityLevel}% capacity. ${formatCapacityBody(capacityLevel)}`
      : "Capacity check-in";
  const author = isMine ? "You" : update.from_label;
  const mediaKindLabel =
    update.media?.type === "video"
      ? "Video"
      : isMediaUpdate
        ? "Photo"
        : UPDATE_KIND_LABELS[update.kind];
  const responseAuthor = answerIsMine
    ? "You"
    : update.response?.responder_label || partnerName || "Your partner";
  const contentClass = [
    "update-feed-content",
    isGifUpdate ? "update-feed-content--gif" : "",
    isLoveUpdate ? "update-feed-content--love" : "",
    isCapacityUpdate ? "update-feed-content--capacity" : "",
    isQuestionUpdate ? "update-feed-content--question" : "",
    isLocationUpdate ? "update-feed-content--location" : "",
    isMediaUpdate ? "update-feed-content--media" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      className={`update-feed-card update-feed-card--${update.kind} ${isMine ? "mine" : "theirs"}`}
      aria-label={`${UPDATE_KIND_LABELS[update.kind]} from ${author}`}
    >
      <header className="update-feed-card-header">
        <span className="update-feed-kind-icon">
          <UpdateTypeIcon kind={update.kind} />
        </span>
        <div className="update-feed-card-heading">
          <p className="update-feed-byline">
            <strong>{author}</strong>
            <span aria-hidden="true">·</span>
            <span>{isMediaUpdate ? mediaKindLabel : UPDATE_KIND_LABELS[update.kind]}</span>
          </p>
          <time
            className="update-feed-timestamp"
            dateTime={new Date(update.created_at).toISOString()}
          >
            {formatRelativeTime(update.created_at)}
          </time>
        </div>
      </header>

      <div
        className={contentClass}
        aria-label={
          isLoveUpdate
            ? "Sent you love"
            : isCapacityUpdate
              ? capacityLabel
              : isQuestionUpdate
                ? "Question"
                : isLocationUpdate
                  ? "Shared location"
                  : isMediaUpdate
                    ? mediaKindLabel
                    : undefined
        }
      >
          {isLoveUpdate ? (
            <>
              <span className="update-love-heart" aria-hidden>
                ❤️
              </span>
              {update.text ? (
                <p className="update-card-text">{update.text}</p>
              ) : (
                <p className="update-card-text">Sent some love</p>
              )}
            </>
          ) : capacityLevel != null ? (
            <>
              <p
                className="update-capacity-value"
                style={{ color: capacityLevelColor(capacityLevel) }}
              >
                {capacityLevel}%
              </p>
              <p className="update-card-text">
                {formatCapacityBody(capacityLevel)}
              </p>
              <div
                className="update-capacity-bar"
                role="progressbar"
                aria-valuenow={capacityLevel}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-hidden="true"
              >
                <div
                  className="update-capacity-bar-fill"
                  style={{
                    width: `${capacityLevel}%`,
                    background: capacityLevelColor(capacityLevel, 52),
                  }}
                />
              </div>
            </>
          ) : isLocationUpdate && update.location ? (
            <>
              <LocationMap
                className="update-location-map"
                latitude={update.location.latitude}
                longitude={update.location.longitude}
                accuracyM={update.location.accuracyM}
                label={update.location.label ?? undefined}
                interactive={false}
              />
              <p className="update-card-text update-location-label">
                {update.location.label || "Shared a location"}
              </p>
              <p className="update-location-meta">
                {formatCoordinates(
                  update.location.latitude,
                  update.location.longitude,
                )}
                {formatAccuracyM(update.location.accuracyM)
                  ? ` · ${formatAccuracyM(update.location.accuracyM)}`
                  : ""}
              </p>
              <a
                className="update-maps-btn"
                href={buildMapsUrl(
                  update.location.latitude,
                  update.location.longitude,
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Maps
              </a>
            </>
          ) : isQuestionUpdate ? (
            <>
              <p className="update-card-text update-question-text">
                {update.text}
              </p>
              {update.question?.type === "choice" &&
                update.question.options &&
                update.question.options.length > 0 && (
                  <ul className="update-question-options">
                    {update.question.options.map((option) => (
                      <li key={option}>{option}</li>
                    ))}
                  </ul>
                )}
              {update.question?.type === "scale" && (
                <p className="update-question-hint">Scale 1–5</p>
              )}
            </>
          ) : isGifUpdate ? (
            <img
              className="update-feed-gif"
              src={update.text}
              alt="GIF update"
              loading="lazy"
            />
          ) : isMediaUpdate ? (
            <MediaUpdateBody update={update} />
          ) : (
            <p className="update-card-text">{update.text}</p>
          )}
      </div>

      {(canRespond || canAnswer) && (
        <footer className="update-feed-card-actions">
          {canRespond && (
            <>
              <GifButton
                className="update-feed-gif-btn"
                onClick={() => setReactingTab("gif")}
                aria-label="React with GIF"
                title="React with GIF"
              />
              <EmojiButton
                className="update-feed-gif-btn"
                onClick={() => setReactingTab("emoji")}
                aria-label="React with emoji"
                title="React with emoji"
              />
            </>
          )}
          {canAnswer && (
            <button
              type="button"
              className="update-feed-reply-btn"
              onClick={() => setAnswering(true)}
              aria-label="Reply to question"
              title="Reply"
            >
              Reply
            </button>
          )}
        </footer>
      )}

      {isQuestionUpdate && !update.response && isMine && (
        <p className="update-question-waiting">
          Waiting for {partnerName ?? "your partner"} to answer
        </p>
      )}

      {update.response?.kind === "answer" && (
        <section className="update-feed-response" aria-label="Answer">
          <p className="update-feed-response-label">
            {responseAuthor} answered
          </p>
          <QuestionAnswerValue update={update} />
        </section>
      )}

      {update.response?.kind === "gif" && update.response.gif_url && (
        <section className="update-feed-response" aria-label="GIF reaction">
          <p className="update-feed-response-label">
            {responseAuthor} reacted
          </p>
          <img
            className="update-feed-response-gif"
            src={update.response.gif_url}
            alt="GIF reaction"
            loading="lazy"
          />
        </section>
      )}

      {update.response?.kind === "emoji" && update.response.value && (
        <section className="update-feed-response" aria-label="Emoji reaction">
          <p className="update-feed-response-label">
            {responseAuthor} reacted
          </p>
          <img
            className="update-feed-response-emoji"
            src={emojiImageUrl(update.response.value)}
            alt={emojiById(update.response.value)?.annotation ?? "Emoji reaction"}
            loading="lazy"
          />
        </section>
      )}

      <ReactionPickerSheet
        open={reactingTab != null}
        onClose={() => setReactingTab(null)}
        initialTab={reactingTab ?? "gif"}
        onSelectGif={handleRespondGif}
        onSelectEmoji={handleRespondEmoji}
      />
      <AnswerQuestionSheet
        open={answering}
        onClose={() => setAnswering(false)}
        update={update}
        onAnswered={onResponded}
      />
    </article>
  );
}
