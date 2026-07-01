import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthorizedAdmin } from "@/lib/adminAuth";
import { validateQuizImport } from "@/lib/quizImport";

export async function GET(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { data: quizzes, error } = await supabaseAdmin
    .from("quizzes")
    .select(
      "id, theme, status, opened_at, closed_at, created_at, prize_first, prize_second, prize_third"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ quizzes });
}

export async function POST(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!validateQuizImport(body)) {
    return NextResponse.json(
      { error: "Format de fichier invalide" },
      { status: 400 }
    );
  }

  const { data: quiz, error: quizError } = await supabaseAdmin
    .from("quizzes")
    .insert({
      theme: body.theme.trim(),
      status: "open",
      opened_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (quizError || !quiz) {
    return NextResponse.json(
      { error: quizError?.message ?? "Création du quiz impossible" },
      { status: 500 }
    );
  }

  const questionsPayload = body.questions.map((q, index) => ({
    quiz_id: quiz.id,
    question_order: index + 1,
    question_text: q.question_text.trim(),
    choice_a: q.choice_a.trim(),
    choice_b: q.choice_b.trim(),
    choice_c: q.choice_c.trim(),
    choice_d: q.choice_d.trim(),
    correct_choice: q.correct_choice,
  }));

  const { error: questionsError } = await supabaseAdmin
    .from("questions")
    .insert(questionsPayload);

  if (questionsError) {
    await supabaseAdmin.from("quizzes").delete().eq("id", quiz.id);
    return NextResponse.json({ error: questionsError.message }, { status: 500 });
  }

  return NextResponse.json({ quiz });
}
