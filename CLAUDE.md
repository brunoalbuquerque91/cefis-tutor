# CEFIS Tutor — Hackathon Project

## Goal
AI-powered learning tutor for CEFIS, a Brazilian platform for accounting/tax/labor
professionals. One-day hackathon build.

## CRITICAL: Language
ALL user-facing text MUST be in Brazilian Portuguese (pt-BR): UI, tutor responses,
study plans, diagnostics. Code and variable names stay in English.

## Must-have features (core loop — decides 55% of score)
1. Onboarding: collect student profile, goal, experience, knowledge level
2. Gap diagnosis: identify what the student needs to learn to reach their goal
3. Study plan: generated from diagnosis, combining CEFIS course content with
   AI-generated material, adapted to the student's available time
4. Q&A tutor: answers grounded in REAL CEFIS content via RAG, WITH source citations
   (course title + lesson + timestamp)

## Niche (focused demo)
Reforma Tributária only. RAG index already built over 29 courses / 669 lessons /
2159 chunks. Embedding model: multilingual-e5-small (local, multilingual, 384-dim).
Index files: C:\Users\Bruno\Downloads\courses\rag_index\ (embeddings.npy,
chunks.jsonl, manifest.json).

## Architecture (DECIDED — do not reopen)
- Frontend + API: Next.js 14 (App Router, TS, Tailwind) on Vercel
- LLM: Anthropic Claude via API (the tutor's brain)
- RAG: Option B — run multilingual-e5-small in JS via @xenova/transformers inside
  a Next.js serverless route, so the existing index stays valid and we keep ONE
  Vercel deploy
- CEFIS live data: REST API at api-v3.cefis.com.br (user profile, progress, catalog)

## Hard rules
- All project code written during hackathon day only
- Must stay deployed online (public URL), not localhost
- Public GitHub repo; NEVER commit API keys (.env.local + Vercel env vars)

## Guiding principle
Simple and stable beats clever and broken. The core loop working flawlessly on the
public URL is worth more than half-finished extras.
