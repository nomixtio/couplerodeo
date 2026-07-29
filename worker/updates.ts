import { UPDATE_MAX_LENGTH } from "../shared/updates";

export function normalizeUpdateText(text?: string): string | null {
  const trimmed = text?.trim();
  if (!trimmed || trimmed.length > UPDATE_MAX_LENGTH) {
    return null;
  }
  return trimmed;
}

export function isValidGiphyUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
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
