import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { authorizeAdmin } from "@/lib/adminAuth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const fields = body as Record<string, unknown>;
  const toNullableText = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : null;

  const update: Record<string, unknown> = {};
  if ("prize_first" in fields) update.prize_first = toNullableText(fields.prize_first);
  if ("prize_second" in fields) update.prize_second = toNullableText(fields.prize_second);
  if ("prize_third" in fields) update.prize_third = toNullableText(fields.prize_third);
  if ("archived" in fields) update.archived = fields.archived === true;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Rien à mettre à jour" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("quizzes")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ quiz: data });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { id } = await params;

  await supabaseAdmin.from("participations").delete().eq("quiz_id", id);
  await supabaseAdmin.from("questions").delete().eq("quiz_id", id);
  const { error } = await supabaseAdmin.from("quizzes").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "ok" });
}
