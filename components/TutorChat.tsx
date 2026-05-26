"use client";

import { useEffect, useRef, useState } from "react";
import type { AskResponse, Citation } from "@/lib/types";
import CefisSymbol from "@/components/CefisSymbol";

type Message =
  | { role: "user"; text: string }
  | {
      role: "assistant";
      text: string;
      citations: Citation[];
      latencyMs?: number;
    };

const SUGGESTIONS = [
  "O que é split payment na reforma tributária?",
  "Quando começa a transição da reforma?",
  "Como o Simples Nacional é afetado?",
  "Qual é o regime para bares e restaurantes?",
];

export default function TutorChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom on new message / loading change.
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function send(query: string) {
    const q = query.trim();
    if (!q || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(msg.error ?? "ask failed");
      }
      const data = (await res.json()) as AskResponse;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.answer,
          citations: data.citations,
          latencyMs: data.timing?.llm_ms,
        },
      ]);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex flex-col h-[100dvh] sm:h-[calc(100dvh-2rem)] max-h-[1000px] animate-fade-in">
      {/* Header */}
      <header className="px-4 sm:px-6 py-4 border-b border-neutral-200 bg-white">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center">
            <CefisSymbol className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-neutral-900">Tutor CEFIS</div>
            <div className="text-xs text-neutral-500">
              Respostas fundamentadas em aulas reais da plataforma
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 sm:py-8"
      >
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 && !loading && (
            <EmptyState onSuggest={send} />
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <UserBubble key={i} text={m.text} />
            ) : (
              <AssistantTurn
                key={i}
                text={m.text}
                citations={m.citations}
                latencyMs={m.latencyMs}
              />
            ),
          )}

          {loading && <AssistantSkeleton />}

          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              <strong>Erro:</strong> {error}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <footer className="px-4 sm:px-6 py-4 border-t border-neutral-200 bg-white">
        <form
          className="max-w-3xl mx-auto flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte ao tutor — em português…"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            className="flex-1 p-3 sm:p-4 text-base border border-neutral-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent resize-none transition max-h-32"
          />
          <button
            type="submit"
            disabled={loading || input.trim().length === 0}
            aria-label="Enviar pergunta"
            className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-brand-600 text-white rounded-2xl hover:bg-brand-700 disabled:bg-neutral-300 disabled:cursor-not-allowed transition active:scale-95 flex items-center justify-center"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </footer>
    </section>
  );
}

function EmptyState({ onSuggest }: { onSuggest: (q: string) => void }) {
  return (
    <div className="text-center py-8 sm:py-12 space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900 tracking-tight">
          Tire suas dúvidas
        </h2>
        <p className="text-base sm:text-lg text-neutral-600">
          Cada resposta cita a aula, o curso e o momento exato do conteúdo na
          CEFIS.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-2 sm:gap-3 max-w-xl mx-auto stagger">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSuggest(s)}
            className="p-3 sm:p-4 text-left text-sm sm:text-base border border-neutral-200 rounded-2xl bg-white hover:border-brand-300 hover:bg-brand-50/40 transition"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end animate-fade-in">
      <div className="max-w-[85%] sm:max-w-[75%] px-4 py-3 bg-brand-600 text-white rounded-2xl rounded-br-md text-sm sm:text-base leading-relaxed shadow-sm whitespace-pre-wrap break-words">
        {text}
      </div>
    </div>
  );
}

function AssistantSkeleton() {
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="max-w-[85%] sm:max-w-[80%] px-5 py-4 bg-white border border-neutral-200 rounded-2xl rounded-bl-md space-y-2">
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <div className="w-2 h-2 rounded-full bg-brand-600 animate-pulse" />
          <span>Consultando as aulas da CEFIS…</span>
        </div>
        <div className="space-y-2 pt-1">
          <div className="h-2.5 bg-neutral-100 rounded animate-pulse" />
          <div className="h-2.5 bg-neutral-100 rounded animate-pulse w-11/12" />
          <div className="h-2.5 bg-neutral-100 rounded animate-pulse w-3/4" />
        </div>
      </div>
    </div>
  );
}

