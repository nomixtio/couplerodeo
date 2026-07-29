import { useState } from "react";
import type { Question } from "../lib/api";
import { parseOptions } from "../lib/api";

interface ChoiceAnswerProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

export function ChoiceAnswer({ options, value, onChange }: ChoiceAnswerProps) {
  return (
    <div className="answer-options">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          className={value === opt ? "active" : ""}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

interface ScaleAnswerProps {
  value: string;
  onChange: (value: string) => void;
}

export function ScaleAnswer({ value, onChange }: ScaleAnswerProps) {
  return (
    <div className="scale-picker" role="group" aria-label="Rate 1 to 5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={value === String(n) ? "active" : ""}
          onClick={() => onChange(String(n))}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export function AnswerForm({
  question,
  onSubmit,
}: {
  question: Question;
  onSubmit: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const options = parseOptions(question.options_json);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value) return;
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
      setSubmitting(false);
    }
  }

  if (question.type === "gif") {
    return (
      <p className="hint">
        GIF questions are no longer supported. Use Updates to share and react
        with GIFs.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="answer-form">
      {question.type === "choice" && (
        <ChoiceAnswer options={options} value={value} onChange={setValue} />
      )}
      {question.type === "scale" && (
        <ScaleAnswer value={value} onChange={setValue} />
      )}

      {error && <p className="hint error">{error}</p>}

      <button type="submit" className="btn primary" disabled={!value || submitting}>
        {submitting ? "Sending…" : "Send answer"}
      </button>
    </form>
  );
}
