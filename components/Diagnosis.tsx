"use client";

import type { Gap, Prioridade } from "@/lib/types";

type Props = {
  gaps: Gap[];
};

const PRIORITY_STYLE: Record<
  Prioridade,
  { dot: string; chip: string; label: string }
> = {
  alta: {
    dot: "bg-rose-500",
    chip: "bg-rose-50 text-rose-700 border-rose-200",
    label: "Prioridade alta",
  },
  media: {
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    label: "Prioridade média",
  },
  baixa: {
    dot: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    label: "Prioridade baixa",
  },
};

export default function Diagnosis({ gaps }: Props) {
  return (
    <section className="space-y-6 animate-fade-in">
      <div className="space-y-3">
        <p className="text-sm font-medium text-brand-600 uppercase tracking-wide">
          Diagnóstico personalizado
        </p>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-balance">
          Seus pontos de partida
        </h2>
        <p className="text-base sm:text-lg text-neutral-600 text-balance">
          Identificamos {gaps.length} áreas para você dominar e atingir o seu
          objetivo. Cada uma se conecta a um curso real da CEFIS.
        </p>
      </div>

      <div className="grid gap-3 sm:gap-4 stagger">
        {gaps.map((gap, i) => {
          const style = PRIORITY_STYLE[gap.prioridade];
          return (
            <article
              key={`${gap.curso_cefis_relacionado.course_id}-${i}`}
              className="p-5 sm:p-6 bg-white border border-neutral-200 rounded-2xl hover:border-neutral-300 hover:shadow-sm transition"
            >
              <div className="flex items-start gap-4">
                {/* Priority indicator column */}
                <div className="flex-shrink-0 flex flex-col items-center pt-1">
                  <div className={`w-3 h-3 rounded-full ${style.dot}`} />
                </div>

                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border ${style.chip}`}
                    >
                      {style.label}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-semibold text-neutral-900 tracking-tight">
                    {gap.topico}
                  </h3>

                  <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
                    {gap.descricao}
                  </p>

                  <div className="pt-1 flex items-start gap-2 text-sm">
                    <svg
                      className="w-4 h-4 mt-0.5 flex-shrink-0 text-brand-600"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                    <span className="text-neutral-700">
                      Curso CEFIS:{" "}
                      <span className="font-medium text-neutral-900">
                        {gap.curso_cefis_relacionado.course_title.trim()}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
