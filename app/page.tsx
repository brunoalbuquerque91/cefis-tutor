"use client";

import { useState } from "react";
import Image from "next/image";
import Onboarding from "@/components/Onboarding";
import PreparingPlan from "@/components/PreparingPlan";
import Diagnosis from "@/components/Diagnosis";
import StudyPlan from "@/components/StudyPlan";
import TutorChat from "@/components/TutorChat";
import type {
  DiagnoseResponse,
  StudentProfile,
  StudyPlanResponse,
} from "@/lib/types";

type Phase = "landing" | "onboarding" | "preparing" | "results" | "chat";

export default function HomePage() {
  const [phase, setPhase] = useState<Phase>("landing");
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [diagnose, setDiagnose] = useState<DiagnoseResponse | null>(null);
  const [studyplan, setStudyplan] = useState<StudyPlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Landing — the existing welcome card with a single CTA.
  if (phase === "landing") {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center px-6 py-12 bg-neutral-50">
        <div className="max-w-2xl w-full text-center space-y-7 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 text-brand-700 text-xs font-medium uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-pulse" />
            Reforma Tributária · Demo
          </div>
          <div className="flex justify-center">
            <Image
              src="/logos/logo-cefis.svg"
              alt="CEFIS"
              width={320}
              height={110}
              priority
              className="h-16 sm:h-20 w-auto"
            />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-balance">
            Tutor de Aprendizado com IA
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 leading-relaxed text-balance max-w-xl mx-auto">
            Tire dúvidas sobre os cursos da CEFIS e receba respostas
            fundamentadas diretamente nos trechos das aulas, com indicação da
            aula e do tempo exato em que o tema é abordado.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              onClick={() => setPhase("onboarding")}
              className="w-full sm:w-auto px-8 py-4 bg-brand-600 text-white text-base font-medium rounded-2xl shadow-sm hover:bg-brand-700 transition-all active:scale-[0.99]"
            >
              Começar minha jornada
            </button>
            <button
              onClick={() => setPhase("chat")}
              className="w-full sm:w-auto px-6 py-4 text-base font-medium text-neutral-700 rounded-2xl hover:bg-white hover:text-neutral-900 transition"
            >
              Falar direto com o tutor →
            </button>
          </div>
          <div className="pt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-neutral-500">
            <Bullet label="29 cursos reais" />
            <Bullet label="669 aulas indexadas" />
            <Bullet label="Citações verificáveis" />
          </div>
        </div>
      </main>
    );
  }

  if (phase === "onboarding") {
    return (
      <main className="bg-neutral-50">
        <Onboarding
          onComplete={(p) => {
            setProfile(p);
            setError(null);
            setPhase("preparing");
          }}
        />
      </main>
    );
  }

  if (phase === "preparing" && profile) {
    return (
      <main className="bg-neutral-50">
        <PreparingPlan
          profile={profile}
          onComplete={({ diagnose, studyplan }) => {
            setDiagnose(diagnose);
            setStudyplan(studyplan);
            setPhase("results");
          }}
          onError={(message) => {
            setError(message);
            // Drop back to onboarding so the user can retry.
            setPhase("onboarding");
          }}
        />
      </main>
    );
  }

  if (phase === "results" && diagnose && studyplan && profile) {
    return (
      <main className="bg-neutral-50 min-h-[100dvh]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-12 sm:space-y-16">
          {/* Soft hero */}
          <header className="space-y-3 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium uppercase tracking-wide">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Tudo pronto
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
              Seu plano personalizado está pronto.
            </h1>
            <p className="text-base sm:text-lg text-neutral-600">
              Objetivo:{" "}
              <span className="text-neutral-900">{profile.objetivo}</span>
            </p>
          </header>

          <Diagnosis gaps={diagnose.gaps} />

          <StudyPlan
            steps={studyplan.steps}
            tempo_disponivel={studyplan.tempo_disponivel}
          />

          {/* CTA into chat */}
          <section className="animate-fade-in">
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-brand-900 to-brand-950 text-white">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                <div className="text-4xl">💬</div>
                <div className="flex-1 space-y-1">
                  <h3 className="text-xl sm:text-2xl font-semibold tracking-tight">
                    Tem alguma dúvida pontual?
                  </h3>
                  <p className="text-brand-100 text-sm sm:text-base">
                    Converse com o tutor — respostas com citações reais dos
                    cursos da CEFIS.
                  </p>
                </div>
                <button
                  onClick={() => setPhase("chat")}
                  className="w-full sm:w-auto px-6 py-3 bg-white text-brand-700 font-medium rounded-2xl hover:bg-brand-50 transition active:scale-[0.99]"
                >
                  Abrir tutor
                </button>
              </div>
            </div>
          </section>

          <div className="pt-2 flex justify-center">
            <button
              onClick={() => {
                setPhase("landing");
                setProfile(null);
                setDiagnose(null);
                setStudyplan(null);
              }}
              className="text-sm text-neutral-500 hover:text-neutral-900 transition"
            >
              ← Começar de novo
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (phase === "chat") {
    return (
      <main className="bg-neutral-50 min-h-[100dvh]">
        <div className="max-w-3xl mx-auto">
          <div className="px-4 sm:px-6 pt-4">
            <button
              onClick={() =>
                setPhase(diagnose && studyplan ? "results" : "landing")
              }
              className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 transition"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
              {diagnose && studyplan ? "Voltar ao meu plano" : "Voltar"}
            </button>
          </div>
          <TutorChat />
        </div>
      </main>
    );
  }

  // Fallback (shouldn't hit, but covers error states from preparing → onboarding)
  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-6 py-12 bg-neutral-50">
      <div className="max-w-md text-center space-y-4">
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        )}
        <button
          onClick={() => setPhase("landing")}
          className="px-6 py-3 bg-brand-600 text-white rounded-2xl"
        >
          Voltar ao início
        </button>
      </div>
    </main>
  );
}

function Bullet({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg
        className="w-3.5 h-3.5 text-emerald-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
      {label}
    </span>
  );
}
