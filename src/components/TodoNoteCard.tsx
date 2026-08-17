import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { todoProgress } from "../../shared/notes";
import { deleteNote, updateNote, type Note } from "../lib/api";
import { formatRelativeTime, formatUpdateDate } from "../lib/format";
import { partnerLabel } from "../lib/partner";

interface TodoNoteCardProps {
  note: Note;
  currentPartnerId: string;
  partnerName: string | null;
  onUpdated?: () => void;
  onDeleted?: () => void;
}

function completedByLabel(
  partnerId: string,
  currentPartnerId: string,
  partnerName: string | null,
): string {
  if (partnerId === currentPartnerId) return "You";
  return partnerName?.trim() || "Your partner";
}

export function TodoNoteCard({
  note,
  currentPartnerId,
  partnerName,
  onUpdated,
  onDeleted,
}: TodoNoteCardProps) {
  const isMine = note.from_partner_id === currentPartnerId;
  const items = note.items ?? [];
  const progress = todoProgress(items);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function toggleItem(itemId: string) {
    if (saving) return;
    const nextItems = items.map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item,
    );
    setSaving(true);
    setError("");
    try {
      await updateNote(note.id, {
        type: "todo",
        title: note.title ?? undefined,
        items: nextItems,
      });
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const label = note.title ?? "this list";
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
    <article className={`note-card todo-note-card card ${isMine ? "mine" : "theirs"}`}>
      <header>
        <span className="badge">list</span>
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
        <h3 className="note-title">{note.title}</h3>
        {items.length > 0 && (
          <p className="todo-progress hint">
            {progress.done}/{progress.total} done
          </p>
        )}
      </Link>

      <ul className="todo-list">
        {items.map((item) => (
          <li
            key={item.id}
            className={`todo-item ${item.done ? "done" : ""}`}
          >
            <label className="todo-item-label">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggleItem(item.id).catch(console.error)}
                disabled={saving || deleting}
              />
              <span className="todo-item-text">{item.text}</span>
            </label>
            {item.done && item.completedAt != null && (
              <span className="todo-item-meta hint">
                Checked by{" "}
                {completedByLabel(
                  item.completedBy ?? note.from_partner_id,
                  currentPartnerId,
                  partnerName,
                )}{" "}
                · {formatRelativeTime(item.completedAt)}
              </span>
            )}
          </li>
        ))}
      </ul>

      {error && <p className="hint error">{error}</p>}

      <div className="note-actions">
        <Link
          to="/notes/$noteId"
          params={{ noteId: note.id }}
          className="btn ghost"
        >
          Edit
        </Link>
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
