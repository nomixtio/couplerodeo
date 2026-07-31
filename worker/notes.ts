import {
  NOTE_BODY_MAX_LENGTH,
  NOTE_TITLE_MAX_LENGTH,
  NOTE_TODO_ITEM_MAX_LENGTH,
  NOTE_TODO_MAX_ITEMS,
  type NoteType,
  type TodoItem,
} from "../shared/notes";

export interface SimpleNoteInput {
  type: "simple";
  title: string | null;
  body: string;
}

export interface TodoNoteInput {
  type: "todo";
  title: string;
  items: TodoItem[];
}

export type NoteInput = SimpleNoteInput | TodoNoteInput;

export function normalizeNoteTitle(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > NOTE_TITLE_MAX_LENGTH) return null;
  return trimmed;
}

export function normalizeNoteBody(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > NOTE_BODY_MAX_LENGTH) return null;
  return trimmed;
}

function normalizeNoteType(value: unknown): NoteType | null {
  if (value === "simple" || value === "todo") return value;
  return null;
}

function normalizeIncomingTodoItem(
  value: unknown,
): { id: string; text: string; done: boolean } | null {
  if (typeof value !== "object" || value == null) return null;
  const item = value as Record<string, unknown>;
  const text =
    typeof item.text === "string" ? item.text.trim() : "";
  if (!text || text.length > NOTE_TODO_ITEM_MAX_LENGTH) return null;
  const id = typeof item.id === "string" && item.id.trim() ? item.id.trim() : "";
  const done = item.done === true;
  return { id, text, done };
}

export function normalizeTodoItems(
  value: unknown,
  assignId: () => string,
): TodoItem[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  if (value.length > NOTE_TODO_MAX_ITEMS) return null;

  const items: TodoItem[] = [];
  for (const raw of value) {
    const normalized = normalizeIncomingTodoItem(raw);
    if (!normalized) return null;
    items.push({
      id: normalized.id || assignId(),
      text: normalized.text,
      done: normalized.done,
    });
  }

  return items;
}

export function mergeTodoItems(
  existing: TodoItem[],
  incoming: TodoItem[],
  partnerId: string,
  now: number,
): TodoItem[] {
  const existingById = new Map(existing.map((item) => [item.id, item]));

  return incoming.map((item) => {
    const prev = existingById.get(item.id);
    if (!prev) {
      if (item.done) {
        return {
          ...item,
          completedBy: partnerId,
          completedAt: now,
        };
      }
      return item;
    }

    if (!prev.done && item.done) {
      return {
        ...item,
        completedBy: partnerId,
        completedAt: now,
      };
    }

    if (prev.done && !item.done) {
      return {
        ...item,
        completedBy: undefined,
        completedAt: undefined,
      };
    }

    if (item.done) {
      return {
        ...item,
        completedBy: prev.completedBy,
        completedAt: prev.completedAt,
      };
    }

    return item;
  });
}

export function findNewlyCompletedItems(
  existing: TodoItem[],
  merged: TodoItem[],
  partnerId: string,
): TodoItem[] {
  const existingById = new Map(existing.map((item) => [item.id, item]));
  return merged.filter((item) => {
    if (!item.done) return false;
    const prev = existingById.get(item.id);
    return !prev?.done && item.completedBy === partnerId;
  });
}

export function parseNoteBody(
  body: {
    type?: unknown;
    title?: unknown;
    body?: unknown;
    items?: unknown;
  },
  assignId: () => string,
):
  | { ok: true; data: NoteInput }
  | { ok: false; error: string } {
  const type = normalizeNoteType(body.type);
  if (!type) {
    return { ok: false, error: "Invalid note type" };
  }

  if (type === "simple") {
    const noteBody = normalizeNoteBody(body.body);
    if (!noteBody) {
      return {
        ok: false,
        error: `Body must be 1–${NOTE_BODY_MAX_LENGTH} characters`,
      };
    }

    const title = normalizeNoteTitle(body.title);
    if (body.title != null && body.title !== "" && title === null) {
      return {
        ok: false,
        error: `Title must be at most ${NOTE_TITLE_MAX_LENGTH} characters`,
      };
    }

    return { ok: true, data: { type: "simple", title, body: noteBody } };
  }

  const title = normalizeNoteTitle(body.title);
  if (!title) {
    return {
      ok: false,
      error: `Title must be 1–${NOTE_TITLE_MAX_LENGTH} characters`,
    };
  }

  const items = normalizeTodoItems(body.items, assignId);
  if (!items) {
    return {
      ok: false,
      error: `Add 1–${NOTE_TODO_MAX_ITEMS} items (${NOTE_TODO_ITEM_MAX_LENGTH} chars max each)`,
    };
  }

  return { ok: true, data: { type: "todo", title, items } };
}

export function serializeTodoItems(items: TodoItem[]): string {
  return JSON.stringify(items);
}
