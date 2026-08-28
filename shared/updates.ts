import updatePresets from "./update-presets.json";
import { normalizeCatalogOpenMojiHex } from "./openmoji";

export const UPDATE_MAX_LENGTH = 200;

export const UPDATES_PAGE_SIZE = 25;

export const QUICK_UPDATE_ICON_MIN = 4;
export const QUICK_UPDATE_ICON_MAX = 10;
export const QUICK_UPDATE_TOTAL_MAX = 20;
export const QUICK_UPDATE_COLLAPSED_ONE_ROW_HEIGHT = 48;
export const QUICK_UPDATE_COLLAPSED_TWO_ROW_HEIGHT = 80;

export type UpdateKind =
  | "text"
  | "love"
  | "capacity"
  | "question"
  | "location"
  | "media";

export type UpdateResponseKind = "gif" | "answer" | "emoji";

export type QuickUpdatesSource = "mine" | "partner";

export interface QuickUpdateItem {
  id: string;
  text: string;
  icon: string | null;
}

export interface QuickUpdatesPayload {
  mine: QuickUpdateItem[];
  partner: QuickUpdateItem[] | null;
  source: QuickUpdatesSource;
  active: QuickUpdateItem[];
}

export function normalizeUpdateKind(value: unknown): UpdateKind {
  if (
    value === "love" ||
    value === "capacity" ||
    value === "question" ||
    value === "location" ||
    value === "media"
  ) {
    return value;
  }
  return "text";
}

export function normalizeUpdateResponseKind(value: unknown): UpdateResponseKind {
  if (value === "answer") return "answer";
  if (value === "emoji") return "emoji";
  return "gif";
}

/** Quick-pick labels on the Updates send screen — edit shared/update-presets.json */
export const PREMADE_UPDATES: readonly string[] = updatePresets;

export type QuickUpdateIcon = string;

interface DefaultQuickUpdatePreset {
  text: string;
  icon: string;
}

/** Icons shown on the collapsed Updates drawer by default */
const DEFAULT_ICON_PRESETS: readonly DefaultQuickUpdatePreset[] = [
  { text: "Will be there in 5", icon: "0035-FE0F-20E3" },
  { text: "Will be there in 10", icon: "1F51F" },
  { text: "In the elevator", icon: "1F6D7" },
  { text: "In the cab", icon: "1F695" },
  { text: "At home", icon: "1F3E0" },
  { text: "At the office", icon: "1F3E2" },
  { text: "At the store", icon: "1F3EA" },
  { text: "Running late", icon: "1F3C3" },
  { text: "smoke", icon: "1F6AC" },
];

const DEFAULT_ICON_BY_TEXT = new Map(
  DEFAULT_ICON_PRESETS.map((preset) => [preset.text, preset.icon] as const),
);

export function defaultQuickUpdateItems(): QuickUpdateItem[] {
  return PREMADE_UPDATES.map((text, index) => ({
    id: `default-${index}`,
    text,
    icon: DEFAULT_ICON_BY_TEXT.get(text) ?? null,
  }));
}

export function normalizeQuickUpdatesSource(value: unknown): QuickUpdatesSource {
  return value === "partner" ? "partner" : "mine";
}

export function quickUpdateIconItems(
  items: QuickUpdateItem[],
): Array<QuickUpdateItem & { icon: string }> {
  return items.filter(
    (item): item is QuickUpdateItem & { icon: string } => Boolean(item.icon),
  );
}

export function quickUpdateIconCount(items: QuickUpdateItem[]): number {
  return quickUpdateIconItems(items).length;
}

export function canAddQuickUpdate(items: QuickUpdateItem[]): boolean {
  return items.length < QUICK_UPDATE_TOTAL_MAX;
}

export function canAddQuickUpdateIcon(items: QuickUpdateItem[]): boolean {
  return quickUpdateIconCount(items) < QUICK_UPDATE_ICON_MAX;
}

export function canRemoveQuickUpdate(
  items: QuickUpdateItem[],
  id: string,
): boolean {
  const item = items.find((entry) => entry.id === id);
  if (!item) return false;
  if (item.icon && quickUpdateIconCount(items) <= QUICK_UPDATE_ICON_MIN) {
    return false;
  }
  return true;
}

export function canClearQuickUpdateIcon(
  items: QuickUpdateItem[],
  id: string,
): boolean {
  const item = items.find((entry) => entry.id === id);
  if (!item?.icon) return false;
  return quickUpdateIconCount(items) > QUICK_UPDATE_ICON_MIN;
}

