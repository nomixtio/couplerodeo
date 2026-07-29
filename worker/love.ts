export const LOVE_MESSAGE_MAX_LENGTH = 60;

export function normalizeLoveMessage(message?: string): string {
  return message?.trim().slice(0, LOVE_MESSAGE_MAX_LENGTH) ?? "";
}
