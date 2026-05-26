"use client";

import { useEffect, useState } from "react";
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

// ────────────────────────────────────────────────────────────────────────────
// CEFIS course enrichment — shape returned by /api/course/:id
// ────────────────────────────────────────────────────────────────────────────

type EnrichedCourse = {
  course_id: number;
  averageRating: number | null;
  duration: number | null; // seconds (CEFIS schema)
  teacherName: string | null;
  lessonCount: number | null;
  crcActive: boolean;
  crcCreditHours: number | null;
};

type EnrichmentResponse =
  | ({ enriched: true } & EnrichedCourse)
  | { enriched: false };

function formatDurationFromSeconds(sec: number | null): string | null {
  if (sec == null || sec <= 0) return null;
  const minutes = Math.round(sec / 60);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

export default function StudyPlan({ steps, tempo_disponivel }: Props) {
  const totalMin = steps.reduce(
    (acc, s) => acc + parseDurationToMinutes(s.duracao_estimada),
    0,
  );
  const totalLabel = formatTotal(totalMin);

  // Enrichment map (course_id → details). undefined = not fetched yet,
  // null = fetched but no enrichment available (resilient fallback).
  const [enrichment, setEnrichment] = useState<
    Map<number, EnrichedCourse | null>
  >(new Map());

  useEffect(() => {
    // Collect unique course_ids from curso_cefis steps with a fonte_cefis.
    const uniqueIds = new Set<number>();
    for (const s of steps) {
      if (s.tipo === "curso_cefis" && s.fonte_cefis) {
        uniqueIds.add(s.fonte_cefis.course_id);
      }
    }
    if (uniqueIds.size === 0) return;

    let cancelled = false;

    // Fire all fetches in parallel — each one is independently resilient.
    // /api/course/:id always returns 200 (proxy enforces graceful fallback).
    Promise.all(
      Array.from(uniqueIds).map(async (id) => {
        try {
          const res = await fetch(`/api/course/${id}`, { cache: "no-store" });
          if (!res.ok) return [id, null] as const;
          const json = (await res.json()) as EnrichmentResponse;
          if (!json.enriched) return [id, null] as const;
          const { enriched: _drop, ...data } = json;
          return [id, data] as const;
        } catch {
          return [id, null] as const;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      setEnrichment((prev) => {
        const next = new Map(prev);
        for (const [id, data] of results) next.set(id, data);
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [steps]);

  return (
    <section className="space-y-6 animate-fade-in">
      <div className="space-y-3">
        <p className="text-sm font-medium text-brand-600 uppercase tracking-wide">
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
          className="absolute left-[10px] sm:left-[14px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-brand-200 via-brand-200 to-transparent"
          aria-hidden="true"
        />

        <ol className="space-y-5 sm:space-y-6 stagger">
          {steps.map((step) => {
            const isCefis = step.tipo === "curso_cefis";
            const enriched =
              isCefis && step.fonte_cefis
                ? enrichment.get(step.fonte_cefis.course_id) ?? null
                : null;
            return (
              <li key={step.ordem} className="relative">
                {/* Node */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-2 flex items-center justify-center rounded-full shadow-sm ${
                    isCefis
                      ? "w-[22px] h-[22px] sm:w-[30px] sm:h-[30px] bg-brand-600 text-white"
                      : "w-[22px] h-[22px] sm:w-[30px] sm:h-[30px] bg-white text-brand-600 border-2 border-brand-300"
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
                      ? "bg-white border-neutral-200 hover:border-brand-300 hover:shadow-sm"
                      : "bg-brand-50/40 border-brand-100 border-dashed"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {isCefis ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-brand-600 text-white">
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
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-white text-brand-700 border border-brand-200">
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
                    {enriched?.crcActive && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200"
                        title={
                          enriched.crcCreditHours
                            ? `Pontua ${enriched.crcCreditHours}h no CRC`
                            : "Curso pontua no CRC"
                        }
                      >
                        <svg
                          className="w-3 h-3"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M12 2 9.91 8.26 3.5 8.27l5.18 3.77L6.61 18.2 12 14.42l5.39 3.78-2.07-6.16 5.18-3.77-6.41-.01z" />
                        </svg>
                        Pontua CRC
                        {enriched.crcCreditHours
                          ? ` · ${enriched.crcCreditHours}h`
                          : ""}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base sm:text-lg font-semibold text-neutral-900 tracking-tight mb-2">
                    {step.titulo.trim()}
                  </h3>

                  <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
                    {step.descricao}
                  </p>

                  {/* Enriched stats row — only renders when we have real fields.
                      If the API failed/timed out, this section is silently empty
                      and the card looks identical to the unenriched version. */}
                  {isCefis && enriched && (
                    <EnrichedStats enriched={enriched} />
                  )}

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

function EnrichedStats({ enriched }: { enriched: EnrichedCourse }) {
  const totalDuration = formatDurationFromSeconds(enriched.duration);
  const rating = enriched.averageRating;
  const hasAnything =
    rating != null ||
    totalDuration != null ||
    enriched.teacherName != null ||
    enriched.lessonCount != null;
  if (!hasAnything) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-neutral-600">
      {rating != null && <Stars rating={rating} />}
      {totalDuration && (
        <span className="inline-flex items-center gap-1">
          <svg
            className="w-3.5 h-3.5 text-neutral-400"
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
          {totalDuration} no curso
        </span>
      )}
      {enriched.lessonCount != null && enriched.lessonCount > 0 && (
        <span className="inline-flex items-center gap-1">
          <svg
            className="w-3.5 h-3.5 text-neutral-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 6h16M4 12h16M4 18h10" />
          </svg>
          {enriched.lessonCount} aulas
        </span>
      )}
      {enriched.teacherName && (
        <span className="inline-flex items-center gap-1">
          <svg
            className="w-3.5 h-3.5 text-neutral-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Prof. {formatTeacherName(enriched.teacherName)}
        </span>
      )}
    </div>
  );
}

// Course rating in CEFIS is a 0-10 scale (we saw "averageRating: 9" in the
// offline data dump). Convert to a 0-5 star display while keeping the
// numeric value visible for transparency.
function Stars({ rating }: { rating: number }) {
  const r5 = Math.max(0, Math.min(5, rating / 2));
  const full = Math.floor(r5);
  const half = r5 - full >= 0.25 && r5 - full < 0.75 ? 1 : 0;
  const empty = 5 - full - half;
  return (
    <span className="inline-flex items-center gap-1 text-amber-500">
      {Array.from({ length: full }).map((_, i) => (
        <Star key={`f${i}`} variant="full" />
      ))}
      {half === 1 && <Star variant="half" />}
      {Array.from({ length: empty }).map((_, i) => (
        <Star key={`e${i}`} variant="empty" />
      ))}
      <span className="ml-1 text-neutral-700 font-medium tabular-nums">
        {rating.toFixed(1)}
      </span>
    </span>
  );
}

function Star({ variant }: { variant: "full" | "half" | "empty" }) {
  if (variant === "empty") {
    return (
      <svg
        className="w-3.5 h-3.5 text-neutral-300"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    );
  }
  if (variant === "half") {
    return (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
        <defs>
          <linearGradient id="half-grad">
            <stop offset="50%" stopColor="currentColor" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <polygon
          points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
          fill="url(#half-grad)"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

// Trim very long teacher names to first two words to keep the card compact.
function formatTeacherName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length <= 2) return parts.join(" ");
  return `${parts[0]} ${parts[parts.length - 1]}`;
}
