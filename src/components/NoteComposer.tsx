import { useState } from "react";
import {
  NOTE_BODY_MAX_LENGTH,
  NOTE_TITLE_MAX_LENGTH,
  NOTE_TODO_ITEM_MAX_LENGTH,
  NOTE_TODO_MAX_ITEMS,
} from "../../shared/notes";
import { createNote, type NoteType } from "../lib/api";

interface NoteComposerProps {
  onCreated?: () => void;
}

interface DraftTodoItem {
  id: string;
  text: string;
}

function newDraftItem(): DraftTodoItem {
  return { id: crypto.randomUUID(), text: "" };
}

export function NoteComposer({ onCreated }: NoteComposerProps) {
  const [noteType, setNoteType] = useState<NoteType>("simple");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [items, setItems] = useState<DraftTodoItem[]>([newDraftItem()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function resetForm(type: NoteType) {
    setNoteType(type);
    setTitle("");
    setBody("");
    setItems([newDraftItem()]);
    setError("");
  }

  function updateItem(id: string, text: string) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, text } : item)),
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
    setError("");
    setSaving(true);

    try {
      if (noteType === "simple") {
        await createNote({
          type: "simple",
          title: title.trim() || undefined,
          body: body.trim(),
        });
      } else {
        const todoItems = items
          .map((item) => item.text.trim())
          .filter(Boolean);
        if (!title.trim()) {
          setError("List title is required");
          return;
        }
        if (todoItems.length === 0) {
          setError("Add at least one item");
          return;
        }
        await createNote({
          type: "todo",
          title: title.trim(),
          items: todoItems.map((text) => ({ text, done: false })),
        });
      }

      resetForm(noteType);
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="note-composer card">
      <h2>Create a note</h2>
      <p className="hint">
        Shared with your partner — simple notes or collaborative lists.
      </p>

      <div className="note-type-toggle" role="group" aria-label="Note type">
        <button
          type="button"
          className={noteType === "simple" ? "active" : ""}
          onClick={() => resetForm("simple")}
          disabled={saving}
        >
          Note
        </button>
        <button
          type="button"
          className={noteType === "todo" ? "active" : ""}
          onClick={() => resetForm("todo")}
          disabled={saving}
        >
          List
        </button>
      </div>

      <form onSubmit={handleSubmit} className="note-form">
        {noteType === "simple" ? (
          <>
            <label>
              Title (optional)
              <input
                type="text"
                value={title}
                maxLength={NOTE_TITLE_MAX_LENGTH}
                onChange={(e) => setTitle(e.target.value)}
                disabled={saving}
                placeholder="Gift ideas, restaurant name…"
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
                placeholder="Write your note…"
              />
            </label>
          </>
        ) : (
          <>
            <label>
              List title
              <input
                type="text"
                value={title}
                maxLength={NOTE_TITLE_MAX_LENGTH}
                onChange={(e) => setTitle(e.target.value)}
                disabled={saving}
                required
                placeholder="Groceries, packing list…"
              />
            </label>
            <fieldset className="todo-draft-list">
              <legend>Items</legend>
              {items.map((item, index) => (
                <div key={item.id} className="todo-draft-row">
                  <input
                    type="text"
                    value={item.text}
                    maxLength={NOTE_TODO_ITEM_MAX_LENGTH}
                    onChange={(e) => updateItem(item.id, e.target.value)}
                    disabled={saving}
                    placeholder={`Item ${index + 1}`}
                  />
                  <button
                    type="button"
                    className="btn ghost todo-remove-btn"
                    onClick={() => removeItem(item.id)}
                    disabled={saving}
                    aria-label="Remove item"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {items.length < NOTE_TODO_MAX_ITEMS && (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={addItem}
                  disabled={saving}
                >
                  Add item
                </button>
              )}
            </fieldset>
          </>
        )}

        {error && <p className="hint error">{error}</p>}

        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
