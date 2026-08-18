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
import type { Update } from "../lib/api";
import { respondToUpdate } from "../lib/api";
import { formatRelativeTime } from "../lib/format";
import { AnswerQuestionSheet } from "./AnswerInputs";
import { GifButton } from "./GifButton";
import { GiphyPickerSheet } from "./GiphyPickerSheet";
import { LocationMap } from "./LocationMap";

interface UpdateCardProps {
  update: Update;
  currentPartnerId: string;
  partnerName?: string | null;
  onResponded?: () => void;
}

function QuestionAnswerValue({ update }: { update: Update }) {
  const value = update.response?.value;
  if (!value) return null;

  if (update.question?.type === "scale") {
    return (
      <p className="chat-bubble-text chat-scale-answer">
        <span className="chat-scale-number">{value}</span>
        <span> / 5</span>
      </p>
    );
  }

  return <p className="chat-bubble-text">{value}</p>;
}

export function UpdateCard({
  update,
  currentPartnerId,
  partnerName,
  onResponded,
}: UpdateCardProps) {
  const [reacting, setReacting] = useState(false);
  const [answering, setAnswering] = useState(false);
  const isMine = update.from_partner_id === currentPartnerId;
  const isLoveUpdate = update.kind === "love";
  const isCapacityUpdate = update.kind === "capacity";
  const isQuestionUpdate = update.kind === "question";
  const isLocationUpdate = update.kind === "location";
  const capacityLevel = isCapacityUpdate
    ? parseCapacityLevel(update.text)
    : null;
  const isGifUpdate =
    !isLoveUpdate &&
    !isCapacityUpdate &&
    !isQuestionUpdate &&
    !isLocationUpdate &&
    isGiphyUrl(update.text);
  const canRespond =
    !isQuestionUpdate &&
    !isLocationUpdate &&
    !update.response &&
    update.from_partner_id !== currentPartnerId;
  const canAnswer =
    isQuestionUpdate &&
    !!update.question &&
    !update.response &&
    update.from_partner_id !== currentPartnerId;
  const answerIsMine = update.response?.partner_id === currentPartnerId;
  const reactionIsMine = answerIsMine;

  async function handleRespond(gifUrl: string) {
    await respondToUpdate(update.id, gifUrl);
    setReacting(false);
    onResponded?.();
  }

  const bubbleClass = [
    "chat-bubble",
    isMine ? "mine" : "theirs",
    isGifUpdate ? "chat-bubble--gif" : "",
    isLoveUpdate ? "chat-bubble--love" : "",
    isCapacityUpdate ? "chat-bubble--capacity" : "",
    isQuestionUpdate ? "chat-bubble--question" : "",
    isLocationUpdate ? "chat-bubble--location" : "",
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
                : isQuestionUpdate
                  ? "Question"
                  : isLocationUpdate
                    ? "Shared location"
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
          ) : isLocationUpdate && update.location ? (
            <>
              <LocationMap
                className="chat-location-map"
                latitude={update.location.latitude}
                longitude={update.location.longitude}
                accuracyM={update.location.accuracyM}
                label={update.location.label ?? undefined}
                interactive={false}
              />
              <p className="chat-bubble-text">
                {update.location.label || "Shared a location"}
              </p>
              <p className="chat-location-meta">
                {formatCoordinates(
                  update.location.latitude,
                  update.location.longitude,
                )}
                {formatAccuracyM(update.location.accuracyM)
                  ? ` · ${formatAccuracyM(update.location.accuracyM)}`
                  : ""}
              </p>
              <a
                className="chat-maps-btn"
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
              <span className="chat-question-badge">?</span>
              <p className="chat-bubble-text">{update.text}</p>
              {update.question?.type === "choice" &&
                update.question.options &&
                update.question.options.length > 0 && (
                  <ul className="chat-question-options">
                    {update.question.options.map((option) => (
                      <li key={option}>{option}</li>
                    ))}
                  </ul>
                )}
              {update.question?.type === "scale" && (
                <p className="chat-question-hint">Scale 1–5</p>
              )}
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
          {canAnswer && (
            <button
              type="button"
              className="chat-reply-btn"
              onClick={() => setAnswering(true)}
              aria-label="Reply to question"
              title="Reply"
            >
              Reply
            </button>
          )}
          <time className="chat-timestamp" dateTime={new Date(update.created_at).toISOString()}>
            {formatRelativeTime(update.created_at)}
          </time>
        </div>
      </div>

      {isQuestionUpdate && !update.response && isMine && (
        <p className="chat-question-waiting">
          Waiting for {partnerName ?? "your partner"} to answer
        </p>
      )}

      {update.response?.kind === "answer" && (
        <div
          className={`chat-reaction-thread ${answerIsMine ? "mine" : "theirs"}`}
        >
          <div
            className={`chat-bubble ${answerIsMine ? "mine" : "theirs"}`}
          >
            <QuestionAnswerValue update={update} />
          </div>
        </div>
      )}

      {update.response?.kind === "gif" && update.response.gif_url && (
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
      <AnswerQuestionSheet
        open={answering}
        onClose={() => setAnswering(false)}
        update={update}
        onAnswered={onResponded}
      />
    </div>
  );
}
