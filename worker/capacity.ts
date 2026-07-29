import { formatCapacityBody } from "../shared/capacity";

export function normalizeCapacityLevel(
  level: unknown,
): number | null {
  if (typeof level !== "number" || !Number.isInteger(level)) {
    return null;
  }
  if (level < 0 || level > 100) {
    return null;
  }
  return level;
}

export function formatCapacityForPush(
  partnerName: string,
  level: number,
): { title: string; body: string } {
  return {
    title: `${partnerName} checked in`,
    body: formatCapacityBody(level),
  };
}
