import { useState } from "react";
import {
  NOTE_TITLE_MAX_LENGTH,
  NOTE_TODO_ITEM_MAX_LENGTH,
  NOTE_TODO_MAX_ITEMS,
  todoProgress,
} from "../../shared/notes";
import {
  deleteNote,
  updateNote,
  type Note,
  type TodoItem,
} from "../lib/api";
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
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(note.title ?? "");
  const [draftItems, setDraftItems] = useState<TodoItem[]>(items);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function persistItems(nextItems: TodoItem[]) {
    setError("");
    setSaving(true);
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

  async function toggleItem(itemId: string) {
    if (editing || saving) return;
    const nextItems = items.map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item,
    );
    await persistItems(nextItems);
  }

  function updateDraftItem(id: string, text: string) {
    setDraftItems((current) =>
      current.map((item) => (item.id === id ? { ...item, text } : item)),
    );
  }

  function addDraftItem() {
    if (draftItems.length >= NOTE_TODO_MAX_ITEMS) return;
    setDraftItems((current) => [
      ...current,
      { id: crypto.randomUUID(), text: "", done: false },
    ]);
  }

  function removeDraftItem(id: string) {
    setDraftItems((current) => {
      const next = current.filter((item) => item.id !== id);
      return next.length > 0 ? next : [{ id: crypto.randomUUID(), text: "", done: false }];
    });
  }

  async function handleSaveEdit() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("List title is required");
      return;
    }

    const nextItems = draftItems
      .map((item) => ({ ...item, text: item.text.trim() }))
      .filter((item) => item.text);

    if (nextItems.length === 0) {
      setError("Add at least one item");
      return;
    }

    setError("");
    setSaving(true);
    try {
      await updateNote(note.id, {
        type: "todo",
        title: trimmedTitle,
        items: nextItems,
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

  function cancelEdit() {
    setTitle(note.title ?? "");
    setDraftItems(items);
    setEditing(false);
    setError("");
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

      {editing ? (
        <div className="note-edit-form">
          <label>
            List title
            <input
              type="text"
              value={title}
              maxLength={NOTE_TITLE_MAX_LENGTH}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
              required
            />
          </label>
          <fieldset className="todo-draft-list">
            <legend>Items</legend>
            {draftItems.map((item, index) => (
              <div key={item.id} className="todo-draft-row">
                <input
                  type="text"
                  value={item.text}
                  maxLength={NOTE_TODO_ITEM_MAX_LENGTH}
                  onChange={(e) => updateDraftItem(item.id, e.target.value)}
                  disabled={saving}
                  placeholder={`Item ${index + 1}`}
                />
                <button
                  type="button"
                  className="btn ghost todo-remove-btn"
                  onClick={() => removeDraftItem(item.id)}
                  disabled={saving}
                >
                  Remove
                </button>
              </div>
            ))}
            {draftItems.length < NOTE_TODO_MAX_ITEMS && (
              <button
                type="button"
                className="btn ghost"
                onClick={addDraftItem}
                disabled={saving}
              >
                Add item
              </button>
            )}
          </fieldset>
        </div>
      ) : (
        <>
          <h3 className="note-title">{note.title}</h3>
          {items.length > 0 && (
            <p className="todo-progress hint">
              {progress.done}/{progress.total} done
            </p>
          )}
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
        </>
      )}

      {error && <p className="hint error">{error}</p>}

      <div className="note-actions">
        {editing ? (
          <>
            <button
              type="button"
              className="btn primary"
              onClick={() => handleSaveEdit().catch(console.error)}
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
            onClick={() => {
              setDraftItems(items);
              setEditing(true);
            }}
            disabled={deleting || saving}
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
