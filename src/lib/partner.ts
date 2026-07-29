import { APP_SLUG } from "./app";

const STORAGE_KEY = `${APP_SLUG}-session-token`;

export function getSessionToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setSessionToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasSession(): boolean {
  return getSessionToken() !== null;
}

export function partnerDisplayName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  return trimmed || "your partner";
}

export function partnerLabel(
  partnerId: string,
  currentPartnerId: string,
  name?: string | null,
): string {
  if (partnerId === currentPartnerId) return "You";
  return name?.trim() || "Your partner";
}
