export const CHOICE_CUSTOM_ANSWER_MAX_LENGTH = 200;

export function parseChoiceQuestionOptions(
  optionsJson: string | null,
): string[] {
  if (!optionsJson) return [];
  try {
    const parsed = JSON.parse(optionsJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(String).map((option) => option.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function normalizeChoiceAnswerValue(
  value: unknown,
  options: string[],
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (options.includes(trimmed)) return trimmed;
  if (trimmed.length > CHOICE_CUSTOM_ANSWER_MAX_LENGTH) return null;
  return trimmed;
}
