import { parseOptions } from "../lib/api";
import { findGifByUrl } from "../lib/gifs";
import { partnerLabel } from "../lib/partner";
import { Link } from "@tanstack/react-router";
import type { Question } from "../lib/api";

interface QuestionCardProps {
  question: Question;
  currentPartnerId: string;
  partnerName?: string | null;
}

function renderAnswerValue(question: Question): React.ReactNode {
  if (!question.answer) return null;

  const value = question.answer.value;

  if (question.type === "scale") {
    return (
      <div className="scale-result">
        <span className="scale-number">{value}</span>
        <span>/ 5</span>
      </div>
    );
  }

  if (question.type === "gif") {
    const gif = findGifByUrl(value);
    return (
      <div className="gif-result">
        <img src={value} alt={gif?.label ?? "GIF reaction"} />
        {gif && <span>{gif.label}</span>}
      </div>
    );
  }

  return <span className="choice-result">{value}</span>;
}

export function QuestionCard({
  question,
  currentPartnerId,
  partnerName,
}: QuestionCardProps) {
  const options = parseOptions(question.options_json);
  const isMine = question.from_partner_id === currentPartnerId;
  const canAnswer =
    !question.answer && question.from_partner_id !== currentPartnerId;

  return (
    <article className={`question-card card ${isMine ? "mine" : "theirs"}`}>
      <header>
        <span className="badge">{question.type}</span>
        <span className="meta">
          {partnerLabel(question.from_partner_id, currentPartnerId, question.from_label)} ·{" "}
          {new Date(question.created_at).toLocaleString()}
        </span>
      </header>

      <p className="question-text">{question.text}</p>

      {question.type === "choice" && options.length > 0 && (
        <ul className="options-preview">
          {options.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
      )}

      {question.answer ? (
        <div className="answer-block answered">
          <strong>
            {partnerLabel(
              question.answer.partner_id,
              currentPartnerId,
              question.answer_label,
            )}{" "}
            answered:
          </strong>
          {renderAnswerValue(question)}
        </div>
      ) : canAnswer ? (
        <Link to="/answer/$questionId" params={{ questionId: question.id }} className="btn primary">
          Answer now
        </Link>
      ) : (
        <p className="hint">
          Waiting for {partnerName ?? "your partner"} to answer…
        </p>
      )}
    </article>
  );
}
