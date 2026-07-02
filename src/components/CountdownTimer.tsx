"use client";

import { useEffect, useState } from "react";

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function computeRemaining(target: string): Remaining {
  const diff = Math.max(0, new Date(target).getTime() - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
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

  const pad = (n: number) => String(n).padStart(2, "0");
  const units = [
    { label: "jours", value: remaining.days },
    { label: "heures", value: remaining.hours },
    { label: "min", value: remaining.minutes },
    { label: "sec", value: remaining.seconds },
  ];

  return (
    <div className="text-center">
      <p className="font-display text-xs text-b2p-blue mb-1">⏳ Fermeture dans</p>
      <div className="flex justify-center gap-2">
        {units.map((unit) => (
          <div key={unit.label} className="flex flex-col items-center">
            <span className="sticker-chip bg-b2p-blue text-white font-display px-2 py-1 min-w-10 text-center">
              {pad(unit.value)}
            </span>
            <span className="text-[10px] uppercase mt-1">{unit.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
