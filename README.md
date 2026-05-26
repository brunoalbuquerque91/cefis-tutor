# CEFIS — Tutor de Aprendizado com IA

Tutor educacional impulsionado por IA para profissionais brasileiros de contabilidade, fiscal e tributário, com respostas fundamentadas em aulas reais da plataforma CEFIS.

### 🔗 [Demo ao vivo →](https://cefis-tutor-black.vercel.app)

---

## Sobre o projeto

Projeto construído em um dia, como parte de um hackathon. É um tutor de aprendizado com IA focado no nicho da **Reforma Tributária** brasileira (EC 132/2023, Lei Complementar 214/2025, IBS, CBS, IVA Dual, Imposto Seletivo, split payment e transição 2026–2033). O objetivo é demonstrar como a IA pode acelerar o aprendizado dos alunos da CEFIS mantendo total fidelidade ao conteúdo real dos cursos da plataforma.

---

## Funcionalidades

O produto entrega um **ciclo completo de aprendizado** em uma única jornada guiada, em português brasileiro:

1. **Onboarding personalizado** — em 4 perguntas curtas, coleta o objetivo do estudante, sua experiência profissional, nível de conhecimento atual e o tempo disponível para estudar.
2. **Diagnóstico de lacunas de conhecimento** — identifica, com base no perfil do estudante, entre 3 e 6 áreas que ele precisa dominar para atingir o objetivo. Cada lacuna é priorizada (alta / média / baixa) e mapeada para um curso real da CEFIS.
3. **Plano de estudos sequenciado** — gera um caminho de aprendizado adaptado ao tempo disponível, intercalando cursos reais da CEFIS com materiais curtos gerados por IA (introduções conceituais, glossários, exercícios de fixação, resumos).
4. **Tutor de perguntas e respostas (Q&A) com fundamentação** — responde dúvidas pontuais com respostas baseadas exclusivamente nas transcrições reais das aulas, com citações inline `[1] [2]` apontando para curso, aula e tempo exato do conteúdo.

---

## Como funciona

```
Onboarding → Recuperação RAG → Diagnóstico → Plano de estudos → Tutor com citações
```

1. O estudante responde 4 perguntas sobre objetivo, experiência, nível e tempo disponível.
2. O sistema realiza **busca semântica** nos trechos das aulas da CEFIS sobre Reforma Tributária e seleciona os cursos mais relevantes para o objetivo declarado.
3. A IA analisa o perfil do estudante junto com os cursos disponíveis e identifica as principais lacunas de conhecimento, com prioridade.
4. A IA sequencia esses cursos em um plano de estudos personalizado, intercalando-os com materiais curtos gerados por IA, e calibra a duração de cada etapa ao tempo disponível por dia.
5. Em qualquer momento, o estudante pode tirar dúvidas pontuais com o tutor, que responde **citando curso + número da aula + faixa de tempo** dos trechos consultados.

---

## Arquitetura

| Camada | Tecnologia |
|---|---|
| Frontend + API | Next.js 14 (App Router · TypeScript · Tailwind CSS) |
| Hospedagem | Vercel (com cron de aquecimento de 5 minutos para evitar cold start) |
| LLM | Claude da Anthropic — **Opus 4.7** para o tutor e o diagnóstico |
| Recuperação (RAG) | Índice local sobre **669 aulas** e **2.159 trechos** da Reforma Tributária da CEFIS |
| Embeddings | `intfloat/multilingual-e5-small` (384 dimensões) rodando em JavaScript via `@xenova/transformers` |
| Busca | Similaridade do cosseno em memória (vetores L2-normalizados, produto interno) |
| Idioma do conteúdo | 100% português brasileiro (pt-BR) |

A recuperação semântica roda **dentro da mesma função serverless do Next.js** — sem serviço externo de busca, mantendo a aplicação como um único deploy.

---

## Integração com a CEFIS

Cada resposta do tutor é **fundamentada em transcrições reais das aulas da CEFIS** sobre Reforma Tributária. O sistema **NUNCA** utiliza conhecimento externo: se a informação não estiver no contexto recuperado, o tutor afirma explicitamente que não encontrou — porque precisão em matéria tributária é crítica.

Toda afirmação factual é acompanhada por uma **citação inline `[N]`** que referencia um cartão de fonte abaixo da resposta, com:

- **Título do curso** real da CEFIS
- **Número e título da aula** dentro do curso
- **Faixa de tempo exato** (`HH:MM:SS–HH:MM:SS`) em que o tema é abordado
- Trecho da transcrição usado como base da resposta

A mesma fidelidade vale para o diagnóstico e o plano de estudos: todos os cursos referenciados existem realmente na CEFIS — não há cursos inventados em nenhuma etapa da jornada.

---

## Conformidade com as regras do hackathon

- ✅ **Todo o código foi escrito durante o dia do hackathon** (histórico público de commits no repositório)
- ✅ **Aplicação publicada online** em [https://cefis-tutor-black.vercel.app](https://cefis-tutor-black.vercel.app) — acessível publicamente, não em localhost
- ✅ **Repositório público** no GitHub
- ✅ **Sem chaves de API no código** — `ANTHROPIC_API_KEY` configurada exclusivamente em variáveis de ambiente do Vercel
- ✅ **Todo o texto exibido ao usuário em português brasileiro (pt-BR)** — UI, respostas do tutor, planos de estudo e diagnósticos
- ✅ **Conteúdo fundamentado em cursos reais da CEFIS**, com citações verificáveis para curso, aula e tempo

---

## Documentação formal

O documento formal de apresentação do projeto está disponível em [`docs/CEFIS_Tutor_Documentacao.docx`](./docs/CEFIS_Tutor_Documentacao.docx).
