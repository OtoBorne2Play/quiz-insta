import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthorizedAdmin } from "@/lib/adminAuth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const { prize_first, prize_second, prize_third } = body as Record<string, unknown>;
  const toNullableText = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : null;

  const { data, error } = await supabaseAdmin
    .from("quizzes")
    .update({
      prize_first: toNullableText(prize_first),
      prize_second: toNullableText(prize_second),
      prize_third: toNullableText(prize_third),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ quiz: data });
}
