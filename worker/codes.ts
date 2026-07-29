const INVITE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const chars = Array.from(
    bytes,
    (byte) => INVITE_ALPHABET[byte % INVITE_ALPHABET.length],
  );
  return `${chars.slice(0, 3).join("")}-${chars.slice(3).join("")}`;
}

export function normalizeInviteCode(code: string): string {
  return code.replace(/-/g, "").trim().toUpperCase();
}

export function formatInviteCode(normalized: string): string {
  if (normalized.length !== 6) return normalized;
  return `${normalized.slice(0, 3)}-${normalized.slice(3)}`;
}

export function generateRecoveryCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => INVITE_ALPHABET[byte % INVITE_ALPHABET.length]).join(
    "",
  );
}
