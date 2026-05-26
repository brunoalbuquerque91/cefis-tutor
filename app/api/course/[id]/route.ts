import { NextResponse } from "next/server";
import { getCourseDetails } from "@/lib/cefis";

// Public-facing proxy that keeps CEFIS_API_KEY server-side. The frontend
// calls /api/course/4396 and gets either enriched fields or a graceful
// { enriched: false } — never an upstream error code. The journey must
// continue rendering cards even if this endpoint can't fetch anything.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const id = Number.parseInt(params.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ enriched: false, reason: "invalid id" });
  }

  // getCourseDetails is itself resilient (timeout + try/catch + null on
  // failure), so this route is effectively guaranteed to respond 200.
  const data = await getCourseDetails(id);
  if (!data) {
    return NextResponse.json({ enriched: false });
  }
  return NextResponse.json({ enriched: true, ...data });
}
