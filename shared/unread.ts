export const UNREAD_SECTIONS = ["updates", "notes", "calendar", "plans"] as const;

export type UnreadSection = (typeof UNREAD_SECTIONS)[number];

export type UnreadCounts = Record<UnreadSection, number> & { total: number };

export const EMPTY_UNREAD_COUNTS: UnreadCounts = {
  updates: 0,
  notes: 0,
  calendar: 0,
  plans: 0,
  total: 0,
};

export function sumUnreadCounts(counts: Omit<UnreadCounts, "total">): number {
  return UNREAD_SECTIONS.reduce((sum, section) => sum + counts[section], 0);
}

export const MENU_UNREAD_SECTIONS: Partial<
  Record<string, UnreadSection>
> = {
  "/updates": "updates",
  "/notes": "notes",
  "/calendar": "calendar",
  "/plans": "plans",
};

export function isUnreadSection(value: unknown): value is UnreadSection {
  return (
    typeof value === "string" &&
    (UNREAD_SECTIONS as readonly string[]).includes(value)
  );
}
