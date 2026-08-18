export type NotesTab = "new" | "all";

export type NotesFilter = "all" | "simple" | "todo" | "deleted";

export type NoteEditorType = "simple" | "todo";

export const NOTES_FILTER_LABELS: Record<NotesFilter, string> = {
  all: "All",
  simple: "Notes",
  todo: "Lists",
  deleted: "Deleted",
};

export function parseNotesTab(
  value: string | null | undefined,
): NotesTab {
  return value === "new" ? "new" : "all";
}

export function parseNoteEditorType(
  value: string | null | undefined,
): NoteEditorType {
  return value === "todo" ? "todo" : "simple";
}

export function parseNotePlanId(
  value: string | null | undefined,
): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function parseNotesFilter(
  value: string | null | undefined,
): NotesFilter {
  if (value === "simple" || value === "todo" || value === "deleted") return value;
  return "all";
}