export function quickUpdateCollapsedRowCounts(iconCount: number): number[] {
  if (iconCount <= 0) return [0];
  if (iconCount <= 5) return [iconCount];
  if (iconCount === 6) return [3, 3];
  if (iconCount === 7) return [4, 3];
  if (iconCount === 8) return [4, 4];
  if (iconCount === 9) return [5, 4];
  return [5, iconCount - 5];
}

export function quickUpdateCollapsedHeight(iconCount: number): number {
  const rows = quickUpdateCollapsedRowCounts(iconCount);
  return rows.length <= 1
    ? QUICK_UPDATE_COLLAPSED_ONE_ROW_HEIGHT
    : QUICK_UPDATE_COLLAPSED_TWO_ROW_HEIGHT;
}

/** 1-based grid-column start on a 10-column grid (each icon spans 2). */
export function quickUpdateIconGridColumn(
  iconCount: number,
  index: number,
): number {
  const rows = quickUpdateCollapsedRowCounts(iconCount);
  let offset = 0;
  for (const count of rows) {
    if (index < offset + count) {
      const positionInRow = index - offset;
      return 1 + (10 - 2 * count) / 2 + positionInRow * 2;
    }
    offset += count;
  }
  return 1;
}

function normalizeQuickUpdateId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  if (!id || id.length > 64) return null;
  return id;
}

function normalizeQuickUpdateText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text.length > UPDATE_MAX_LENGTH) return null;
  return text;
}

function normalizeQuickUpdateIcon(value: unknown): string | null | undefined {
  if (value == null || value === "") return null;
  const icon = normalizeCatalogOpenMojiHex(value);
  return icon ?? undefined;
}

export function parseQuickUpdateItems(
  value: unknown,
): { ok: true; items: QuickUpdateItem[] } | { ok: false; error: string } {
  if (!Array.isArray(value)) {
    return { ok: false, error: "Quick updates must be a list" };
  }
  if (value.length > QUICK_UPDATE_TOTAL_MAX) {
    return {
      ok: false,
      error: `At most ${QUICK_UPDATE_TOTAL_MAX} quick updates`,
    };
  }

  const items: QuickUpdateItem[] = [];
  const seen = new Set<string>();

  for (const raw of value) {
    if (typeof raw !== "object" || raw == null) {
      return { ok: false, error: "Invalid quick update" };
    }
    const entry = raw as Record<string, unknown>;
    const id = normalizeQuickUpdateId(entry.id);
    const text = normalizeQuickUpdateText(entry.text);
    const icon = normalizeQuickUpdateIcon(entry.icon);
    if (!id || !text || icon === undefined) {
      return { ok: false, error: "Each quick update needs text and a valid icon or none" };
    }
    if (seen.has(id)) {
      return { ok: false, error: "Quick update ids must be unique" };
    }
    seen.add(id);
    items.push({ id, text, icon });
  }

  const iconCount = quickUpdateIconCount(items);
  if (iconCount < QUICK_UPDATE_ICON_MIN || iconCount > QUICK_UPDATE_ICON_MAX) {
    return {
      ok: false,
      error: `Keep ${QUICK_UPDATE_ICON_MIN}–${QUICK_UPDATE_ICON_MAX} items with icons`,
    };
  }

  return { ok: true, items };
}

export function parseQuickUpdatesJson(raw: string | null | undefined): QuickUpdateItem[] {
  if (raw == null || raw === "") return defaultQuickUpdateItems();
  try {
    const parsed = parseQuickUpdateItems(JSON.parse(raw) as unknown);
    return parsed.ok ? parsed.items : defaultQuickUpdateItems();
  } catch {
    return defaultQuickUpdateItems();
  }
}

export function serializeQuickUpdateItems(items: QuickUpdateItem[]): string {
  return JSON.stringify(items);
}

export function resolveQuickUpdatesPayload(
  mineJson: string | null | undefined,
  partnerJson: string | null | undefined,
  storedSource: unknown,
  partnerConnected: boolean,
): QuickUpdatesPayload {
  const mine = parseQuickUpdatesJson(mineJson);
  const partner = partnerConnected ? parseQuickUpdatesJson(partnerJson) : null;
  const source: QuickUpdatesSource =
    normalizeQuickUpdatesSource(storedSource) === "partner" && partner
      ? "partner"
      : "mine";
  return {
    mine,
    partner,
    source,
    active: source === "partner" && partner ? partner : mine,
  };
}

export function isGiphyUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return (
      parsed.protocol === "https:" &&
      (parsed.hostname === "media.giphy.com" ||
        parsed.hostname.endsWith(".giphy.com") ||
        parsed.hostname === "i.giphy.com")
    );
  } catch {
    return false;
  }
}
