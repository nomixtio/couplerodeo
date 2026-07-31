export const NOTE_TITLE_MAX_LENGTH = 120;
export const NOTE_BODY_MAX_LENGTH = 2000;
export const NOTE_TODO_ITEM_MAX_LENGTH = 500;
export const NOTE_TODO_MAX_ITEMS = 30;

export type NoteType = "simple" | "todo";

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  completedBy?: string;
  completedAt?: number;
}

export function parseTodoItemsJson(itemsJson: string | null): TodoItem[] {
  if (!itemsJson) return [];
  try {
    const parsed = JSON.parse(itemsJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is TodoItem =>
        typeof item === "object" &&
        item != null &&
        typeof (item as TodoItem).id === "string" &&
        typeof (item as TodoItem).text === "string" &&
        typeof (item as TodoItem).done === "boolean",
    );
  } catch {
    return [];
  }
}

export function todoProgress(items: TodoItem[]): { done: number; total: number } {
  const total = items.length;
  const done = items.filter((item) => item.done).length;
  return { done, total };
}
