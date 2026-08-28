import catalog from "./openmoji-catalog.json";
import punkCatalog from "./punk-emojis.json";

export interface OpenMojiItem {
  hexcode: string;
  annotation: string;
  group: string;
  tags: string;
}

export interface PunkEmojiItem {
  id: string;
  file: string;
  annotation: string;
  tags: string;
}

export const OPENMOJI_VERSION = catalog.version;

export const PUNK_GROUP_ID = "punk";

export const OPENMOJI_GROUPS = [
  { id: "smileys-emotion", label: "Smileys" },
  { id: "people-body", label: "People" },
  { id: "animals-nature", label: "Animals" },
  { id: "food-drink", label: "Food" },
  { id: "travel-places", label: "Travel" },
  { id: "activities", label: "Activities" },
  { id: "objects", label: "Objects" },
  { id: "symbols", label: "Symbols" },
  { id: "extras-openmoji", label: "Extra" },
] as const;

export type OpenMojiGroupId = (typeof OPENMOJI_GROUPS)[number]["id"];

export const OPENMOJI_CATALOG: readonly OpenMojiItem[] = catalog.emojis;

export const PUNK_EMOJIS: readonly PunkEmojiItem[] = punkCatalog;

export const PUNK_CATALOG: readonly OpenMojiItem[] = PUNK_EMOJIS.map((emoji) => ({
  hexcode: emoji.id,
  annotation: emoji.annotation,
  group: PUNK_GROUP_ID,
  tags: emoji.tags,
}));

const BY_HEX = new Map(
  OPENMOJI_CATALOG.map((emoji) => [emoji.hexcode, emoji] as const),
);

const BY_PUNK_ID = new Map(
  PUNK_EMOJIS.map((emoji) => [emoji.id, emoji] as const),
);

export const OPENMOJI_BUTTON_HEX = "1F60A";

export function normalizeEmojiId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim().toUpperCase();
  if (BY_HEX.has(id) || BY_PUNK_ID.has(id)) return id;
  return null;
}

export function normalizeOpenMojiHexcode(value: unknown): string | null {
  return normalizeEmojiId(value);
}

export function isOpenMojiHexcode(value: unknown): value is string {
  return normalizeEmojiId(value) != null;
}

export function openMojiImageUrl(hexcode: string): string {
  return `https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@${OPENMOJI_VERSION}/color/72x72/${hexcode}.png`;
}

export function emojiImageUrl(id: string): string {
  const punk = BY_PUNK_ID.get(id.toUpperCase());
  if (punk) return `/emojis/punk/${punk.file}`;
  return openMojiImageUrl(id);
}

export function openMojiByHexcode(hexcode: string): OpenMojiItem | undefined {
  return BY_HEX.get(hexcode);
}

export function emojiById(id: string): OpenMojiItem | PunkEmojiItem | undefined {
  const key = id.toUpperCase();
  return BY_HEX.get(key) ?? BY_PUNK_ID.get(key);
}
