// End-to-end test of the participant/admin RPC contract against the real Supabase project.
// Run with: node --env-file=.env.local scripts/e2e-test.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !publishableKey || !serviceRoleKey) {
  console.error(
    "Variables d'environnement manquantes. Lance avec: node --env-file=.env.local scripts/e2e-test.mjs"
  );
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
const anon = createClient(url, publishableKey, { auth: { persistSession: false } });

const results = [];
function check(name, condition, detail) {
  results.push({ name, pass: !!condition });
  console.log(`${condition ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`);
}

const TEST_PSEUDO = `e2e_test_${Date.now()}`;
let quizId;

try {
  const theme = `[E2E TEST] ${new Date().toISOString()}`;
  const { data: quiz, error: quizErr } = await admin
    .from("quizzes")
    .insert({ theme, status: "open", opened_at: new Date().toISOString() })
    .select()
    .single();
  if (quizErr) throw new Error("Création quiz: " + quizErr.message);
  quizId = quiz.id;
  check("Quiz de test créé et publié (status=open)", quiz.status === "open", quiz.id);

  const questions = [
    {
      quiz_id: quizId,
      question_order: 1,
      question_text: "Combien de bornes d'arcade Borne2Play possède-t-il ?",
      choice_a: "1",
      choice_b: "2",
      choice_c: "3",
      choice_d: "4",
      correct_choice: "B",
    },
    {
      quiz_id: quizId,
      question_order: 2,
      question_text: "Quelle est la couleur principale du logo Borne2Play ?",
      choice_a: "Rouge",
      choice_b: "Jaune",
      choice_c: "Bleu",
      choice_d: "Vert",
      correct_choice: "C",
    },
    {
      quiz_id: quizId,
      question_order: 3,
      question_text: "Sur quel réseau social ce quiz se déroule-t-il ?",
      choice_a: "Instagram",
      choice_b: "TikTok",
      choice_c: "Twitter",
      choice_d: "Facebook",
      correct_choice: "A",
    },
  ];
  const { error: qErr } = await admin.from("questions").insert(questions);
  if (qErr) throw new Error("Création questions: " + qErr.message);
  check("3 questions insérées pour le quiz de test", true);

  // Q1 correct (B), Q2 volontairement faux (A au lieu de C), Q3 correct (A) -> score attendu 2/3
  const answers = { 1: "B", 2: "A", 3: "A" };

  const { error: submitErr } = await anon.rpc("submit_participation", {
    p_quiz_id: quizId,
    p_pseudo: TEST_PSEUDO,
    p_answers: answers,
    p_duration_seconds: 42,
  });
  check("Première participation acceptée via submit_participation", !submitErr, submitErr?.message);

  const { data: participation, error: pErr } = await admin
    .from("participations")
    .select("correct_count, duration_seconds, pseudo_instagram")
    .eq("quiz_id", quizId)
    .eq("pseudo_instagram", TEST_PSEUDO)
    .single();
  if (pErr) throw new Error("Lecture participation: " + pErr.message);
  check(
    "Score calculé côté serveur correct (attendu 2/3)",
    participation.correct_count === 2,
    `obtenu ${participation.correct_count}/3`
  );
  check(
    "Durée enregistrée correctement (attendu 42s)",
    Number(participation.duration_seconds) === 42,
    `obtenu ${participation.duration_seconds}`
  );

  const { data: hasParticipated, error: hasErr } = await anon.rpc("has_participated", {
    p_quiz_id: quizId,
    p_pseudo: TEST_PSEUDO,
  });
  check("has_participated retourne true après la participation", hasParticipated === true, hasErr?.message);

  const { error: dupErr } = await anon.rpc("submit_participation", {
    p_quiz_id: quizId,
    p_pseudo: TEST_PSEUDO,
    p_answers: answers,
    p_duration_seconds: 10,
  });
  check(
    "Deuxième participation avec le même pseudo est bloquée",
    !!dupErr && dupErr.message.includes("PSEUDO_ALREADY_PARTICIPATED"),
    dupErr?.message
  );

  const { error: closeErr } = await admin
    .from("quizzes")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", quizId);
  check("Quiz clôturé (status=closed)", !closeErr, closeErr?.message);

  const { error: closedErr } = await anon.rpc("submit_participation", {
    p_quiz_id: quizId,
    p_pseudo: `${TEST_PSEUDO}_apres_cloture`,
    p_answers: answers,
    p_duration_seconds: 15,
  });
  check(
    "Participation refusée une fois le quiz clôturé",
    !!closedErr && closedErr.message.includes("n'est pas ouvert"),
    closedErr?.message
  );
} catch (err) {
  console.error("💥 Erreur inattendue:", err.message);
  results.push({ name: "Exécution sans erreur inattendue", pass: false });
} finally {
  if (quizId) {
    await admin.from("participations").delete().eq("quiz_id", quizId);
    await admin.from("questions").delete().eq("quiz_id", quizId);
    await admin.from("quizzes").delete().eq("id", quizId);
    console.log("\n🧹 Données de test nettoyées de la base.");
  }
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} vérifications passées.`);
process.exit(failed.length > 0 ? 1 : 0);
