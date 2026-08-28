import updatePresets from "./update-presets.json";

export const UPDATE_MAX_LENGTH = 200;

export const UPDATES_PAGE_SIZE = 25;

export type UpdateKind = "text" | "love" | "capacity" | "question" | "location";

export type UpdateResponseKind = "gif" | "answer" | "emoji";

export function normalizeUpdateKind(value: unknown): UpdateKind {
  if (
    value === "love" ||
    value === "capacity" ||
    value === "question" ||
    value === "location"
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

/** OpenMoji hexcodes used as quick-pick icons */
export type QuickUpdateIcon =
  | "0035-FE0F-20E3"
  | "1F51F"
  | "1F6D7"
  | "1F695"
  | "1F3E0"
  | "1F3E2"
  | "1F3EA"
  | "1F3C3"
  | "1F6AC";

export interface QuickUpdatePreset {
  text: string;
  icon: QuickUpdateIcon;
  label: string;
}

/** Icons shown on the collapsed Updates drawer */
export const QUICK_UPDATE_PRESETS: readonly QuickUpdatePreset[] = [
  { text: "Will be there in 5", icon: "0035-FE0F-20E3", label: "5 min" },
  { text: "Will be there in 10", icon: "1F51F", label: "10 min" },
  { text: "In the elevator", icon: "1F6D7", label: "Elevator" },
  { text: "In the cab", icon: "1F695", label: "Cab" },
  { text: "At home", icon: "1F3E0", label: "Home" },
  { text: "At the office", icon: "1F3E2", label: "Office" },
  { text: "At the store", icon: "1F3EA", label: "Store" },
  { text: "Running late", icon: "1F3C3", label: "Running late" },
  { text: "smoke", icon: "1F6AC", label: "Smoke" },
];

const QUICK_ICON_BY_TEXT = new Map<string, QuickUpdateIcon>([
  ...QUICK_UPDATE_PRESETS.map((preset) => [preset.text, preset.icon] as const),
]);

export function quickUpdateIconForText(text: string): QuickUpdateIcon | null {
  return QUICK_ICON_BY_TEXT.get(text) ?? null;
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
