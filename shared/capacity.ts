export function formatCapacityBody(level: number): string {
  if (level <= 25) {
    return "Running low — could use extra gentleness today";
  }
  if (level <= 50) {
    return `Limited capacity right now (${level}%)`;
  }
  if (level <= 75) {
    return `Doing okay (${level}% capacity)`;
  }
  return `Feeling good — full of energy (${level}%)`;
}
