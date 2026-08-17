import { useState } from "react";
import type { NewQuestionType } from "../lib/api";
import { createQuestion } from "../lib/api";

interface QuestionComposerProps {
  onSent?: () => void;
  partnerName?: string | null;
}

const TYPE_LABELS: Record<NewQuestionType, string> = {
  choice: "Multiple choice",
  scale: "Scale 1–5",
};

const QUESTION_PLACEHOLDERS: Record<NewQuestionType, string> = {
  choice: "Did you get the milk?",
  scale: "How are you doing today?",
};

export function QuestionComposer({ onSent, partnerName }: QuestionComposerProps) {
  const [type, setType] = useState<NewQuestionType>("choice");
  const [text, setText] = useState("");
  const [options, setOptions] = useState(["Yes", "No", "Maybe"]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      await createQuestion({
        type,
        text,
        options: type === "choice" ? options.filter((o) => o.trim()) : undefined,
      });
      setText("");
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  return (
    <form className="composer card" onSubmit={handleSubmit}>
      <div className="section-tabs" role="tablist" aria-label="Question type">
        {(Object.keys(TYPE_LABELS) as NewQuestionType[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={type === t}
            className={type === t ? "active" : ""}
            onClick={() => setType(t)}
            disabled={sending}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <label>
        Question
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={QUESTION_PLACEHOLDERS[type]}
          rows={3}
          required
        />
      </label>

      {type === "choice" && (
        <>
          <fieldset className="options-field">
            <legend>Options</legend>
            {options.map((opt, i) => (
              <input
                key={i}
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
              />
            ))}
            <button
              type="button"
              className="btn ghost"
              onClick={() => setOptions((prev) => [...prev, ""])}
            >
              + Add option
            </button>
          </fieldset>
          <p className="hint">
            {partnerName ?? "Your partner"} can pick one of your options or write
            their own answer.
          </p>
        </>
      )}

      {type === "scale" && (
        <p className="hint">
          {partnerName ?? "Your partner"} will answer on a scale from 1 to 5.
        </p>
      )}

      {error && <p className="hint error">{error}</p>}

      <button type="submit" className="btn primary" disabled={sending || !text.trim()}>
        {sending ? "Sending…" : "Send question"}
      </button>
    </form>
  );
}
