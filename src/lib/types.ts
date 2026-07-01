export type QuizStatus = "draft" | "open" | "closed";
export type Choice = "A" | "B" | "C" | "D";

export interface Quiz {
  id: string;
  theme: string;
  status: QuizStatus;
  opened_at: string | null;
  closed_at: string | null;
  created_at: string;
  prize_first: string | null;
  prize_second: string | null;
  prize_third: string | null;
}

export interface Question {
  id: string;
  quiz_id: string;
  question_order: number;
  question_text: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_choice: Choice;
}

export interface Participation {
  id: string;
  quiz_id: string;
  pseudo_instagram: string;
  answers: Record<string, Choice>;
  correct_count: number;
  duration_seconds: number;
  submitted_at: string;
}

export interface QuestionInput {
  question_text: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_choice: Choice;
}

export interface QuizImport {
  theme: string;
  questions: QuestionInput[];
}
