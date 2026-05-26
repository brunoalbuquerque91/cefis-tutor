"use client";

import { useEffect, useState } from "react";
import type {
  DiagnoseResponse,
  StudentProfile,
  StudyPlanResponse,
} from "@/lib/types";

type Props = {
  profile: StudentProfile;
  onComplete: (data: {
    diagnose: DiagnoseResponse;
    studyplan: StudyPlanResponse;
  }) => void;
  onError: (message: string) => void;
};

// Phases of the experience — UI subtitle cycles through these.
// The phase index is advanced both by API events (true progress) and a soft
// timer (so the copy doesn't sit static for 25-50s on the same line).
const MESSAGES = [
  { stage: "diagnose", text: "Analisando seu perfil…" },
  { stage: "diagnose", text: "Identificando seus pontos de partida…" },
  { stage: "diagnose", text: "Selecionando os cursos da CEFIS para você…" },
  { stage: "studyplan", text: "Identificando suas lacunas de conhecimento…" },
  { stage: "studyplan", text: "Estruturando o caminho ideal de aprendizado…" },
  { stage: "studyplan", text: "Calibrando duração e ritmo das aulas…" },
  { stage: "studyplan", text: "Finalizando seu plano personalizado…" },
] as const;

export default function PreparingPlan({ profile, onComplete, onError }: Props) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [stage, setStage] = useState<"diagnose" | "studyplan">("diagnose");

  useEffect(() => {
    let cancelled = false;

    // Soft timer that nudges the subtitle forward every ~7s so the user feels
    // motion even while a single API call is mid-flight.
    const interval = setInterval(() => {
      if (cancelled) return;
      setMsgIdx((prev) => {
        const next = Math.min(prev + 1, MESSAGES.length - 1);
        // Don't jump into studyplan-stage copy while diagnose is still running.
        const proposedStage = MESSAGES[next].stage;
        if (proposedStage === "studyplan" && stage === "diagnose") {
          return prev; // hold on the last diagnose-stage message
        }
        return next;
      });
    }, 7000);

    (async () => {
      try {
        const dRes = await fetch("/api/diagnose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            objetivo: profile.objetivo,
            experiencia: profile.experiencia,
            nivel: profile.nivel,
          }),
        });
        if (!dRes.ok) {
          const msg = await dRes.json().catch(() => ({ error: dRes.statusText }));
          throw new Error(msg.error ?? "diagnose failed");
        }
        const diagnose = (await dRes.json()) as DiagnoseResponse;
        if (cancelled) return;

        // Cross the bridge to studyplan stage.
        setStage("studyplan");
        setMsgIdx((prev) => {
          const firstStudyplanIdx = MESSAGES.findIndex(
            (m) => m.stage === "studyplan",
          );
          return Math.max(prev, firstStudyplanIdx);
        });

        const sRes = await fetch("/api/studyplan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gaps: diagnose.gaps,
            tempo_disponivel: profile.tempo_disponivel,
          }),
        });
        if (!sRes.ok) {
          const msg = await sRes.json().catch(() => ({ error: sRes.statusText }));
          throw new Error(msg.error ?? "studyplan failed");
        }
        const studyplan = (await sRes.json()) as StudyPlanResponse;
        if (cancelled) return;

        // Tiny pause so the final "Finalizando…" message can be perceived.
        setMsgIdx(MESSAGES.length - 1);
        await new Promise((r) => setTimeout(r, 400));
        if (cancelled) return;

        onComplete({ diagnose, studyplan });
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
    // We deliberately omit setters and onComplete/onError from deps — this
    // effect kicks the journey off exactly once when the component mounts.
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
            Preparando seu plano de estudos
          </h1>
          <p
            key={msgIdx}
            className="text-base sm:text-lg text-neutral-600 animate-fade-in min-h-[3rem]"
          >
            {MESSAGES[msgIdx].text}
          </p>
        </div>

        {/* Sub-phase indicator */}
        <div className="flex items-center justify-center gap-3 text-sm text-neutral-500">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                stage === "diagnose"
                  ? "bg-brand-600 animate-pulse"
                  : "bg-emerald-500"
              }`}
            />
            <span>Diagnóstico</span>
          </div>
          <div className="w-6 h-px bg-neutral-300" />
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                stage === "studyplan"
                  ? "bg-brand-600 animate-pulse"
                  : "bg-neutral-300"
              }`}
            />
            <span>Plano</span>
          </div>
        </div>

        <p className="text-xs text-neutral-400 italic">
          Pode levar até 1 minuto — vale a espera ✨
        </p>
      </div>
    </div>
  );
}
