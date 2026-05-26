import { NextResponse } from "next/server";
import { search } from "@/lib/rag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: { query?: string; k?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const query = body?.query;
  const k = typeof body?.k === "number" && body.k > 0 ? Math.min(body.k, 20) : 5;

  if (typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json(
      { error: "query (non-empty string) is required" },
      { status: 400 },
    );
  }

  try {
    const t0 = Date.now();
    const hits = await search(query.trim(), k);
    const ms = Date.now() - t0;

    return NextResponse.json({
      query: query.trim(),
      latency_ms: ms,
      hits: hits.map((h) => ({
        score: Number(h.score.toFixed(4)),
        course_id: h.chunk.course_id,
        course_title: h.chunk.course_title,
        lesson_position: h.chunk.lesson_position,
        lesson_title: h.chunk.lesson_title,
        t_start: h.chunk.t_start_str,
        t_end: h.chunk.t_end_str,
        text_preview: h.chunk.text.slice(0, 240),
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
