import { useState } from "react";
import {
  NOTE_BODY_MAX_LENGTH,
  NOTE_TITLE_MAX_LENGTH,
} from "../../shared/notes";
import { deleteNote, updateNote, type Note } from "../lib/api";
import { formatUpdateDate } from "../lib/format";
import { partnerLabel } from "../lib/partner";

interface SimpleNoteCardProps {
  note: Note;
  currentPartnerId: string;
  onUpdated?: () => void;
  onDeleted?: () => void;
}

export function SimpleNoteCard({
  note,
  currentPartnerId,
  onUpdated,
  onDeleted,
}: SimpleNoteCardProps) {
  const isMine = note.from_partner_id === currentPartnerId;
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(note.title ?? "");
  const [body, setBody] = useState(note.body ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");
    setSaving(true);
    try {
      await updateNote(note.id, {
        type: "simple",
        title: title.trim() || undefined,
        body: body.trim(),
      });
      setEditing(false);
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

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

  function cancelEdit() {
    setTitle(note.title ?? "");
    setBody(note.body ?? "");
    setEditing(false);
    setError("");
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

      {editing ? (
        <div className="note-edit-form">
          <label>
            Title (optional)
            <input
              type="text"
              value={title}
              maxLength={NOTE_TITLE_MAX_LENGTH}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
            />
          </label>
          <label>
            Note
            <textarea
              value={body}
              maxLength={NOTE_BODY_MAX_LENGTH}
              onChange={(e) => setBody(e.target.value)}
              disabled={saving}
              rows={5}
              required
            />
          </label>
        </div>
      ) : (
        <>
          {note.title && <h3 className="note-title">{note.title}</h3>}
          <p className="note-body">{note.body}</p>
        </>
      )}

      {error && <p className="hint error">{error}</p>}

      <div className="note-actions">
        {editing ? (
          <>
            <button
              type="button"
              className="btn primary"
              onClick={() => handleSave().catch(console.error)}
              disabled={saving || deleting}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={cancelEdit}
              disabled={saving || deleting}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn ghost"
            onClick={() => setEditing(true)}
            disabled={deleting}
          >
            Edit
          </button>
        )}
        <button
          type="button"
          className="btn ghost note-delete-btn"
          onClick={() => handleDelete().catch(console.error)}
          disabled={saving || deleting}
        >
          {deleting ? "Removing…" : "Remove"}
        </button>
      </div>
    </article>
  );
}
