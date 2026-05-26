import { NextResponse } from "next/server";
import { searchCourses } from "@/lib/rag";
import {
  diagnoseGaps,
  type DiagnoseInput,
  type AvailableCourse,
} from "@/lib/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = Partial<DiagnoseInput>;

const VALID_NIVEIS = ["iniciante", "intermediario", "avancado"] as const;

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (typeof body.objetivo !== "string" || body.objetivo.trim().length === 0) {
    return NextResponse.json(
      { error: "objetivo (non-empty string) is required" },
      { status: 400 },
    );
  }
  if (typeof body.experiencia !== "string") {
    return NextResponse.json(
      { error: "experiencia (string) is required" },
      { status: 400 },
    );
  }
  if (!VALID_NIVEIS.includes(body.nivel as (typeof VALID_NIVEIS)[number])) {
    return NextResponse.json(
      { error: `nivel must be one of: ${VALID_NIVEIS.join(", ")}` },
      { status: 400 },
    );
  }

  const input: DiagnoseInput = {
    objetivo: body.objetivo.trim(),
    experiencia: body.experiencia.trim(),
    nivel: body.nivel as DiagnoseInput["nivel"],
    ja_conhece: body.ja_conhece?.trim(),
  };

  try {
    // Build a richer query — goal carries the topical intent; level signals depth.
    const searchQuery = `${input.objetivo} ${input.ja_conhece ?? ""}`.trim();

    const tRet0 = Date.now();
    const courses = await searchCourses(searchQuery, 30, 10);
    const retrievalMs = Date.now() - tRet0;

    if (courses.length === 0) {
      return NextResponse.json(
        { error: "no relevant CEFIS courses found for this goal" },
        { status: 404 },
      );
    }

    const availableCourses: AvailableCourse[] = courses.map((c) => ({
      course_id: c.course_id,
      course_title: c.course_title,
      course_summary: c.course_summary,
      course_keywords: c.course_keywords,
    }));

    const { gaps, latencyMs: llmMs } = await diagnoseGaps(
      input,
      availableCourses,
    );

    // Defense in depth: enforce that every cited course exists in our index.
    const validCourseIds = new Set(courses.map((c) => c.course_id));
    const cleanGaps = gaps.filter((g) =>
      validCourseIds.has(g.curso_cefis_relacionado.course_id),
    );

    return NextResponse.json({
      input,
      gaps: cleanGaps,
      courses_consulted: availableCourses.map((c) => ({
        course_id: c.course_id,
        course_title: c.course_title,
      })),
      timing: { retrieval_ms: retrievalMs, llm_ms: llmMs },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
