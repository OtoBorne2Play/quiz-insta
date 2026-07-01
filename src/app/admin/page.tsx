"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { validateQuizImport } from "@/lib/quizImport";
import type { Quiz, QuizImport } from "@/lib/types";

interface LeaderboardEntry {
  pseudo_instagram: string;
  correct_count: number;
  duration_seconds: number;
  submitted_at: string;
}

const TOKEN_KEY = "b2p_admin_token";

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  const [importData, setImportData] = useState<QuizImport | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const [closingId, setClosingId] = useState<string | null>(null);
  const [leaderboards, setLeaderboards] = useState<
    Record<string, LeaderboardEntry[]>
  >({});
  const [leaderboardLoadingId, setLeaderboardLoadingId] = useState<string | null>(
    null
  );

  const [prizeDrafts, setPrizeDrafts] = useState<
    Record<string, { prize_first: string; prize_second: string; prize_third: string }>
  >({});
  const [savingPrizesId, setSavingPrizesId] = useState<string | null>(null);
  const [prizeSaveError, setPrizeSaveError] = useState<Record<string, string>>({});

  function prizeDraftFor(quiz: Quiz) {
    return (
      prizeDrafts[quiz.id] ?? {
        prize_first: quiz.prize_first ?? "",
        prize_second: quiz.prize_second ?? "",
        prize_third: quiz.prize_third ?? "",
      }
    );
  }

  function updatePrizeDraft(
    quiz: Quiz,
    field: "prize_first" | "prize_second" | "prize_third",
    value: string
  ) {
    setPrizeDrafts((prev) => ({
      ...prev,
      [quiz.id]: { ...prizeDraftFor(quiz), [field]: value },
    }));
  }

  const loadQuizzes = useCallback(async (activeToken: string) => {
    const res = await fetch("/api/admin/quizzes", {
      headers: { "x-admin-token": activeToken },
    });
    if (res.status === 401) {
      return false;
    }
    const body = await res.json();
    if (!res.ok) {
      setListError(body.error ?? "Erreur inconnue");
      return true;
    }
    setListError(null);
    setQuizzes(body.quizzes);
    return true;
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem(TOKEN_KEY);
    if (!stored) return;
    let cancelled = false;

    async function restoreSession() {
      const res = await fetch("/api/admin/quizzes", {
        headers: { "x-admin-token": stored as string },
      });
      if (cancelled) return;

      if (res.status === 401) {
        sessionStorage.removeItem(TOKEN_KEY);
        setAuthError("Token invalide.");
        return;
      }

      const body = await res.json();
      if (cancelled) return;

      if (!res.ok) {
        setListError(body.error ?? "Erreur inconnue");
      } else {
        setListError(null);
        setQuizzes(body.quizzes);
      }
      setToken(stored);
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogin() {
    const trimmed = tokenInput.trim();
    if (!trimmed) return;
    setAuthError(null);

    const valid = await loadQuizzes(trimmed);
    if (!valid) {
      setAuthError("Token invalide.");
      return;
    }
    sessionStorage.setItem(TOKEN_KEY, trimmed);
    setToken(trimmed);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setPublishError(null);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!validateQuizImport(parsed)) {
          setImportError(
            "Le fichier ne respecte pas le format attendu (theme + questions)."
          );
          setImportData(null);
          return;
        }
        setImportData(parsed);
      } catch {
        setImportError("Fichier JSON invalide.");
        setImportData(null);
      }
    };
    reader.readAsText(file);
  }

  async function handlePublish() {
    if (!token || !importData) return;
    setPublishing(true);
    setPublishError(null);

    const res = await fetch("/api/admin/quizzes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": token,
      },
      body: JSON.stringify(importData),
    });

    const body = await res.json();
    setPublishing(false);

    if (!res.ok) {
      setPublishError(body.error ?? "Publication impossible");
      return;
    }

    setImportData(null);
    await loadQuizzes(token);
  }

  async function handleClose(quizId: string) {
    if (!token) return;
    setClosingId(quizId);

    const res = await fetch(`/api/admin/quizzes/${quizId}/close`, {
      method: "POST",
      headers: { "x-admin-token": token },
    });

    setClosingId(null);

    if (res.ok) {
      await loadQuizzes(token);
    }
  }

  async function handleSavePrizes(quiz: Quiz) {
    if (!token) return;
    const draft = prizeDraftFor(quiz);
    setSavingPrizesId(quiz.id);
    setPrizeSaveError((prev) => ({ ...prev, [quiz.id]: "" }));

    const res = await fetch(`/api/admin/quizzes/${quiz.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": token,
      },
      body: JSON.stringify(draft),
    });

    setSavingPrizesId(null);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setPrizeSaveError((prev) => ({ ...prev, [quiz.id]: body.error ?? "Erreur" }));
      return;
    }

    await loadQuizzes(token);
  }

  async function toggleLeaderboard(quizId: string) {
    if (!token) return;
    if (leaderboards[quizId]) {
      setLeaderboards((prev) => {
        const next = { ...prev };
        delete next[quizId];
        return next;
      });
      return;
    }

    setLeaderboardLoadingId(quizId);
    const res = await fetch(`/api/admin/quizzes/${quizId}/leaderboard`, {
      headers: { "x-admin-token": token },
    });
    const body = await res.json();
    setLeaderboardLoadingId(null);

    if (res.ok) {
      setLeaderboards((prev) => ({ ...prev, [quizId]: body.leaderboard }));
    }
  }

  if (!token) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="sticker-card px-8 py-8 w-full max-w-sm flex flex-col gap-4">
          <h1 className="font-display text-2xl text-center">Admin Borne2Play</h1>
          <input
            type="password"
            placeholder="Token admin"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            className="border-4 border-b2p-black rounded-full px-4 py-2 outline-none"
          />
          {authError && <p className="text-b2p-red text-sm">{authError}</p>}
          <button
            onClick={handleLogin}
            className="sticker-btn bg-b2p-blue text-white px-6 py-3 font-display"
          >
            Se connecter
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8 gap-8">
      <div className="w-full max-w-2xl flex items-center justify-between">
        <h1 className="font-display text-3xl">Admin Borne2Play</h1>
        <Link
          href="/"
          className="sticker-btn bg-b2p-gold text-b2p-black px-4 py-2 text-sm font-display"
        >
          Voir l&apos;app
        </Link>
      </div>

      <section className="sticker-card w-full max-w-2xl px-6 py-6 flex flex-col gap-4">
        <h2 className="font-display text-xl text-b2p-blue">Nouveau quiz</h2>
        <input type="file" accept="application/json" onChange={handleFileChange} />
        {importError && <p className="text-b2p-red text-sm">{importError}</p>}

        {importData && (
          <div className="flex flex-col gap-3">
            <p className="font-display">
              Thème : <span className="font-sans">{importData.theme}</span>
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left">
                    <th className="pr-2">#</th>
                    <th className="pr-2">Question</th>
                    <th className="pr-2">A</th>
                    <th className="pr-2">B</th>
                    <th className="pr-2">C</th>
                    <th className="pr-2">D</th>
                    <th>Bonne réponse</th>
                  </tr>
                </thead>
                <tbody>
                  {importData.questions.map((q, i) => (
                    <tr key={i} className="border-t border-b2p-black/20">
                      <td className="pr-2 py-1">{i + 1}</td>
                      <td className="pr-2 py-1">{q.question_text}</td>
                      <td className="pr-2 py-1">{q.choice_a}</td>
                      <td className="pr-2 py-1">{q.choice_b}</td>
                      <td className="pr-2 py-1">{q.choice_c}</td>
                      <td className="pr-2 py-1">{q.choice_d}</td>
                      <td className="py-1 font-display text-b2p-red">
                        {q.correct_choice}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {publishError && <p className="text-b2p-red text-sm">{publishError}</p>}
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="sticker-btn bg-b2p-red text-white px-6 py-3 font-display self-start"
            >
              {publishing ? "Publication…" : "Publier"}
            </button>
          </div>
        )}
      </section>

      <section className="w-full max-w-2xl flex flex-col gap-4">
        <h2 className="font-display text-xl text-b2p-blue">Quiz existants</h2>
        {listError && <p className="text-b2p-red text-sm">{listError}</p>}

        {quizzes.map((quiz) => (
          <div key={quiz.id} className="sticker-card px-5 py-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="font-display text-lg">{quiz.theme}</p>
                <span
                  className={`sticker-chip inline-block px-3 py-0.5 text-xs font-display ${
                    quiz.status === "open"
                      ? "bg-b2p-gold"
                      : quiz.status === "closed"
                        ? "bg-b2p-black text-white"
                        : "bg-white"
                  }`}
                >
                  {quiz.status}
                </span>
              </div>
              <div className="flex gap-2">
                {quiz.status === "open" && (
                  <button
                    onClick={() => handleClose(quiz.id)}
                    disabled={closingId === quiz.id}
                    className="sticker-btn bg-b2p-black text-white px-4 py-2 text-sm font-display"
                  >
                    {closingId === quiz.id ? "…" : "Clôturer"}
                  </button>
                )}
                <button
                  onClick={() => toggleLeaderboard(quiz.id)}
                  disabled={leaderboardLoadingId === quiz.id}
                  className="sticker-btn bg-b2p-blue text-white px-4 py-2 text-sm font-display"
                >
                  {leaderboards[quiz.id] ? "Masquer" : "Classement"}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-b2p-black/20 pt-3">
              <p className="font-display text-sm text-b2p-blue">Lots (top 3)</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Lot 1er"
                  value={prizeDraftFor(quiz).prize_first}
                  onChange={(e) => updatePrizeDraft(quiz, "prize_first", e.target.value)}
                  className="border-2 border-b2p-black rounded-full px-3 py-1 text-sm outline-none"
                />
                <input
                  type="text"
                  placeholder="Lot 2e"
                  value={prizeDraftFor(quiz).prize_second}
                  onChange={(e) => updatePrizeDraft(quiz, "prize_second", e.target.value)}
                  className="border-2 border-b2p-black rounded-full px-3 py-1 text-sm outline-none"
                />
                <input
                  type="text"
                  placeholder="Lot 3e"
                  value={prizeDraftFor(quiz).prize_third}
                  onChange={(e) => updatePrizeDraft(quiz, "prize_third", e.target.value)}
                  className="border-2 border-b2p-black rounded-full px-3 py-1 text-sm outline-none"
                />
              </div>
              {prizeSaveError[quiz.id] && (
                <p className="text-b2p-red text-sm">{prizeSaveError[quiz.id]}</p>
              )}
              <button
                onClick={() => handleSavePrizes(quiz)}
                disabled={savingPrizesId === quiz.id}
                className="sticker-btn bg-b2p-gold text-b2p-black px-4 py-2 text-sm font-display self-start"
              >
                {savingPrizesId === quiz.id ? "…" : "Enregistrer les lots"}
              </button>
            </div>

            {leaderboards[quiz.id] && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left">
                      <th className="pr-2">#</th>
                      <th className="pr-2">Pseudo</th>
                      <th className="pr-2">Score</th>
                      <th>Temps (s)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboards[quiz.id].length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-2 text-center">
                          Aucune participation pour l&apos;instant.
                        </td>
                      </tr>
                    )}
                    {leaderboards[quiz.id].map((entry, i) => (
                      <tr key={entry.pseudo_instagram} className="border-t border-b2p-black/20">
                        <td className="pr-2 py-1">{i + 1}</td>
                        <td className="pr-2 py-1">{entry.pseudo_instagram}</td>
                        <td className="pr-2 py-1">{entry.correct_count}</td>
                        <td className="py-1">{entry.duration_seconds}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}
