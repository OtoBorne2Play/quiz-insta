import type { QuestionInput, QuizImport } from "@/lib/types";

export function isQuestionInput(value: unknown): value is QuestionInput {
  if (typeof value !== "object" || value === null) return false;
  const q = value as Record<string, unknown>;
  return (
    typeof q.question_text === "string" &&
    q.question_text.trim().length > 0 &&
    typeof q.choice_a === "string" &&
    q.choice_a.trim().length > 0 &&
    typeof q.choice_b === "string" &&
    q.choice_b.trim().length > 0 &&
    typeof q.choice_c === "string" &&
    q.choice_c.trim().length > 0 &&
    typeof q.choice_d === "string" &&
    q.choice_d.trim().length > 0 &&
    (q.correct_choice === "A" ||
      q.correct_choice === "B" ||
      q.correct_choice === "C" ||
      q.correct_choice === "D")
  );
}

export function validateQuizImport(body: unknown): body is QuizImport {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  if (typeof b.theme !== "string" || !b.theme.trim()) return false;
  if (!Array.isArray(b.questions) || b.questions.length === 0) return false;
  return b.questions.every(isQuestionInput);
}
