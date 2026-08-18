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
  const isDeleted = note.deleted_at != null;
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    const label = note.title ?? "this note";
    if (!window.confirm(`Delete "${label}"?`)) return;
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
          · {formatUpdateDate(isDeleted ? note.created_at : note.updated_at)}
        </span>
      </header>

      <Link to="/notes/$noteId" params={{ noteId: note.id }} className="note-card-link">
        {note.title && <h3 className="note-title">{note.title}</h3>}
        <p className="note-body">{note.body}</p>
      </Link>

      {isDeleted && note.deleted_at != null && (
        <p className="note-deleted-meta hint">
          Deleted by{" "}
          {partnerLabel(
            note.deleted_by_partner_id ?? note.from_partner_id,
            currentPartnerId,
            note.deleted_by_label,
          )}{" "}
          · {formatUpdateDate(note.deleted_at)}
        </p>
      )}

      {error && <p className="hint error">{error}</p>}

      <div className="note-actions">
        <Link
          to="/notes/$noteId"
          params={{ noteId: note.id }}
          className="btn ghost"
        >
          Open
        </Link>
        {!isDeleted && (
          <button
            type="button"
            className="btn ghost note-delete-btn"
            onClick={() => handleDelete().catch(console.error)}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>
    </article>
  );
}
