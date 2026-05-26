import { NextResponse } from "next/server";
import { buildStudyPlan, type Gap } from "@/lib/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = {
  gaps?: Gap[];
  tempo_disponivel?: string;
};

const VALID_PRIORIDADES = ["alta", "media", "baixa"] as const;

function isValidGap(g: unknown): g is Gap {
  if (typeof g !== "object" || g === null) return false;
  const x = g as Record<string, unknown>;
  if (typeof x.topico !== "string") return false;
  if (typeof x.descricao !== "string") return false;
  if (
    typeof x.prioridade !== "string" ||
    !VALID_PRIORIDADES.includes(x.prioridade as (typeof VALID_PRIORIDADES)[number])
  )
    return false;
  if (typeof x.curso_cefis_relacionado !== "object" || x.curso_cefis_relacionado === null)
    return false;
  const c = x.curso_cefis_relacionado as Record<string, unknown>;
  if (typeof c.course_id !== "number" || typeof c.course_title !== "string") return false;
  return true;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.gaps) || body.gaps.length === 0) {
    return NextResponse.json(
      { error: "gaps (non-empty array) is required" },
      { status: 400 },
    );
  }
  if (!body.gaps.every(isValidGap)) {
    return NextResponse.json(
      { error: "each gap must have { topico, descricao, prioridade, curso_cefis_relacionado:{course_id,course_title} }" },
      { status: 400 },
    );
  }
  if (typeof body.tempo_disponivel !== "string" || body.tempo_disponivel.trim().length === 0) {
    return NextResponse.json(
      { error: "tempo_disponivel (non-empty string) is required" },
      { status: 400 },
    );
  }

  try {
    const { steps, latencyMs } = await buildStudyPlan(
      body.gaps,
      body.tempo_disponivel.trim(),
    );

    // Defense in depth: enforce curso_cefis steps reference one of the input gaps' courses.
    const validCourseIds = new Set(
      body.gaps.map((g) => g.curso_cefis_relacionado.course_id),
    );
    const cleanSteps = steps.filter((s) => {
      if (s.tipo === "material_ia") return true;
      return s.fonte_cefis !== null && validCourseIds.has(s.fonte_cefis.course_id);
    });

    return NextResponse.json({
      tempo_disponivel: body.tempo_disponivel.trim(),
      steps: cleanSteps,
      timing: { llm_ms: latencyMs },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
