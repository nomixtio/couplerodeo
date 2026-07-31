import { useState } from "react";
import { CHOICE_CUSTOM_ANSWER_MAX_LENGTH } from "../../shared/questions";
import type { Question } from "../lib/api";
import { parseOptions } from "../lib/api";

interface ChoiceAnswerProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

export function ChoiceAnswer({ options, value, onChange }: ChoiceAnswerProps) {
  const presetSelected = value !== "" && options.includes(value);
  const customSelected = value !== "" && !options.includes(value);
  const [customMode, setCustomMode] = useState(customSelected);
  const [customText, setCustomText] = useState(customSelected ? value : "");

  function selectPreset(option: string) {
    setCustomMode(false);
    setCustomText("");
    onChange(option);
  }

  function selectCustom() {
    setCustomMode(true);
    onChange(customText.trim());
  }

  function updateCustomText(next: string) {
    setCustomText(next);
    onChange(next.trim());
  }

  return (
    <div className="choice-answer">
      <div className="answer-options">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={presetSelected && value === opt ? "active" : ""}
            onClick={() => selectPreset(opt)}
          >
            {opt}
          </button>
        ))}
        <button
          type="button"
          className={customMode ? "active" : ""}
          onClick={selectCustom}
        >
          Write your own
        </button>
      </div>

      {customMode && (
        <label className="choice-custom-field">
          Your answer
          <input
            type="text"
            value={customText}
            maxLength={CHOICE_CUSTOM_ANSWER_MAX_LENGTH}
            onChange={(e) => updateCustomText(e.target.value)}
            placeholder="Type your answer…"
            autoFocus
          />
        </label>
      )}
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
