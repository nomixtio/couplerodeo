export type NotesTab = "new" | "all";

export type NotesFilter = "all" | "simple" | "todo";

export function parseNotesTab(
  value: string | null | undefined,
): NotesTab {
  if (value === "all") return "all";
  return "new";
}

export function parseNotesFilter(
  value: string | null | undefined,
): NotesFilter {
  if (value === "simple" || value === "todo") return value;
  return "all";
}
