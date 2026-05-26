"use client";

import { useEffect, useState } from "react";
import type { DiagnoseResponse, StudentProfile } from "@/lib/types";

type Props = {
  profile: StudentProfile;
  onDiagnoseComplete: (diagnose: DiagnoseResponse) => void;
  onError: (message: string) => void;
};

// Loading screen that holds the user from onboarding-submit through the
// diagnose call. As soon as diagnose returns, control returns to the parent,
// which transitions to the results phase and shows the gap cards immediately
// — the studyplan fetch happens in the background there, not here.
const MESSAGES = [
  "Analisando seu perfil…",
  "Identificando seus pontos de partida…",
  "Selecionando os cursos da CEFIS para você…",
  "Quase lá — montando seu diagnóstico…",
] as const;

export default function PreparingPlan({
  profile,
  onDiagnoseComplete,
  onError,
}: Props) {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;

    // Cycle the subtitle every ~5s so the screen feels alive.
    const interval = setInterval(() => {
      if (cancelled) return;
      setMsgIdx((prev) => Math.min(prev + 1, MESSAGES.length - 1));
    }, 5000);

    (async () => {
      try {
        const res = await fetch("/api/diagnose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            objetivo: profile.objetivo,
            experiencia: profile.experiencia,
            nivel: profile.nivel,
          }),
        });
        if (!res.ok) {
          const msg = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(msg.error ?? "diagnose failed");
        }
        const diagnose = (await res.json()) as DiagnoseResponse;
        if (cancelled) return;
        onDiagnoseComplete(diagnose);
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e);
        onError(message);
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // Mount-once effect: parent callbacks are stable references in our flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 sm:px-6 py-12">
      <div className="max-w-md w-full text-center space-y-10 animate-fade-in">
        {/* Animated rings */}
        <div className="relative w-28 h-28 mx-auto" aria-hidden="true">
          <div className="absolute inset-0 rounded-full border-4 border-brand-100" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-600 animate-spin" />
          <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-brand-400 animate-spin [animation-duration:1.6s]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl">📚</span>
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Analisando seu perfil
          </h1>
          <p
            key={msgIdx}
            className="text-base sm:text-lg text-neutral-600 animate-fade-in min-h-[3rem]"
          >
            {MESSAGES[msgIdx]}
          </p>
        </div>

        <p className="text-xs text-neutral-400 italic">
          Seu diagnóstico chega em instantes ✨
        </p>
      </div>
    </div>
  );
}
