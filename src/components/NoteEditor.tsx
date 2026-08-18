import { Link } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState } from "react";
import {
  NOTE_BODY_MAX_LENGTH,
  NOTE_TITLE_MAX_LENGTH,
  NOTE_TODO_ITEM_MAX_LENGTH,
  NOTE_TODO_MAX_ITEMS,
} from "../../shared/notes";
import {
  createNote,
  deleteNote,
  updateNote,
  type Note,
  type NoteType,
  type TodoItem,
} from "../lib/api";
import { formatUpdateDate } from "../lib/format";
import { partnerLabel } from "../lib/partner";

interface NoteEditorProps {
  note?: Note;
  initialType?: NoteType;
  planId?: string;
  currentPartnerId: string;
  partnerName: string | null;
  backLink: { to: string; params?: Record<string, string>; search?: Record<string, string> };
  backLabel: string;
  onSaved?: (note: Note) => void;
  onDeleted?: () => void;
}

interface DraftTodoItem {
  id: string;
  text: string;
  done: boolean;
}

function newDraftItem(): DraftTodoItem {
  return { id: crypto.randomUUID(), text: "", done: false };
}

export function NoteEditor({
  note,
  initialType = "simple",
  planId,
  currentPartnerId,
  partnerName,
  backLink,
  backLabel,
  onSaved,
  onDeleted,
}: NoteEditorProps) {
  const isNew = !note;
  const isDeleted = note?.deleted_at != null;
  const formId = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const [noteType] = useState<NoteType>(note?.type ?? initialType);
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [items, setItems] = useState<DraftTodoItem[]>(
    note?.items?.map((item) => ({
      id: item.id,
      text: item.text,
      done: item.done,
    })) ?? [newDraftItem()],
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isNew) {
      titleRef.current?.focus();
    }
  }, [isNew]);

  function updateItem(id: string, text: string) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, text } : item)),
    );
  }

  function toggleItem(id: string) {
    if (isNew) return;
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    );
  }

  function addItem() {
    if (items.length >= NOTE_TODO_MAX_ITEMS) return;
    setItems((current) => [...current, newDraftItem()]);
  }

  function removeItem(id: string) {
    setItems((current) => {
      const next = current.filter((item) => item.id !== id);
      return next.length > 0 ? next : [newDraftItem()];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isDeleted) return;
    setError("");
    setSaving(true);

    try {
      if (noteType === "simple") {
        const payload = {
          type: "simple" as const,
          title: title.trim() || undefined,
          body: body.trim(),
        };

        if (!payload.body) {
          setError("Write something in your note");
          return;
        }

        if (isNew) {
          const result = await createNote({
            ...payload,
            planId,
          });
          onSaved?.(result.note);
        } else {
          const result = await updateNote(note.id, payload);
          onSaved?.(result.note);
        }
      } else {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
          setError("Add a title for your list");
          return;
        }

        const todoItems: TodoItem[] = items
          .map((item) => ({ ...item, text: item.text.trim() }))
          .filter((item) => item.text);

        if (todoItems.length === 0) {
          setError("Add at least one item");
          return;
        }

        if (isNew) {
          const result = await createNote({
            type: "todo",
            title: trimmedTitle,
            items: todoItems.map((item) => ({
              id: item.id,
              text: item.text,
              done: item.done,
            })),
            planId,
          });
          onSaved?.(result.note);
        } else {
          const result = await updateNote(note.id, {
            type: "todo",
            title: trimmedTitle,
            items: todoItems,
          });
          onSaved?.(result.note);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!note) return;
    const label = note.title ?? "this note";
    if (!window.confirm(`Delete "${label}"?`)) return;
    setDeleting(true);
    setError("");
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
    <div className="note-sheet">
      <header className="note-sheet-toolbar">
        <Link {...backLink} className="note-sheet-back">
          ← {backLabel}
        </Link>
        <div className="note-sheet-toolbar-actions">
          {!isNew && !isDeleted && (
            <button
              type="button"
              className="note-sheet-delete-btn"
              onClick={() => handleDelete().catch(console.error)}
              disabled={saving || deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          )}
          {!isDeleted && (
            <button
              type="submit"
              form={formId}
              className="note-sheet-done-btn"
              disabled={saving || deleting}
            >
              {saving ? "Saving…" : "Done"}
            </button>
          )}
        </div>
      </header>

      <div className={`note-sheet-surface note-sheet-surface--${noteType}`}>
        <form id={formId} onSubmit={handleSubmit} className="note-sheet-form">
          {noteType === "simple" ? (
            <>
              <input
                ref={titleRef}
                type="text"
                className="note-sheet-title"
                value={title}
                maxLength={NOTE_TITLE_MAX_LENGTH}
                onChange={(e) => setTitle(e.target.value)}
                disabled={saving || deleting || isDeleted}
                placeholder="Title"
                aria-label="Title"
              />
              <textarea
                className="note-sheet-body"
                value={body}
                maxLength={NOTE_BODY_MAX_LENGTH}
                onChange={(e) => setBody(e.target.value)}
                disabled={saving || deleting || isDeleted}
                placeholder="Start writing…"
                aria-label="Note"
              />
            </>
          ) : (
            <>
              <input
                ref={titleRef}
                type="text"
                className="note-sheet-title"
                value={title}
                maxLength={NOTE_TITLE_MAX_LENGTH}
                onChange={(e) => setTitle(e.target.value)}
                disabled={saving || deleting || isDeleted}
                placeholder="List title"
                aria-label="List title"
                required
              />
              <ul className="note-sheet-list">
                {items.map((item, index) => (
                  <li
                    key={item.id}
                    className={`note-sheet-list-item${item.done ? " done" : ""}`}
                  >
                    <button
                      type="button"
                      className={`note-sheet-check${item.done ? " checked" : ""}`}
                      aria-label={item.done ? "Mark incomplete" : "Mark complete"}
                      onClick={() => toggleItem(item.id)}
                      disabled={isNew || saving || deleting || isDeleted}
                    />
                    <input
                      type="text"
                      className="note-sheet-list-input"
                      value={item.text}
                      maxLength={NOTE_TODO_ITEM_MAX_LENGTH}
                      onChange={(e) => updateItem(item.id, e.target.value)}
                      disabled={saving || deleting || isDeleted}
                      placeholder={index === 0 ? "First item" : "List item"}
                      aria-label={`List item ${index + 1}`}
                    />
                    {!isDeleted && (
                      <button
                        type="button"
                        className="note-sheet-list-remove"
                        onClick={() => removeItem(item.id)}
                        disabled={saving || deleting}
                        aria-label="Remove item"
                      >
                        ×
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {items.length < NOTE_TODO_MAX_ITEMS && !isDeleted && (
                <button
                  type="button"
                  className="note-sheet-add-item"
                  onClick={addItem}
                  disabled={saving || deleting}
                >
                  New item
                </button>
              )}
            </>
          )}
        </form>
      </div>

      {isDeleted && note?.deleted_at != null && (
        <p className="hint note-sheet-error">
          Deleted by{" "}
          {partnerLabel(
            note.deleted_by_partner_id ?? note.from_partner_id,
            currentPartnerId,
            note.deleted_by_label ?? partnerName,
          )}{" "}
          · {formatUpdateDate(note.deleted_at)}
        </p>
      )}
      {error && <p className="hint error note-sheet-error">{error}</p>}
    </div>
  );
}
