import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { deleteNote, type Note } from "../lib/api";
import { formatUpdateDate } from "../lib/format";
import { partnerLabel } from "../lib/partner";

interface SimpleNoteCardProps {
  note: Note;
  currentPartnerId: string;
  onDeleted?: () => void;
}

export function SimpleNoteCard({
  note,
  currentPartnerId,
  onDeleted,
}: SimpleNoteCardProps) {
  const isMine = note.from_partner_id === currentPartnerId;
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    const label = note.title ?? "this note";
    if (!window.confirm(`Remove "${label}"?`)) return;
    setError("");
    setDeleting(true);
    try {
      await deleteNote(note.id);
      onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article className={`note-card simple-note-card card ${isMine ? "mine" : "theirs"}`}>
      <header>
        <span className="badge">note</span>
        <span className="meta">
          {partnerLabel(
            note.from_partner_id,
            currentPartnerId,
            note.from_label,
          )}{" "}
          · {formatUpdateDate(note.updated_at)}
        </span>
      </header>

      <Link to="/notes/$noteId" params={{ noteId: note.id }} className="note-card-link">
        {note.title && <h3 className="note-title">{note.title}</h3>}
        <p className="note-body">{note.body}</p>
      </Link>

      {error && <p className="hint error">{error}</p>}

      <div className="note-actions">
        <Link
          to="/notes/$noteId"
          params={{ noteId: note.id }}
          className="btn ghost"
        >
          Open
        </Link>
        <button
          type="button"
          className="btn ghost note-delete-btn"
          onClick={() => handleDelete().catch(console.error)}
          disabled={deleting}
        >
          {deleting ? "Removing…" : "Remove"}
        </button>
      </div>
    </article>
  );
}
