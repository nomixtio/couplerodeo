export const CHOICE_CUSTOM_ANSWER_MAX_LENGTH = 200;

export const QUESTION_MAX_LENGTH = 200;

export type QuestionType = "choice" | "scale";

export interface QuestionPayload {
  type: QuestionType;
  options: string[] | null;
}

export function isQuestionType(value: unknown): value is QuestionType {
  return value === "choice" || value === "scale";
}

export function normalizeQuestionText(text?: string): string | null {
  const trimmed = text?.trim();
  if (!trimmed || trimmed.length > QUESTION_MAX_LENGTH) {
    return null;
  }
  return trimmed;
}

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

export function serializeQuestionPayload(payload: {
  type: QuestionType;
  options?: string[] | null;
}): string {
  const options =
    payload.type === "choice"
      ? (payload.options ?? [])
          .map((option) => option.trim())
          .filter(Boolean)
      : null;
  return JSON.stringify({ type: payload.type, options });
}

export function parseQuestionPayload(
  json: string | null | undefined,
): QuestionPayload | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const type = (parsed as { type?: unknown }).type;
    if (!isQuestionType(type)) return null;
    const optionsRaw = (parsed as { options?: unknown }).options;
    const options =
      type === "choice" && Array.isArray(optionsRaw)
        ? optionsRaw.map(String).map((option) => option.trim()).filter(Boolean)
        : null;
    if (type === "choice" && (!options || options.length < 2)) return null;
    return { type, options };
  } catch {
    return null;
  }
}
