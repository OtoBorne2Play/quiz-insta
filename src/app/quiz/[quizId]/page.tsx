"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { INSTAGRAM_URL } from "@/lib/constants";
import type { Choice, Question } from "@/lib/types";

type LoadState = "loading" | "ready" | "closed" | "error";

interface SessionInfo {
  quizId: string;
  pseudo: string;
}

const CHOICE_KEYS: { key: Choice; field: keyof Question }[] = [
  { key: "A", field: "choice_a" },
  { key: "B", field: "choice_b" },
  { key: "C", field: "choice_c" },
  { key: "D", field: "choice_d" },
];

const TRANSITION_MS = 320;

async function submitQuizParticipation(args: {
  quizId: string;
  pseudo: string;
  answers: Record<number, Choice>;
  startTime: number;
}) {
  const durationSeconds = Math.max(1, Math.round((Date.now() - args.startTime) / 1000));
  return supabase.rpc("submit_participation", {
    p_quiz_id: args.quizId,
    p_pseudo: args.pseudo,
    p_answers: args.answers,
    p_duration_seconds: durationSeconds,
  });
}

function ExitOptions() {
  return (
    <div className="flex flex-col items-center gap-3 mt-2">
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="sticker-btn bg-b2p-red text-white px-5 py-2 text-sm font-display"
      >
        Suivre @_borne2play_ sur Instagram
      </a>
      <Link href="/" className="font-display text-b2p-blue text-sm underline">
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}

export default function QuizPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const router = useRouter();

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Choice>>({});
  const [selectedChoice, setSelectedChoice] = useState<Choice | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const [pseudo, setPseudo] = useState("");

  const sessionRef = useRef<SessionInfo | null>(null);
  const startTimeRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    startTimeRef.current = Date.now();

    async function init() {
      const raw = sessionStorage.getItem("b2p_quiz_session");
      if (!raw) {
        router.replace("/");
        return;
      }

      const parsed = JSON.parse(raw) as SessionInfo;
      if (parsed.quizId !== quizId) {
        router.replace("/");
        return;
      }
      sessionRef.current = parsed;
      setPseudo(parsed.pseudo);

      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .select("status, auto_close_at")
        .eq("id", quizId)
        .maybeSingle();

      if (cancelled) return;

      if (quizError || !quiz) {
        setLoadState("error");
        return;
      }

      const expired =
        quiz.auto_close_at !== null && new Date(quiz.auto_close_at).getTime() < Date.now();

      if (quiz.status !== "open" || expired) {
        setLoadState("closed");
        return;
      }

      const { data: questionRows, error: questionsError } = await supabase
        .from("questions")
        .select(
          "id, quiz_id, question_order, question_text, choice_a, choice_b, choice_c, choice_d, correct_choice"
        )
        .eq("quiz_id", quizId)
        .order("question_order", { ascending: true });

      if (cancelled) return;

      if (questionsError || !questionRows || questionRows.length === 0) {
        setLoadState("error");
        return;
      }

      setQuestions(questionRows);
      setLoadState("ready");
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [quizId, router]);

  async function submitParticipation(finalAnswers: Record<number, Choice>) {
    const session = sessionRef.current;
    if (!session) return;

    setSubmitting(true);
    setSubmitError(null);

    const { error } = await submitQuizParticipation({
      quizId,
      pseudo: session.pseudo,
      answers: finalAnswers,
      startTime: startTimeRef.current,
    });

    setSubmitting(false);

    if (error) {
      if (error.message.includes("PSEUDO_ALREADY_PARTICIPATED")) {
        setAlreadyPlayed(true);
        return;
      }
      if (error.message.includes("n'est pas ouvert")) {
        setLoadState("closed");
        return;
      }
      setSubmitError("Impossible d'enregistrer ta réponse, réessaie.");
      return;
    }

    sessionStorage.removeItem("b2p_quiz_session");
    router.push("/merci");
  }

  function handleValidate() {
    if (!selectedChoice || transitioning) return;

    const question = questions[currentIndex];
    const updated = { ...answers, [question.question_order]: selectedChoice };
    setAnswers(updated);
    setTransitioning(true);

    window.setTimeout(() => {
      const isLast = currentIndex === questions.length - 1;
      if (isLast) {
        submitParticipation(updated);
      } else {
        setCurrentIndex((i) => i + 1);
        setSelectedChoice(null);
        setTransitioning(false);
      }
    }, TRANSITION_MS);
  }

  if (loadState === "loading") {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <p className="font-display text-lg">Chargement des questions…</p>
      </main>
    );
  }

  if (loadState === "closed") {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-4">
        <div className="sticker-card px-6 py-6 text-center max-w-md">
          <p className="font-display text-xl text-b2p-red mb-2">
            Ce quiz est clôturé.
          </p>
          <p>Merci de ta visite, un nouveau quiz arrive bientôt !</p>
          <ExitOptions />
        </div>
      </main>
    );
  }

  if (loadState === "error") {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-4">
        <div className="sticker-card px-6 py-6 text-center max-w-md">
          <p className="font-display text-xl text-b2p-red">Oups, une erreur est survenue.</p>
        </div>
      </main>
    );
  }

  if (alreadyPlayed) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-4">
        <div className="sticker-card px-6 py-6 text-center max-w-md">
          <p className="font-display text-xl text-b2p-red">
            Tu as déjà participé à ce quiz.
          </p>
          <ExitOptions />
        </div>
      </main>
    );
  }

  const question = questions[currentIndex];
  const progress = ((currentIndex + (submitting ? 1 : 0)) / questions.length) * 100;

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8 gap-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-2">
          <p className="font-display text-sm text-b2p-blue">
            Question {currentIndex + 1} / {questions.length}
          </p>
          {pseudo && <p className="text-xs text-b2p-black/60">@{pseudo}</p>}
        </div>
        <div className="sticker-chip h-5 bg-white overflow-hidden">
          <div
            className="h-full bg-b2p-gold transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div
        className={`sticker-card w-full max-w-md px-6 py-6 flex flex-col gap-4 transition-all duration-300 ${
          transitioning ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
      >
        <h1 className="font-display text-xl text-center">{question.question_text}</h1>

        <div className="flex flex-col gap-3">
          {CHOICE_KEYS.map(({ key, field }) => {
            const isSelected = selectedChoice === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedChoice(key)}
                disabled={submitting || transitioning}
                className={`sticker-btn px-4 py-3 text-left font-sans font-semibold transition-all duration-150 ${
                  isSelected
                    ? "bg-b2p-gold text-b2p-black scale-[1.02]"
                    : "bg-b2p-blue text-white"
                }`}
              >
                <span className="font-display mr-2">{key}.</span>
                {question[field] as string}
                {isSelected && <span className="float-right">✓</span>}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleValidate}
          disabled={!selectedChoice || submitting || transitioning}
          className="sticker-btn bg-b2p-red text-white px-6 py-3 font-display disabled:bg-b2p-black/20 disabled:text-b2p-black/40"
        >
          ✓ Valider ma réponse
        </button>
        <p className="text-center text-xs text-b2p-black/60">
          Attention : impossible de revenir en arrière après validation.
        </p>

        {submitting && (
          <p className="text-center font-display text-b2p-blue">Envoi en cours…</p>
        )}
        {submitError && (
          <p className="text-center text-b2p-red text-sm">{submitError}</p>
        )}
      </div>
    </main>
  );
}
