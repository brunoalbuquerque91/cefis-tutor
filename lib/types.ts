// Shared types — safe to import from client components (no runtime SDK deps).

export type Nivel = "iniciante" | "intermediario" | "avancado";

export type StudentProfile = {
  objetivo: string;
  experiencia: string;
  nivel: Nivel;
  tempo_disponivel: string;
};

export type CursoRef = {
  course_id: number;
  course_title: string;
};

export type Prioridade = "alta" | "media" | "baixa";

export type Gap = {
  topico: string;
  descricao: string;
  prioridade: Prioridade;
  curso_cefis_relacionado: CursoRef;
};

export type StudyStep = {
  ordem: number;
  titulo: string;
  tipo: "curso_cefis" | "material_ia";
  descricao: string;
  duracao_estimada: string;
  fonte_cefis: CursoRef | null;
};

export type Citation = {
  id: number;
  score: number;
  course_id: number;
  course_title: string;
  lesson_position: number;
  lesson_title: string;
  t_start: string;
  t_end: string;
  excerpt: string;
};

export type AskResponse = {
  query: string;
  answer: string;
  citations: Citation[];
  timing: { retrieval_ms: number; llm_ms: number };
};

export type DiagnoseResponse = {
  input: StudentProfile;
  gaps: Gap[];
  courses_consulted: CursoRef[];
  timing: { retrieval_ms: number; llm_ms: number };
};

export type StudyPlanResponse = {
  tempo_disponivel: string;
  steps: StudyStep[];
  timing: { llm_ms: number };
};
