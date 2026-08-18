import { useEffect, useRef, useState } from "react";
import { UPDATE_MAX_LENGTH } from "../../shared/updates";
import { createUpdate } from "../lib/api";

interface TextComposerProps {
  onSent?: () => void;
}

export function TextComposer({ onSent }: TextComposerProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 80);
    return () => window.clearTimeout(timer);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    setError("");
    setSending(true);
    try {
      await createUpdate(trimmed);
      setText("");
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="text-composer-sheet" onSubmit={handleSubmit}>
      <label>
        Update
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type an update…"
          rows={4}
          maxLength={UPDATE_MAX_LENGTH}
          disabled={sending}
          required
        />
      </label>
      <p className="hint text-composer-count">
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
  );
}
