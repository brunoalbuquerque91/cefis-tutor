"use client";

import type { StudyStep } from "@/lib/types";

type Props = {
  steps: StudyStep[];
  tempo_disponivel: string;
};

// Best-effort parse — used only for the "total" footer.
function parseDurationToMinutes(s: string): number {
  // Patterns seen from the LLM:  "15 minutos", "30 minutos", "1 hora",
  // "90 minutos (3 sessões)", "60 minutos (2 sessões)".
  const m = s.match(/(\d+)\s*(min|minutos|hora|horas|h)/i);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  if (unit.startsWith("h")) return n * 60;
  return n;
}

function formatTotal(minutes: number): string {
  if (minutes === 0) return "";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export default function StudyPlan({ steps, tempo_disponivel }: Props) {
  const totalMin = steps.reduce(
    (acc, s) => acc + parseDurationToMinutes(s.duracao_estimada),
    0,
  );
  const totalLabel = formatTotal(totalMin);

  return (
    <section className="space-y-6 animate-fade-in">
      <div className="space-y-3">
        <p className="text-sm font-medium text-indigo-600 uppercase tracking-wide">
          Plano de estudos personalizado
        </p>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-balance">
          Seu caminho de aprendizado
        </h2>
        <p className="text-base sm:text-lg text-neutral-600 text-balance">
          {steps.length} etapas{totalLabel ? ` · ${totalLabel} no total` : ""} ·
          ritmo de {tempo_disponivel}
        </p>
      </div>

      {/* Vertical path */}
      <div className="relative pl-6 sm:pl-8">
        {/* Connecting line */}
        <div
          className="absolute left-[10px] sm:left-[14px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-indigo-200 via-indigo-200 to-transparent"
          aria-hidden="true"
        />

        <ol className="space-y-5 sm:space-y-6 stagger">
          {steps.map((step) => {
            const isCefis = step.tipo === "curso_cefis";
            return (
              <li key={step.ordem} className="relative">
                {/* Node */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-2 flex items-center justify-center rounded-full shadow-sm ${
                    isCefis
                      ? "w-[22px] h-[22px] sm:w-[30px] sm:h-[30px] bg-indigo-600 text-white"
                      : "w-[22px] h-[22px] sm:w-[30px] sm:h-[30px] bg-white text-indigo-600 border-2 border-indigo-300"
                  }`}
                  aria-hidden="true"
                >
                  <span className="text-[10px] sm:text-xs font-semibold tabular-nums">
                    {step.ordem}
                  </span>
                </div>

                {/* Card */}
                <div
                  className={`p-5 sm:p-6 rounded-2xl border transition ${
                    isCefis
                      ? "bg-white border-neutral-200 hover:border-indigo-300 hover:shadow-sm"
                      : "bg-indigo-50/40 border-indigo-100 border-dashed"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {isCefis ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-600 text-white">
                        <svg
                          className="w-3 h-3"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                        </svg>
                        Curso CEFIS
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-white text-indigo-700 border border-indigo-200">
                        <svg
                          className="w-3 h-3"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 2l1.9 5.8h6.1l-4.9 3.6 1.9 5.8L12 13.6 6.9 17.2l1.9-5.8L4 7.8h6.1z" />
                        </svg>
                        Material IA
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                      <svg
                        className="w-3.5 h-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="9" />
                        <polyline points="12 7 12 12 15 14" />
                      </svg>
                      {step.duracao_estimada}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-semibold text-neutral-900 tracking-tight mb-2">
                    {step.titulo.trim()}
                  </h3>

                  <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
                    {step.descricao}
                  </p>

                  {isCefis && step.fonte_cefis && (
                    <div className="mt-3 pt-3 border-t border-neutral-100 text-xs sm:text-sm text-neutral-500">
                      Fonte: curso CEFIS #{step.fonte_cefis.course_id} ·{" "}
                      <span className="text-neutral-700">
                        {step.fonte_cefis.course_title.trim()}
                      </span>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
