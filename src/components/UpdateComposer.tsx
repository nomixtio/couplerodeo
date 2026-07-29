import { useState } from "react";
import { PREMADE_UPDATES, UPDATE_MAX_LENGTH } from "../../shared/updates";
import { createUpdate } from "../lib/api";

interface UpdateComposerProps {
  onSent?: () => void;
  partnerName?: string | null;
}

export function UpdateComposer({ onSent, partnerName }: UpdateComposerProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function sendUpdate(updateText: string) {
    setError("");
    setSending(true);
    try {
      await createUpdate(updateText);
      setText("");
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await sendUpdate(text.trim());
  }

  return (
    <div className="update-composer card">
      <h2>Send an update</h2>
      <p className="hint">
        Share a quick update with {partnerName ?? "your partner"}. They can
        react with a GIF if they want.
      </p>

      <div className="update-presets">
        {PREMADE_UPDATES.map((update) => (
          <button
            key={update}
            type="button"
            className="btn ghost update-preset-btn"
            disabled={sending}
            onClick={() => sendUpdate(update)}
          >
            {update}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="update-custom-form">
        <label>
          Or write your own
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Working late tonight…"
            rows={3}
            maxLength={UPDATE_MAX_LENGTH}
            disabled={sending}
          />
        </label>
        <p className="hint">
          {text.length}/{UPDATE_MAX_LENGTH}
        </p>

        {error && <p className="hint error">{error}</p>}

        <button
          type="submit"
          className="btn primary"
          disabled={sending || !text.trim()}
        >
          {sending ? "Sending…" : "Send update"}
        </button>
      </form>
    </div>
  );
}
