import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { authorizeAdmin } from "@/lib/adminAuth";
import { validateQuizImport } from "@/lib/quizImport";

const QUIZ_COLUMNS =
  "id, theme, status, opened_at, closed_at, created_at, prize_first, prize_second, prize_third, archived, auto_close_at";

export async function GET(request: Request) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  // Self-healing sweep: close any quiz whose auto-close deadline has passed.
  await supabaseAdmin
    .from("quizzes")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("status", "open")
    .not("auto_close_at", "is", null)
    .lt("auto_close_at", new Date().toISOString());

  const includeArchived = new URL(request.url).searchParams.get("archived") === "1";

  let query = supabaseAdmin
    .from("quizzes")
    .select(QUIZ_COLUMNS)
    .order("created_at", { ascending: false });

  if (!includeArchived) {
    query = query.eq("archived", false);
  }

  const { data: quizzes, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ quizzes });
}

const AUTO_CLOSE_HOURS = [24, 48, 72, 168];

export async function POST(request: Request) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  if (!validateQuizImport(body)) {
    return NextResponse.json(
      { error: "Format de fichier invalide" },
      { status: 400 }
    );
  }

  const rawHours = (body as unknown as Record<string, unknown>).auto_close_hours;
  const autoCloseHours =
    typeof rawHours === "number" && AUTO_CLOSE_HOURS.includes(rawHours) ? rawHours : null;
  const autoCloseAt = autoCloseHours
    ? new Date(Date.now() + autoCloseHours * 60 * 60 * 1000).toISOString()
    : null;

  const { data: quiz, error: quizError } = await supabaseAdmin
    .from("quizzes")
    .insert({
      theme: body.theme.trim(),
      status: "open",
      opened_at: new Date().toISOString(),
      auto_close_at: autoCloseAt,
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
