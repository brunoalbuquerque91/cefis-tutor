import Anthropic from "@anthropic-ai/sdk";

// SDK reads ANTHROPIC_API_KEY from process.env by default.
// In dev, Next.js loads .env.local automatically.
let clientCache: Anthropic | null = null;
function getClient(): Anthropic {
  if (clientCache) return clientCache;
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server.",
    );
  }
  clientCache = new Anthropic();
  return clientCache;
}

const TUTOR_MODEL = "claude-opus-4-7";

// Sonnet 4.6 + low effort + no thinking is intentionally lower-spec than the
// Opus 4.7 used by the tutor and the gap diagnosis. The studyplan task is
// bounded: take 6 gaps → emit ~10-13 sequenced JSON steps under a strict
// schema. Sonnet handles structured generation at this scale comfortably,
// and the route's defense-in-depth filter (route.ts) still strips any step
// referencing a course not in the input. The win is latency: ~38s → ~7-12s.
const STUDYPLAN_MODEL = "claude-sonnet-4-6";

const TUTOR_SYSTEM_PROMPT = `Você é um tutor especialista da plataforma CEFIS, ajudando profissionais brasileiros de contabilidade, fiscal e tributário a entenderem a Reforma Tributária brasileira: EC 132/2023, Lei Complementar 214/2025, IBS, CBS, IVA Dual, Imposto Seletivo, split payment, regimes diferenciados e específicos, transição (2026–2033), e temas relacionados.

REGRAS OBRIGATÓRIAS:

1. IDIOMA — Responda EXCLUSIVAMENTE em português brasileiro (pt-BR), em tom claro, profissional e acessível para profissionais contábeis. Nunca responda em inglês, mesmo que a pergunta seja em inglês.

2. FUNDAMENTAÇÃO — Responda APENAS com base nos trechos dos cursos da CEFIS fornecidos na seção "Contexto" da mensagem do usuário. Não use conhecimento externo sobre legislação tributária brasileira. Se o contexto fornecido NÃO contiver informação suficiente para responder com segurança, diga isso explicitamente em pt-BR — por exemplo: "Não encontrei essa informação específica nos materiais consultados." Nunca invente fatos legais, regulatórios ou numéricos. Precisão é crítica porque o usuário pode agir com base na resposta.

3. CITAÇÕES — Toda afirmação factual deve ser seguida por uma citação inline no formato [1], [2], [3] (etc.), referindo-se aos trechos numerados do contexto. Use múltiplas como [1][3] quando a afirmação combinar fontes. Não cite saudações nem frases de transição — apenas conteúdo factual.

4. ESTILO — Comece pela resposta direta. Seja conciso, mas completo. Use parágrafos curtos ou listas com marcadores para enumerações (alíquotas, prazos, regimes, etapas da transição). Evite preâmbulos desnecessários ou repetições.

5. SAÍDA — Retorne APENAS o texto da resposta. Não inclua uma seção "Fontes:" ou "Referências:" no final — o sistema exibe as fontes separadamente para o usuário.`;

export type TutorSource = {
  id: number;
  course_title: string;
  lesson_position: number;
  lesson_title: string;
  t_start: string;
  t_end: string;
  text: string;
};

export async function askTutor(
  query: string,
  sources: TutorSource[],
): Promise<{ answer: string; latencyMs: number }> {
  const client = getClient();

  const contextBlock = sources
    .map(
      (s) =>
        `[${s.id}] Curso: "${s.course_title}" — Aula ${s.lesson_position}: "${s.lesson_title}" (${s.t_start}–${s.t_end})\n${s.text}`,
    )
    .join("\n\n");

  const userContent = `Pergunta: ${query.trim()}\n\nContexto (trechos de aulas da CEFIS — cite usando [N]):\n\n${contextBlock}`;

  const t0 = Date.now();
  const response = await client.messages.create({
    model: TUTOR_MODEL,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    system: [
      {
        type: "text",
        text: TUTOR_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userContent }],
  });
  const latencyMs = Date.now() - t0;

  const answer = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  return { answer, latencyMs };
}

// ─────────────────────────────────────────────────────────────────────────────
// Gap diagnosis
// ─────────────────────────────────────────────────────────────────────────────

export type DiagnoseInput = {
  objetivo: string;
  experiencia: string;
  nivel: "iniciante" | "intermediario" | "avancado";
  ja_conhece?: string;
};

export type AvailableCourse = {
  course_id: number;
  course_title: string;
  course_summary: string;
  course_keywords: string;
};

