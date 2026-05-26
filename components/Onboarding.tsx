"use client";

import { useState } from "react";
import type { Nivel, StudentProfile } from "@/lib/types";

type Props = {
  onComplete: (profile: StudentProfile) => void;
};

const NIVEL_OPTIONS: {
  value: Nivel;
  title: string;
  subtitle: string;
  emoji: string;
}[] = [
  {
    value: "iniciante",
    title: "Iniciante",
    subtitle: "Estou começando a entender a Reforma Tributária",
    emoji: "🌱",
  },
  {
    value: "intermediario",
    title: "Intermediário",
    subtitle: "Conheço os fundamentos e quero me aprofundar",
    emoji: "📈",
  },
  {
    value: "avancado",
    title: "Avançado",
    subtitle: "Domino o tema e busco temas específicos",
    emoji: "🎯",
  },
];

const TOTAL_STEPS = 4;

export default function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [objetivo, setObjetivo] = useState("");
  const [experiencia, setExperiencia] = useState("");
  const [nivel, setNivel] = useState<Nivel | null>(null);
  const [tempo, setTempo] = useState("");

  const canAdvance =
    (step === 0 && objetivo.trim().length > 3) ||
    (step === 1 && experiencia.trim().length > 1) ||
    (step === 2 && nivel !== null) ||
    (step === 3 && tempo.trim().length > 1);

  const goNext = () => {
    if (!canAdvance) return;
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else if (nivel) {
      onComplete({
        objetivo: objetivo.trim(),
        experiencia: experiencia.trim(),
        nivel,
        tempo_disponivel: tempo.trim(),
      });
    }
  };

  const goBack = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col">
      {/* Progress bar */}
      <div className="w-full px-4 sm:px-6 pt-6">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={goBack}
            disabled={step === 0}
            aria-label="Voltar"
            className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-500 hover:bg-neutral-100 disabled:opacity-0 disabled:pointer-events-none transition"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
          <span className="text-xs sm:text-sm text-neutral-500 tabular-nums">
            {step + 1}/{TOTAL_STEPS}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center px-4 sm:px-6">
        <div className="max-w-2xl mx-auto w-full py-12 sm:py-16">
          {step === 0 && (
            <div className="animate-fade-in space-y-6">
              <div className="space-y-3">
                <p className="text-sm font-medium text-brand-600 uppercase tracking-wide">
                  Boas-vindas 👋
                </p>
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
                  Qual é o seu objetivo de aprendizado?
                </h1>
                <p className="text-base sm:text-lg text-neutral-600 text-balance">
                  Conte em poucas palavras o que você quer alcançar. Vamos
                  montar um plano personalizado para você.
                </p>
              </div>
              <textarea
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value)}
                placeholder="Ex.: entender a Reforma Tributária para atender meus clientes"
                rows={3}
                autoFocus
                className="w-full p-4 text-base sm:text-lg border border-neutral-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent resize-none transition"
              />
            </div>
          )}

          {step === 1 && (
            <div className="animate-fade-in space-y-6">
              <div className="space-y-3">
                <p className="text-sm font-medium text-brand-600 uppercase tracking-wide">
                  Sobre você
                </p>
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
                  Qual é a sua experiência profissional?
                </h1>
                <p className="text-base sm:text-lg text-neutral-600 text-balance">
                  Saber o seu contexto nos ajuda a calibrar o conteúdo.
                </p>
              </div>
              <textarea
                value={experiencia}
                onChange={(e) => setExperiencia(e.target.value)}
                placeholder="Ex.: contador com 5 anos atuando com pequenas e médias empresas"
                rows={3}
                autoFocus
                className="w-full p-4 text-base sm:text-lg border border-neutral-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent resize-none transition"
              />
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in space-y-6">
              <div className="space-y-3">
                <p className="text-sm font-medium text-brand-600 uppercase tracking-wide">
                  Seu ponto de partida
                </p>
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
                  Qual é o seu nível atual?
                </h1>
                <p className="text-base sm:text-lg text-neutral-600 text-balance">
                  Escolha o que melhor descreve o seu conhecimento sobre a
                  Reforma Tributária hoje.
                </p>
              </div>
              <div className="space-y-3 stagger">
                {NIVEL_OPTIONS.map((opt) => {
                  const active = nivel === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setNivel(opt.value)}
                      className={`w-full p-5 text-left rounded-2xl border-2 transition-all ${
                        active
                          ? "border-brand-600 bg-brand-50 shadow-sm"
                          : "border-neutral-200 bg-white hover:border-neutral-300"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-2xl leading-none mt-0.5">
                          {opt.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-base sm:text-lg text-neutral-900">
                            {opt.title}
                          </div>
                          <div className="text-sm sm:text-base text-neutral-600 mt-0.5">
                            {opt.subtitle}
                          </div>
                        </div>
                        <div
                          className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                            active
                              ? "border-brand-600 bg-brand-600"
                              : "border-neutral-300"
                          }`}
                        >
                          {active && (
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="white"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in space-y-6">
              <div className="space-y-3">
                <p className="text-sm font-medium text-brand-600 uppercase tracking-wide">
                  Última pergunta
                </p>
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
                  Quanto tempo você tem para estudar?
                </h1>
                <p className="text-base sm:text-lg text-neutral-600 text-balance">
                  Vamos ajustar o ritmo do seu plano à sua rotina.
                </p>
              </div>
              <input
                value={tempo}
                onChange={(e) => setTempo(e.target.value)}
                placeholder="Ex.: 30 minutos por dia"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canAdvance) {
                    e.preventDefault();
                    goNext();
                  }
                }}
                className="w-full p-4 text-base sm:text-lg border border-neutral-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent transition"
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  "15 minutos por dia",
                  "30 minutos por dia",
                  "1 hora por dia",
                  "Tenho 4 horas no total",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setTempo(suggestion)}
                    className="px-3 py-1.5 text-sm rounded-full border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 transition"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="px-4 sm:px-6 pb-8 sm:pb-10">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={goNext}
            disabled={!canAdvance}
            className="w-full py-4 px-6 bg-brand-600 text-white text-base sm:text-lg font-medium rounded-2xl shadow-sm hover:bg-brand-700 disabled:bg-neutral-300 disabled:cursor-not-allowed disabled:shadow-none transition-all active:scale-[0.99]"
          >
            {step === TOTAL_STEPS - 1 ? "Gerar meu plano" : "Continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}
