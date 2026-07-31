import {
  normalizeChoiceAnswerValue,
  parseChoiceQuestionOptions,
} from "../shared/questions";

export function normalizeAnswerValue(
  questionType: string,
  value: unknown,
  optionsJson: string | null,
): { ok: true; value: string } | { ok: false; error: string } {
  if (questionType === "scale") {
    if (typeof value !== "string" || !["1", "2", "3", "4", "5"].includes(value)) {
      return { ok: false, error: "Pick a value from 1 to 5" };
    }
    return { ok: true, value };
  }

  if (questionType === "choice") {
    const options = parseChoiceQuestionOptions(optionsJson);
    const normalized = normalizeChoiceAnswerValue(value, options);
    if (!normalized) {
      return {
        ok: false,
        error: "Pick an option or write your own answer",
      };
    }
    return { ok: true, value: normalized };
  }

  return { ok: false, error: "Invalid question type" };
}
