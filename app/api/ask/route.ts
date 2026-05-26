import { NextResponse } from "next/server";
import { search } from "@/lib/rag";
import { askTutor, type TutorSource } from "@/lib/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TOP_K = 5;

export async function POST(request: Request) {
  let body: { query?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const query = body?.query;
  if (typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json(
      { error: "query (non-empty string) is required" },
      { status: 400 },
    );
  }

  try {
    const tRetrieval0 = Date.now();
    const hits = await search(query.trim(), TOP_K);
    const retrievalMs = Date.now() - tRetrieval0;

    const sources: TutorSource[] = hits.map((h, i) => ({
      id: i + 1,
      course_title: h.chunk.course_title,
      lesson_position: h.chunk.lesson_position,
      lesson_title: h.chunk.lesson_title,
      t_start: h.chunk.t_start_str,
      t_end: h.chunk.t_end_str,
      text: h.chunk.text,
    }));

    const { answer, latencyMs: llmMs } = await askTutor(query, sources);

    return NextResponse.json({
      query: query.trim(),
      answer,
      citations: hits.map((h, i) => ({
        id: i + 1,
        score: Number(h.score.toFixed(4)),
        course_id: h.chunk.course_id,
        course_title: h.chunk.course_title,
        lesson_position: h.chunk.lesson_position,
        lesson_title: h.chunk.lesson_title,
        t_start: h.chunk.t_start_str,
        t_end: h.chunk.t_end_str,
        excerpt: h.chunk.text.slice(0, 240),
      })),
      timing: { retrieval_ms: retrievalMs, llm_ms: llmMs },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
