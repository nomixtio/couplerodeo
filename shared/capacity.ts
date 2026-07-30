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