export type Gap = {
  topico: string;
  descricao: string;
  prioridade: "alta" | "media" | "baixa";
  curso_cefis_relacionado: {
    course_id: number;
    course_title: string;
  };
};

const DIAGNOSE_SYSTEM_PROMPT = `Você é um analista educacional da plataforma CEFIS. Sua tarefa é identificar as LACUNAS DE CONHECIMENTO de um estudante brasileiro de contabilidade/fiscal, a partir do objetivo dele e do seu nível atual, considerando os cursos REAIS da CEFIS sobre Reforma Tributária listados na mensagem do usuário.

REGRAS OBRIGATÓRIAS:

1. IDIOMA — Responda exclusivamente em português brasileiro (pt-BR).

2. FUNDAMENTAÇÃO ESTRITA — Para cada lacuna, indique UM curso da CEFIS que ajude a preenchê-la. Use APENAS os cursos listados na seção "Cursos disponíveis na CEFIS" da mensagem do usuário — copie course_id e course_title exatamente como aparecem. NUNCA invente nomes ou IDs de cursos.

3. PRIORIZE — Identifique entre 3 e 6 lacunas, com prioridade "alta", "media" ou "baixa" conforme o impacto para o objetivo do estudante e o seu nível atual. Um estudante iniciante deve ter prioridade alta nos fundamentos; um avançado, nos temas específicos.

4. ESPECIFICIDADE — Cada lacuna tem:
   - "topico": tópico claro e específico (ex.: "Cálculo do IBS e CBS", "Transição 2026–2033", "Regimes diferenciados para serviços", "Não cumulatividade e créditos").
   - "descricao": 1–2 frases explicando por que o estudante precisa aprender isso para alcançar o objetivo.
   - "prioridade": "alta" | "media" | "baixa".
   - "curso_cefis_relacionado": objeto com course_id (number) e course_title (string), copiados literalmente da lista de cursos disponíveis.

5. FORMATO — Retorne APENAS JSON válido seguindo o schema do output_config. Não inclua texto antes ou depois.`;

const DIAGNOSE_SCHEMA = {
  type: "object",
  properties: {
    gaps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          topico: { type: "string" },
          descricao: { type: "string" },
          prioridade: { type: "string", enum: ["alta", "media", "baixa"] },
          curso_cefis_relacionado: {
            type: "object",
            properties: {
              course_id: { type: "integer" },
              course_title: { type: "string" },
            },
            required: ["course_id", "course_title"],
            additionalProperties: false,
          },
        },
        required: ["topico", "descricao", "prioridade", "curso_cefis_relacionado"],
        additionalProperties: false,
      },
    },
  },
  required: ["gaps"],
  additionalProperties: false,
};

export async function diagnoseGaps(
  input: DiagnoseInput,
  availableCourses: AvailableCourse[],
): Promise<{ gaps: Gap[]; latencyMs: number }> {
  const client = getClient();

  const coursesBlock = availableCourses
    .map(
      (c, i) =>
        `${i + 1}. course_id=${c.course_id} — "${c.course_title}"\n   Resumo: ${c.course_summary.slice(0, 600)}\n   Palavras-chave: ${c.course_keywords}`,
    )
    .join("\n\n");

  const userContent = `Perfil do estudante:
- Objetivo: ${input.objetivo}
- Experiência profissional: ${input.experiencia}
- Nível atual: ${input.nivel}
${input.ja_conhece ? `- O que já conhece: ${input.ja_conhece}` : ""}

Cursos disponíveis na CEFIS (use APENAS estes — não invente):

${coursesBlock}

Identifique entre 3 e 6 lacunas de conhecimento que este estudante precisa preencher para alcançar o objetivo. Para cada lacuna, escolha UM curso da lista acima que melhor ajude (copiando course_id e course_title literalmente). Retorne JSON conforme o schema.`;

  const t0 = Date.now();
  const response = await client.messages.create({
    model: TUTOR_MODEL,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: { type: "json_schema", schema: DIAGNOSE_SCHEMA },
    },
    system: DIAGNOSE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });
  const latencyMs = Date.now() - t0;

  const jsonText = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  const parsed = JSON.parse(jsonText) as { gaps: Gap[] };
  return { gaps: parsed.gaps, latencyMs };
}

// ─────────────────────────────────────────────────────────────────────────────
// Study plan
// ─────────────────────────────────────────────────────────────────────────────

