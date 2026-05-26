// Server-only CEFIS API client. Fetches course details from api-v3.cefis.com.br
// for the study-plan card enrichment. Designed to be RESILIENT — if the API is
// slow, errors, or the course isn't found, we return null and let the UI fall
// back to the unenriched card. Never throw to the caller.

const BASE_URL = "https://api-v3.cefis.com.br";
const REQUEST_TIMEOUT_MS = 3000;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes — course metadata rarely changes

export type EnrichedCourse = {
  course_id: number;
  averageRating: number | null;
  duration: number | null; // seconds, per CEFIS schema we saw earlier
  teacherName: string | null;
  lessonCount: number | null;
  crcActive: boolean;
  crcCreditHours: number | null;
};

type CacheEntry = { data: EnrichedCourse | null; expiresAt: number };
const cache = new Map<number, CacheEntry>();

function getKey(): string | null {
  const k = process.env.CEFIS_API_KEY;
  return k && k.trim().length > 0 ? k.trim() : null;
}

// Best-effort field extraction. The CEFIS course details shape we know from
// the offline dump puts metadata under `data.*` — but the API might also
// return a flat shape. Probe both, take what's available, leave nulls when
// missing. Better to ship partial enrichment than to hard-fail.
function extractFields(payload: unknown, course_id: number): EnrichedCourse | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const data =
    (root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root) ?? {};

  const num = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  const str = (v: unknown): string | null =>
    typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
  const bool = (v: unknown): boolean =>
    v === true || v === "true" || v === 1;

  const teacher =
    typeof data.teacher === "object" && data.teacher !== null
      ? (data.teacher as Record<string, unknown>)
      : {};

  return {
    course_id,
    averageRating: num(data.averageRating),
    duration: num(data.duration),
    teacherName: str(teacher.name),
    lessonCount: num(data.lessonCount),
    crcActive: bool(data.crcActive),
    crcCreditHours: num(data.crcCreditHours),
  };
}

export async function getCourseDetails(
  courseId: number,
): Promise<EnrichedCourse | null> {
  const key = getKey();
  if (!key) return null; // No env var → graceful no-op, journey still works.

  const now = Date.now();
  const cached = cache.get(courseId);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}/courses/${courseId}`, {
      method: "GET",
      headers: {
        // api-v3.cefis.com.br requires "Bearer <key>" prefix
        // (cefis.com.br itself takes the key without prefix — different surface).
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      signal: controller.signal,
      // Avoid Next.js fetch caching at the data layer — we manage our own TTL above.
      cache: "no-store",
    });
    clearTimeout(timer);

    if (!res.ok) {
      // 401/403/404/5xx → cache the null briefly so we don't hammer on errors
      cache.set(courseId, { data: null, expiresAt: now + 60_000 });
      return null;
    }

    const payload = (await res.json()) as unknown;
    const enriched = extractFields(payload, courseId);
    cache.set(courseId, { data: enriched, expiresAt: now + CACHE_TTL_MS });
    return enriched;
  } catch {
    // Timeout / network / parse error → null + brief negative-cache.
    clearTimeout(timer);
    cache.set(courseId, { data: null, expiresAt: now + 60_000 });
    return null;
  }
}
