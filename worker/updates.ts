import { UPDATE_MAX_LENGTH, isGiphyUrl } from "../shared/updates";

export function normalizeUpdateText(text?: string): string | null {
  const trimmed = text?.trim();
  if (!trimmed || trimmed.length > UPDATE_MAX_LENGTH) {
    return null;
  }
  return trimmed;
}

export { isGiphyUrl, isGiphyUrl as isValidGiphyUrl };