export type StudyStep = {
  ordem: number;
  titulo: string;
  tipo: "curso_cefis" | "material_ia";
  descricao: string;
  duracao_estimada: string;
  fonte_cefis: { course_id: number; course_title: string } | null;
};

const STUDYPLAN_SYSTEM_PROMPT = `Você é um planejador de estudos da plataforma CEFIS. Sua tarefa é construir um plano de estudos SEQUENCIADO em pt-BR para um estudante brasileiro de contabilidade/fiscal, combinando cursos REAIS da CEFIS (referenciados nas lacunas fornecidas) com materiais curtos gerados por IA, adaptado ao tempo disponível.

REGRAS OBRIGATÓRIAS:

1. IDIOMA — Responda exclusivamente em pt-BR.

2. CONTEÚDO REAL — Use APENAS os cursos da CEFIS já citados nas lacunas (copie course_id e course_title literalmente). NUNCA invente cursos. Etapas do tipo "material_ia" são permitidas e devem ser usadas para: introdução conceitual, ponte entre cursos, revisão/exercício de fixação, ou resumo final.

3. SEQUÊNCIA — Ordene do conceitual ao prático. Comece pelos fundamentos (lacunas de prioridade alta), avance para temas específicos. Intercale material_ia com curso_cefis para não cansar o estudante.

4. DIMENSIONAMENTO PELO TEMPO — Use o "tempo disponível" do estudante para calibrar:
   - Se for "X minutos por dia", divida o plano em sessões diárias dessa duração; "duracao_estimada" de cada etapa deve caber em uma ou poucas sessões.
   - Se for "X horas no total", todas as etapas somadas devem caber nesse total.
   - Para material_ia: 5–15 minutos. Para curso_cefis: estime conforme a profundidade necessária (20–60 minutos típico para uma seleção de aulas do curso).

5. CAMPO fonte_cefis:
   - Para tipo="curso_cefis": objeto { course_id, course_title } literal da lacuna.
   - Para tipo="material_ia": null.

6. DESCRICAO DETALHADA — Para material_ia, a "descricao" deve conter o conteúdo real do material (3–6 frases, em pt-BR, útil para o estudante). Para curso_cefis, descreva o que o estudante deve focar nesse curso.

7. FORMATO — Retorne APENAS JSON válido seguindo o schema do output_config. Sem texto extra.`;

const STUDYPLAN_SCHEMA = {
  type: "object",
  properties: {
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          ordem: { type: "integer" },
          titulo: { type: "string" },
          tipo: { type: "string", enum: ["curso_cefis", "material_ia"] },
          descricao: { type: "string" },
          duracao_estimada: { type: "string" },
          fonte_cefis: {
            anyOf: [
              {
                type: "object",
                properties: {
                  course_id: { type: "integer" },
                  course_title: { type: "string" },
                },
                required: ["course_id", "course_title"],
                additionalProperties: false,
              },
              { type: "null" },
            ],
          },
        },
        required: ["ordem", "titulo", "tipo", "descricao", "duracao_estimada", "fonte_cefis"],
        additionalProperties: false,
      },
    },
  },
  required: ["steps"],
  additionalProperties: false,
};

export async function buildStudyPlan(
  gaps: Gap[],
  tempoDisponivel: string,
): Promise<{ steps: StudyStep[]; latencyMs: number }> {
  const client = getClient();

  const gapsBlock = gaps
    .map(
      (g, i) =>
        `${i + 1}. [${g.prioridade.toUpperCase()}] ${g.topico}\n   ${g.descricao}\n   Curso CEFIS: course_id=${g.curso_cefis_relacionado.course_id}, "${g.curso_cefis_relacionado.course_title}"`,
    )
    .join("\n\n");

  const userContent = `Lacunas identificadas no diagnóstico:

${gapsBlock}

Tempo disponível do estudante: ${tempoDisponivel}

Construa um plano de estudos sequenciado em pt-BR, combinando os cursos da CEFIS acima com materiais curtos gerados por IA. Retorne JSON conforme o schema.`;

  const t0 = Date.now();
  const response = await client.messages.create({
    model: STUDYPLAN_MODEL,
    max_tokens: 4096,
    thinking: { type: "disabled" },
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: STUDYPLAN_SCHEMA },
    },
    system: STUDYPLAN_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });
  const latencyMs = Date.now() - t0;

  const jsonText = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  const parsed = JSON.parse(jsonText) as { steps: StudyStep[] };
  return { steps: parsed.steps, latencyMs };
}
