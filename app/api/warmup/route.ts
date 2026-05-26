import { NextResponse } from "next/server";
import { search } from "@/lib/rag";

// Vercel Cron sends GET requests, so this route handles GET (not POST).
// It triggers a real retrieval against a tiny query, which pulls the
// multilingual-e5-small model into the function's /tmp + in-process cache.
// Subsequent user-facing /api/ask & /api/search & /api/diagnose calls hitting
// the same warm container skip the ~30s ONNX model download.
//
// Intentionally unauthenticated: the endpoint is idempotent and cheap, and
// public knowledge of its existence carries no risk worth the auth complexity.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const t0 = Date.now();
  try {
    await search("aquecimento", 1);
    return NextResponse.json({
      ok: true,
      warmed_ms: Date.now() - t0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: message, warmed_ms: Date.now() - t0 },
      { status: 500 },
    );
  }
}
