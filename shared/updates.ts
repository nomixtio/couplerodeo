import updatePresets from "./update-presets.json";

export const UPDATE_MAX_LENGTH = 200;

export const UPDATES_PAGE_SIZE = 25;

/** Quick-pick labels on the Updates send screen — edit shared/update-presets.json */
export const PREMADE_UPDATES: readonly string[] = updatePresets;

export type QuickUpdateIcon =
  | "five"
  | "ten"
  | "thirty"
  | "elevator"
  | "cab"
  | "home"
  | "office";

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
];

const QUICK_ICON_BY_TEXT = new Map(
  QUICK_UPDATE_PRESETS.map((preset) => [preset.text, preset.icon]),
);

export function quickUpdateIconForText(text: string): QuickUpdateIcon | null {
  return QUICK_ICON_BY_TEXT.get(text) ?? null;
}
