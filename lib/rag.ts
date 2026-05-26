import fs from "node:fs";
import path from "node:path";
import { pipeline, env, type FeatureExtractionPipeline } from "@xenova/transformers";

// Keep the model cache inside the project so dev + serverless behave the same.
env.cacheDir = path.join(process.cwd(), ".cache", "transformers");
// Don't try to load local models from disk — only fetch from HF Hub.
env.allowLocalModels = false;

const DATA_DIR = path.join(process.cwd(), "data", "rag");
const MODEL_ID = "Xenova/multilingual-e5-small";

export type Chunk = {
  course_id: number;
  course_title: string;
  course_summary: string;
  course_keywords: string;
  lesson_id: number;
  lesson_title: string;
  lesson_position: number;
  t_start_str: string;
  t_end_str: string;
  text: string;
  [k: string]: unknown;
};

export type CourseInfo = {
  course_id: number;
  course_title: string;
  course_summary: string;
  course_keywords: string;
  best_score: number;
};

let chunksCache: Chunk[] | null = null;
let embeddingsCache: Float32Array | null = null;
let embeddingDim = 0;
let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

function loadIndex() {
  if (chunksCache && embeddingsCache) return;

  const jsonl = fs.readFileSync(path.join(DATA_DIR, "chunks.jsonl"), "utf-8");
  chunksCache = jsonl
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as Chunk);

  const meta = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, "embeddings.meta.json"), "utf-8"),
  ) as { shape: [number, number]; dtype: string };

  const [n, dim] = meta.shape;
  embeddingDim = dim;

  // Read raw float32 buffer. Copy bytes into a fresh ArrayBuffer so the
  // Float32Array view is properly aligned (Node Buffers may share an offset).
  const buf = fs.readFileSync(path.join(DATA_DIR, "embeddings.bin"));
  const ab = new ArrayBuffer(buf.byteLength);
  new Uint8Array(ab).set(buf);
  embeddingsCache = new Float32Array(ab);

  if (embeddingsCache.length !== n * dim) {
    throw new Error(
      `embeddings size mismatch: expected ${n * dim} floats, got ${embeddingsCache.length}`,
    );
  }
  if (chunksCache.length !== n) {
    throw new Error(
      `chunks/embeddings length mismatch: ${chunksCache.length} chunks vs ${n} rows`,
    );
  }
}

function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    extractorPromise = pipeline(
      "feature-extraction",
      MODEL_ID,
    ) as Promise<FeatureExtractionPipeline>;
  }
  return extractorPromise;
}

export type SearchHit = {
  score: number;
  chunk: Chunk;
};

export async function search(query: string, k = 5): Promise<SearchHit[]> {
  loadIndex();
  const extractor = await getExtractor();

  // e5 family expects "query: " on queries and "passage: " on docs.
  // Documents in the index were already embedded with "passage:" by the Python build.
  const output = await extractor(`query: ${query}`, {
    pooling: "mean",
    normalize: true,
  });
  const qv = output.data as Float32Array;

  if (qv.length !== embeddingDim) {
    throw new Error(
      `query vector dim mismatch: model returned ${qv.length}, index has ${embeddingDim}`,
    );
  }

  const n = chunksCache!.length;
  const scores = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    const off = i * embeddingDim;
    for (let j = 0; j < embeddingDim; j++) {
      s += embeddingsCache![off + j] * qv[j];
    }
    scores[i] = s;
  }

  const indices = Array.from({ length: n }, (_, i) => i);
  indices.sort((a, b) => scores[b] - scores[a]);
  return indices.slice(0, k).map((i) => ({
    score: scores[i],
    chunk: chunksCache![i],
  }));
}

// Dedupe top-N chunks by course_id → distinct courses (best-scoring chunk wins).
// Used by /api/diagnose to surface the CEFIS courses Claude can ground its
// gap analysis on. Default scan width 25 chunks yields ~8-12 distinct courses
// for typical broad goals — enough variety without overwhelming Claude's context.
export async function searchCourses(
  query: string,
  scanChunks = 25,
  maxCourses = 10,
): Promise<CourseInfo[]> {
  const hits = await search(query, scanChunks);
  const byCourse = new Map<number, CourseInfo>();
  for (const h of hits) {
    const prev = byCourse.get(h.chunk.course_id);
    if (!prev || h.score > prev.best_score) {
      byCourse.set(h.chunk.course_id, {
        course_id: h.chunk.course_id,
        course_title: h.chunk.course_title,
        course_summary: h.chunk.course_summary ?? "",
        course_keywords: h.chunk.course_keywords ?? "",
        best_score: h.score,
      });
    }
  }
  return Array.from(byCourse.values())
    .sort((a, b) => b.best_score - a.best_score)
    .slice(0, maxCourses);
}
