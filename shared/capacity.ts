export function formatCapacityBody(level: number): string {
  if (level <= 25) {
    return "Running low — could use extra gentleness today";
  }
  if (level <= 50) {
    return "Limited capacity right now";
  }
  if (level <= 75) {
    return "Doing okay";
  }
  return "Feeling good — ready to be of service to you";
}

export function serializeCapacityLevel(level: number): string {
  return String(level);
}

export function parseCapacityLevel(value: string): number | null {
  if (!/^\d{1,3}$/.test(value.trim())) return null;
  const level = Number(value.trim());
  if (!Number.isInteger(level) || level < 0 || level > 100) return null;
  return level;
}

export function capacityLevelColor(level: number, lightness = 42): string {
  return `hsl(${Math.round(level * 1.2)}, 65%, ${lightness}%)`;
}