function AssistantTurn({
  text,
  citations,
  latencyMs,
}: {
  text: string;
  citations: Citation[];
  latencyMs?: number;
}) {
  return (
    <div className="flex flex-col items-start gap-3 animate-fade-in">
      <div className="max-w-[100%] sm:max-w-[92%] px-5 py-4 bg-white border border-neutral-200 rounded-2xl rounded-bl-md shadow-sm w-full">
        <Markdown text={text} citationCount={citations.length} />
        {typeof latencyMs === "number" && (
          <div className="mt-3 pt-3 border-t border-neutral-100 text-xs text-neutral-400">
            Resposta gerada em {(latencyMs / 1000).toFixed(1)}s
          </div>
        )}
      </div>

      {citations.length > 0 && (
        <div className="w-full space-y-2">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide px-1">
            Fontes consultadas na CEFIS
          </div>
          <div className="grid sm:grid-cols-2 gap-2 sm:gap-3">
            {citations.map((c) => (
              <CitationCard key={c.id} c={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CitationCard({ c }: { c: Citation }) {
  return (
    <article className="p-4 bg-white border border-neutral-200 rounded-2xl hover:border-brand-300 hover:shadow-sm transition">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold">
          {c.id}
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-brand-600 text-white tracking-wide">
              CEFIS
            </span>
            <span className="text-[11px] text-neutral-400 font-mono">
              {c.t_start.slice(0, 8)}–{c.t_end.slice(0, 8)}
            </span>
          </div>
          <div className="text-sm font-semibold text-neutral-900 leading-snug line-clamp-2">
            {c.course_title.trim()}
          </div>
          <div className="text-xs text-neutral-600 leading-snug">
            Aula {c.lesson_position}: {c.lesson_title.trim()}
          </div>
          <p className="text-xs text-neutral-500 leading-relaxed line-clamp-3 pt-1">
            “{c.excerpt.trim()}…”
          </p>
        </div>
      </div>
    </article>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Minimal markdown — handles what our tutor LLM actually emits:
// `# ## ###` headings, `- ` bullets, `1. ` ordered list items,
// `**bold**`, inline `[N]` citation markers, and paragraphs.
// ───────────────────────────────────────────────────────────────────────────

function Markdown({
  text,
  citationCount,
}: {
  text: string;
  citationCount: number;
}) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^###\s+/.test(line)) {
      blocks.push(
        <h4
          key={key++}
          className="text-sm sm:text-base font-semibold text-neutral-900 mt-3 mb-1"
        >
          {renderInline(line.replace(/^###\s+/, ""), citationCount, key++)}
        </h4>,
      );
      i++;
      continue;
    }
    if (/^##\s+/.test(line)) {
      blocks.push(
        <h3
          key={key++}
          className="text-base sm:text-lg font-semibold text-neutral-900 mt-4 mb-1.5 tracking-tight"
        >
          {renderInline(line.replace(/^##\s+/, ""), citationCount, key++)}
        </h3>,
      );
      i++;
      continue;
    }
    if (/^#\s+/.test(line)) {
      blocks.push(
        <h2
          key={key++}
          className="text-lg sm:text-xl font-semibold text-neutral-900 mt-4 mb-2 tracking-tight"
        >
          {renderInline(line.replace(/^#\s+/, ""), citationCount, key++)}
        </h2>,
      );
      i++;
      continue;
    }

    // Bullet list group
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul
          key={key++}
          className="list-disc pl-5 space-y-1 my-2 text-sm sm:text-base text-neutral-700"
        >
          {items.map((it, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(it, citationCount, idx)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Ordered list group
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        <ol
          key={key++}
          className="list-decimal pl-5 space-y-1 my-2 text-sm sm:text-base text-neutral-700"
        >
          {items.map((it, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(it, citationCount, idx)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    // Blank line — paragraph separator
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph: collect contiguous non-empty lines
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^#{1,3}\s/.test(lines[i]) &&
      !/^\s*[-*]\s/.test(lines[i]) &&
      !/^\s*\d+\.\s/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p
        key={key++}
        className="text-sm sm:text-base text-neutral-800 leading-relaxed my-2"
      >
        {renderInline(para.join(" "), citationCount, key++)}
      </p>,
    );
  }

  return <div>{blocks}</div>;
}

function renderInline(
  text: string,
  citationCount: number,
  baseKey: number,
): React.ReactNode {
  // Split by **bold** first, then by [N] citation markers.
  const out: React.ReactNode[] = [];
  let k = 0;
  // Greedy regex: matches **xxx** OR [N]
  const re = /\*\*(.+?)\*\*|\[(\d+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      out.push(
        <strong key={`${baseKey}-b-${k++}`} className="font-semibold">
          {m[1]}
        </strong>,
      );
    } else if (m[2] !== undefined) {
      const n = parseInt(m[2], 10);
      const inRange = n >= 1 && n <= citationCount;
      out.push(
        <sup
          key={`${baseKey}-c-${k++}`}
          className={`inline-flex items-center justify-center min-w-[1.4em] h-[1.4em] mx-0.5 px-1 rounded-md text-[10px] font-semibold align-baseline ${
            inRange
              ? "bg-brand-100 text-brand-700"
              : "bg-neutral-100 text-neutral-500"
          }`}
        >
          {n}
        </sup>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
