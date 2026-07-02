"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { INSTAGRAM_URL } from "@/lib/constants";
import { CountdownTimer } from "@/components/CountdownTimer";
import type { Quiz } from "@/lib/types";

type LoadState = "loading" | "ready" | "empty" | "error";

export default function HomePage() {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [pseudo, setPseudo] = useState("");
  const [checking, setChecking] = useState(false);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOpenQuiz() {
      const { data, error } = await supabase
        .from("quizzes")
        .select(
          "id, theme, status, opened_at, closed_at, created_at, prize_first, prize_second, prize_third, archived, auto_close_at"
        )
        .eq("status", "open")
        .or(`auto_close_at.is.null,auto_close_at.gt.${new Date().toISOString()}`)
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setLoadState("error");
        return;
      }

      if (!data) {
        setLoadState("empty");
        return;
      }

      setQuiz(data);
      setLoadState("ready");
    }

    loadOpenQuiz();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleStart() {
    const trimmed = pseudo.trim().replace(/^@/, "").toLowerCase();
    if (!trimmed) {
      setFormError("Indique ton pseudo Instagram pour commencer.");
      return;
    }
    if (!quiz) return;

    setFormError(null);
    setAlreadyPlayed(false);
    setChecking(true);

    const { data: hasParticipated, error } = await supabase.rpc(
      "has_participated",
      { p_quiz_id: quiz.id, p_pseudo: trimmed }
    );

    setChecking(false);

    if (error) {
      setFormError("Impossible de vérifier ta participation, réessaie.");
      return;
    }

    if (hasParticipated) {
      setAlreadyPlayed(true);
      return;
    }

    sessionStorage.setItem(
      "b2p_quiz_session",
      JSON.stringify({ quizId: quiz.id, pseudo: trimmed })
    );
    router.push(`/quiz/${quiz.id}`);
  }

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8 gap-6">
      <Image src="/assets/logo.png" alt="Borne2Play" width={340} height={128} priority />

      {loadState === "loading" && (
        <p className="font-display text-lg">Chargement du quiz en cours…</p>
      )}

      {loadState === "error" && (
        <div className="sticker-card px-6 py-5 text-center">
          <p className="font-display text-xl text-b2p-red">Oups, une erreur est survenue.</p>
          <p>Réessaie de recharger la page.</p>
        </div>
      )}

      {loadState === "empty" && (
        <div className="sticker-card px-6 py-8 text-center max-w-md">
          <Image
            src="/assets/mascotte.png"
            alt="Mascotte Borne2Play"
            width={140}
            height={134}
            className="mx-auto mb-4"
          />
          <p className="font-display text-2xl mb-2">Pas de quiz en ce moment</p>
          <p>Reviens bientôt, un nouveau quiz arrive chaque semaine !</p>
        </div>
      )}

      {loadState === "ready" && quiz && (
        <div className="w-full max-w-md flex flex-col items-center gap-6">
          <Image
            src="/assets/mascotte.png"
            alt="Mascotte Borne2Play"
            width={160}
            height={153}
          />

          <div className="sticker-card w-full px-6 py-6 flex flex-col gap-4">
            <div className="text-center">
              <span className="sticker-chip inline-block px-4 py-1 bg-b2p-gold font-display text-sm">
                Quiz de la semaine
              </span>
              <h1 className="font-display text-2xl mt-3">{quiz.theme}</h1>
            </div>

            {quiz.auto_close_at && <CountdownTimer target={quiz.auto_close_at} />}

            <div>
              <p className="font-display text-b2p-blue mb-2">📋 Règles du jeu</p>
              <div className="flex flex-col gap-1.5 text-sm">
                <p className="rule-row">Réponds à toutes les questions, une par une.</p>
                <p className="rule-row">Pas de retour en arrière possible une fois validé.</p>
                <p className="rule-row">Une seule participation par pseudo Instagram.</p>
              </div>
            </div>

            <div>
              <p className="font-display text-b2p-red mb-2">🏆 À gagner cette semaine</p>
              {quiz.prize_first || quiz.prize_second || quiz.prize_third ? (
                <div className="flex flex-col gap-2">
                  {quiz.prize_first && (
                    <div
                      className="prize-row flex items-center gap-3 px-3 py-2"
                      style={{ "--prize-accent": "var(--b2p-gold)" } as React.CSSProperties}
                    >
                      <span className="prize-medal w-7 h-7 flex items-center justify-center text-sm shrink-0">
                        1
                      </span>
                      <p className="text-sm">{quiz.prize_first}</p>
                    </div>
                  )}
                  {quiz.prize_second && (
                    <div
                      className="prize-row flex items-center gap-3 px-3 py-2"
                      style={{ "--prize-accent": "var(--b2p-blue)" } as React.CSSProperties}
                    >
                      <span className="prize-medal w-7 h-7 flex items-center justify-center text-sm shrink-0 text-white">
                        2
                      </span>
                      <p className="text-sm">{quiz.prize_second}</p>
                    </div>
                  )}
                  {quiz.prize_third && (
                    <div
                      className="prize-row flex items-center gap-3 px-3 py-2"
                      style={{ "--prize-accent": "var(--b2p-red)" } as React.CSSProperties}
                    >
                      <span className="prize-medal w-7 h-7 flex items-center justify-center text-sm shrink-0 text-white">
                        3
                      </span>
                      <p className="text-sm">{quiz.prize_third}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm sticker-chip bg-b2p-gold/20 px-4 py-3">
                  Tente de remporter des heures de jeu gratuites, des goodies
                  Borne2Play et la première place au classement de la semaine !
                </p>
              )}
            </div>

            {alreadyPlayed ? (
              <div className="sticker-chip bg-b2p-red/10 px-4 py-3 text-center flex flex-col items-center gap-3">
                <p className="font-display text-b2p-red">
                  Tu as déjà participé à ce quiz.
                </p>
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
            ) : (
              <div className="flex flex-col gap-3">
                <label className="font-display text-sm text-b2p-blue" htmlFor="pseudo">
                  Ton pseudo Instagram
                </label>
                <input
                  id="pseudo"
                  type="text"
                  value={pseudo}
                  onChange={(e) => setPseudo(e.target.value)}
                  placeholder="@toncompte"
                  className="border-4 border-b2p-black rounded-full px-4 py-2 outline-none focus:border-b2p-blue"
                />
                {formError && <p className="text-b2p-red text-sm">{formError}</p>}
                <button
                  onClick={handleStart}
                  disabled={checking}
                  className="sticker-btn bg-b2p-red text-white px-6 py-3 font-display text-lg"
                >
                  {checking ? "Vérification…" : "Commencer"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
