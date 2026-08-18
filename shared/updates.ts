import updatePresets from "./update-presets.json";

export const UPDATE_MAX_LENGTH = 200;

export const UPDATES_PAGE_SIZE = 25;

export type UpdateKind = "text" | "love" | "capacity" | "question" | "location";

export type UpdateResponseKind = "gif" | "answer";

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
  return value === "answer" ? "answer" : "gif";
}

/** Quick-pick labels on the Updates send screen — edit shared/update-presets.json */
export const PREMADE_UPDATES: readonly string[] = updatePresets;

export type QuickUpdateIcon =
  | "five"
  | "ten"
  | "thirty"
  | "elevator"
  | "cab"
  | "home"
  | "office"
  | "store"
  | "late";

export interface QuickUpdatePreset {
  text: string;
  icon: QuickUpdateIcon;
  label: string;
}

/** Icons shown on the collapsed Updates drawer */
export const QUICK_UPDATE_PRESETS: readonly QuickUpdatePreset[] = [
  { text: "Will be there in 5", icon: "five", label: "5 min" },
  { text: "Will be there in 10", icon: "ten", label: "10 min" },
  { text: "Will be there in 30", icon: "thirty", label: "30 min" },
  { text: "In the elevator", icon: "elevator", label: "Elevator" },
  { text: "In the cab", icon: "cab", label: "Cab" },
  { text: "At home", icon: "home", label: "Home" },
  { text: "At the office", icon: "office", label: "Office" },
  { text: "At the store", icon: "store", label: "Store" },
  { text: "Running late", icon: "late", label: "Running late" },
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
