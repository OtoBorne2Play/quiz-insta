"use client";

import { useEffect, useState } from "react";

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  expired: boolean;
}

const URGENT_THRESHOLD_MS = 60 * 60 * 1000;

function computeRemaining(target: string): Remaining {
  const diff = Math.max(0, new Date(target).getTime() - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalMs: diff,
    expired: diff <= 0,
  };
}

export function CountdownTimer({ target }: { target: string }) {
  const [remaining, setRemaining] = useState<Remaining | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(computeRemaining(target));
    Promise.resolve().then(tick);
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [target]);

  if (!remaining || remaining.expired) return null;

  const urgent = remaining.totalMs < URGENT_THRESHOLD_MS;
  const pad = (n: number) => String(n).padStart(2, "0");
  const units = [
    { label: "jours", value: remaining.days },
    { label: "heures", value: remaining.hours },
    { label: "min", value: remaining.minutes },
    { label: "sec", value: remaining.seconds },
  ];

  return (
    <div className="text-center">
      <p
        className={`font-display text-sm mb-2 ${
          urgent ? "text-b2p-red countdown-urgent-label" : "text-b2p-blue"
        }`}
      >
        {urgent ? "⚠️ Dernière chance, ça ferme bientôt !" : "⏳ Fermeture dans"}
      </p>
      <div className="flex justify-center gap-3">
        {units.map((unit) => (
          <div key={unit.label} className="flex flex-col items-center">
            <span
              key={unit.value}
              className={`sticker-chip font-display px-3 py-2 min-w-16 text-center text-2xl countdown-tick ${
                urgent ? "bg-b2p-red text-white countdown-urgent" : "bg-b2p-blue text-white"
              }`}
            >
              {pad(unit.value)}
            </span>
            <span className="text-xs uppercase mt-1.5 tracking-wide">{unit.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
