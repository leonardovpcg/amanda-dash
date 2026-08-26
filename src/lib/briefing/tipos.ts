/* ═══════════════════════════════════════════════════════════════════════════
   Briefing comercial — tipos.

   É a conversa da primeira reunião: o cliente fala, ela registra. O
   levantamento técnico (pé-direito, ponto de gás, piso nivelado) é outro
   momento, com outro respondente, e vira um roteiro separado depois.

   Duas ideias sustentam o resto do módulo:

   1. O roteiro é **dado**, não código. Ela vai querer acrescentar pergunta
      depois da primeira semana usando, e não vai abrir o editor para isso.
   2. "Não se aplica" é diferente de "não perguntei". Sem essa distinção o
      contador de pendências mente — casa sem área gourmet ficaria eternamente
      com briefing incompleto. É o mesmo raciocínio dos alertas do orçamento.
   ═════════════════════════════════════════════════════════════════════════ */

export type TipoResposta =
  /** Campo livre — o que a lista não previu. */
  | "texto"
  /** Um número com unidade (gavetas, metros, pessoas). */
  | "numero"
  /** Uma opção entre várias. */
  | "escolha"
  /** Várias opções ao mesmo tempo — o formato mais rápido numa reunião. */
  | "multipla"
  | "simNao";

export type Pergunta = {
  id: string;
  /** Como ela pergunta em voz alta, não o rótulo de um campo. */
  texto: string;
  /** Por que a pergunta existe. Aparece pequeno, para ela não perguntar no vácuo. */
  ajuda?: string;
  tipo: TipoResposta;
  /** Para "escolha" e "multipla". */
  opcoes?: string[];
  /** Para "numero". */
  unidade?: string;
  /** Sem isso respondido não dá para orçar — sinaliza no funil, não bloqueia. */
  essencial?: boolean;
};

export type Secao = {
  id: string;
  titulo: string;
  perguntas: Pergunta[];
};

/** Roteiro de um tipo de ambiente (cozinha, closet, banheiro…). */
export type RoteiroAmbiente = {
  id: string;
  nome: string;
  secoes: Secao[];
};

export type Roteiro = {
  /** Perguntas feitas uma vez por cliente, independentes de ambiente. */
  geral: Secao[];
  ambientes: RoteiroAmbiente[];
};

/* ── respostas ───────────────────────────────────────────────────────────── */

export type ValorResposta = string | string[] | number | boolean;

/**
 * Estado de uma pergunta.
 *
 * A chave **ausente** do dicionário significa "ainda não perguntei". Só existe
 * registro quando ela respondeu ou marcou que não se aplica.
 */
export type Resposta =
  | { estado: "respondida"; valor: ValorResposta }
  | { estado: "naoSeAplica" };

export type Respostas = Record<string, Resposta>;

export type BriefingAmbiente = {
  id: string;
  /** Id do `RoteiroAmbiente` que dita as perguntas. */
  tipo: string;
  /** Nome que o cliente usa — "Suíte da filha", não "Dormitório". */
  apelido: string;
  respostas: Respostas;
  /** O que a lista não previu. Sempre presente, sempre opcional. */
  nota: string;
};

export type Briefing = {
  geral: Respostas;
  notaGeral: string;
  ambientes: BriefingAmbiente[];
  /** ISO da última alteração, ou `null` enquanto ninguém abriu. */
  atualizadoEm: string | null;
};

export const BRIEFING_VAZIO: Briefing = {
  geral: {},
  notaGeral: "",
  ambientes: [],
  atualizadoEm: null,
};

/* ── progresso ───────────────────────────────────────────────────────────── */

export type Progresso = {
  /** Respondidas ou marcadas como não aplicáveis. */
  resolvidas: number;
  total: number;
  /** Essenciais ainda em aberto — o que segura o orçamento. */
  essenciaisAbertas: number;
  pct: number;
};

export const PROGRESSO_ZERO: Progresso = {
  resolvidas: 0,
  total: 0,
  essenciaisAbertas: 0,
  pct: 0,
};
