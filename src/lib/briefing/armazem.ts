/* ═══════════════════════════════════════════════════════════════════════════
   Armazém do briefing.

   Duas coisas guardadas separadamente, porque mudam em ritmos diferentes:

   - **o roteiro**, que é a lista de perguntas e quase nunca muda;
   - **os briefings**, um por lead, que mudam a cada reunião.

   Os dois no localStorage, como o perfil e o catálogo, e pelo mesmo motivo:
   ainda não tem backend. A diferença é que briefing é dado pessoal do cliente
   — quando o Supabase entrar, isto aqui vira a primeira coisa a sair da
   máquina dela.
   ═════════════════════════════════════════════════════════════════════════ */

import { REGRAS_PADRAO, type Regras } from "./regras";
import { ROTEIRO_PADRAO } from "./roteiro";
import {
  BRIEFING_VAZIO,
  PROGRESSO_ZERO,
  type Briefing,
  type Progresso,
  type Respostas,
  type Roteiro,
  type RoteiroAmbiente,
  type Secao,
} from "./tipos";

const CHAVE_ROTEIRO = "amanda-dash:roteiro";
const CHAVE_REGRAS = "amanda-dash:regras-briefing";
const CHAVE_BRIEFINGS = "amanda-dash:briefings";

/* ── roteiro ─────────────────────────────────────────────────────────────── */

function interpretarRoteiro(bruto: string | null): Roteiro {
  if (!bruto) return ROTEIRO_PADRAO;
  try {
    const r = JSON.parse(bruto) as Partial<Roteiro>;
    const geral = Array.isArray(r.geral) ? (r.geral as Secao[]) : ROTEIRO_PADRAO.geral;
    const ambientes = Array.isArray(r.ambientes)
      ? (r.ambientes as RoteiroAmbiente[])
      : ROTEIRO_PADRAO.ambientes;
    return { geral, ambientes };
  } catch {
    return ROTEIRO_PADRAO;
  }
}

const ouvintesRoteiro = new Set<() => void>();
let brutoRoteiro: string | null = null;
let roteiroEmCache: Roteiro = ROTEIRO_PADRAO;

/** Mesma referência enquanto nada mudar, senão o React entra em laço. */
export function lerRoteiro(): Roteiro {
  let bruto: string | null = null;
  try {
    bruto = localStorage.getItem(CHAVE_ROTEIRO);
  } catch {
    return roteiroEmCache;
  }
  if (bruto !== brutoRoteiro) {
    brutoRoteiro = bruto;
    roteiroEmCache = interpretarRoteiro(bruto);
  }
  return roteiroEmCache;
}

export function lerRoteiroNoServidor(): Roteiro {
  return ROTEIRO_PADRAO;
}

export function assinarRoteiro(aoMudar: () => void): () => void {
  ouvintesRoteiro.add(aoMudar);
  window.addEventListener("storage", aoMudar);
  return () => {
    ouvintesRoteiro.delete(aoMudar);
    window.removeEventListener("storage", aoMudar);
  };
}

export function guardarRoteiro(r: Roteiro): void {
  try {
    localStorage.setItem(CHAVE_ROTEIRO, JSON.stringify(r));
  } catch {
    brutoRoteiro = null;
    roteiroEmCache = r;
  }
  ouvintesRoteiro.forEach((fn) => fn());
}

export function restaurarRoteiro(): void {
  try {
    localStorage.removeItem(CHAVE_ROTEIRO);
  } catch {
    brutoRoteiro = null;
    roteiroEmCache = ROTEIRO_PADRAO;
  }
  ouvintesRoteiro.forEach((fn) => fn());
}

export function roteiroEditado(r: Roteiro): boolean {
  return r !== ROTEIRO_PADRAO;
}

/* ── regras da ponte ─────────────────────────────────────────────────────── */

function interpretarRegras(bruto: string | null): Regras {
  if (!bruto) return REGRAS_PADRAO;
  try {
    const r = JSON.parse(bruto) as Partial<Regras>;
    return {
      linhas: Array.isArray(r.linhas) ? r.linhas : REGRAS_PADRAO.linhas,
      observacoes: Array.isArray(r.observacoes) ? r.observacoes : REGRAS_PADRAO.observacoes,
    };
  } catch {
    return REGRAS_PADRAO;
  }
}

const ouvintesRegras = new Set<() => void>();
let brutoRegras: string | null = null;
let regrasEmCache: Regras = REGRAS_PADRAO;

export function lerRegras(): Regras {
  let bruto: string | null = null;
  try {
    bruto = localStorage.getItem(CHAVE_REGRAS);
  } catch {
    return regrasEmCache;
  }
  if (bruto !== brutoRegras) {
    brutoRegras = bruto;
    regrasEmCache = interpretarRegras(bruto);
  }
  return regrasEmCache;
}

export function lerRegrasNoServidor(): Regras {
  return REGRAS_PADRAO;
}

export function assinarRegras(aoMudar: () => void): () => void {
  ouvintesRegras.add(aoMudar);
  window.addEventListener("storage", aoMudar);
  return () => {
    ouvintesRegras.delete(aoMudar);
    window.removeEventListener("storage", aoMudar);
  };
}

export function guardarRegras(r: Regras): void {
  try {
    localStorage.setItem(CHAVE_REGRAS, JSON.stringify(r));
  } catch {
    brutoRegras = null;
    regrasEmCache = r;
  }
  ouvintesRegras.forEach((fn) => fn());
}

export function restaurarRegras(): void {
  try {
    localStorage.removeItem(CHAVE_REGRAS);
  } catch {
    brutoRegras = null;
    regrasEmCache = REGRAS_PADRAO;
  }
  ouvintesRegras.forEach((fn) => fn());
}

export function regrasEditadas(r: Regras): boolean {
  return r !== REGRAS_PADRAO;
}

/* ── briefings ───────────────────────────────────────────────────────────── */

/** Todos os briefings, indexados pelo id do lead. */
export type Briefings = Record<string, Briefing>;

const SEM_BRIEFINGS: Briefings = {};

function interpretarBriefings(bruto: string | null): Briefings {
  if (!bruto) return SEM_BRIEFINGS;
  try {
    const b = JSON.parse(bruto) as Briefings;
    return b && typeof b === "object" ? b : SEM_BRIEFINGS;
  } catch {
    return SEM_BRIEFINGS;
  }
}

const ouvintesBriefings = new Set<() => void>();
let brutoBriefings: string | null = null;
let briefingsEmCache: Briefings = SEM_BRIEFINGS;

export function lerBriefings(): Briefings {
  let bruto: string | null = null;
  try {
    bruto = localStorage.getItem(CHAVE_BRIEFINGS);
  } catch {
    return briefingsEmCache;
  }
  if (bruto !== brutoBriefings) {
    brutoBriefings = bruto;
    briefingsEmCache = interpretarBriefings(bruto);
  }
  return briefingsEmCache;
}

export function lerBriefingsNoServidor(): Briefings {
  return SEM_BRIEFINGS;
}

export function assinarBriefings(aoMudar: () => void): () => void {
  ouvintesBriefings.add(aoMudar);
  window.addEventListener("storage", aoMudar);
  return () => {
    ouvintesBriefings.delete(aoMudar);
    window.removeEventListener("storage", aoMudar);
  };
}

/**
 * Salva o briefing de um lead.
 *
 * Chamado a cada toque — reunião não tem botão "salvar", e perder resposta com
 * o cliente na frente é o jeito mais rápido de a ferramenta ser abandonada.
 */
export function guardarBriefing(leadId: string, b: Briefing): void {
  atualizarBriefing(leadId, () => b);
}

/**
 * Altera o briefing a partir do que está gravado agora, não de um instantâneo.
 *
 * Isso importa: numa reunião ela toca rápido, e dois toques dentro do mesmo
 * quadro de render leem a mesma cópia antiga do briefing — o segundo apagaria
 * o primeiro. Recebendo a função em vez do valor pronto, cada alteração parte
 * do estado atual e nenhuma resposta se perde.
 */
export function atualizarBriefing(leadId: string, fn: (b: Briefing) => Briefing): void {
  const atuais = lerBriefings();
  const base = atuais[leadId] ?? BRIEFING_VAZIO;
  const todos = {
    ...atuais,
    [leadId]: { ...fn(base), atualizadoEm: new Date().toISOString() },
  };
  try {
    localStorage.setItem(CHAVE_BRIEFINGS, JSON.stringify(todos));
  } catch {
    brutoBriefings = null;
    briefingsEmCache = todos;
  }
  ouvintesBriefings.forEach((fn) => fn());
}

export function apagarBriefing(leadId: string): void {
  const todos = { ...lerBriefings() };
  delete todos[leadId];
  try {
    localStorage.setItem(CHAVE_BRIEFINGS, JSON.stringify(todos));
  } catch {
    brutoBriefings = null;
    briefingsEmCache = todos;
  }
  ouvintesBriefings.forEach((fn) => fn());
}

/* ── progresso ───────────────────────────────────────────────────────────── */

const soma = (ps: Progresso[]): Progresso => {
  const resolvidas = ps.reduce((s, p) => s + p.resolvidas, 0);
  const total = ps.reduce((s, p) => s + p.total, 0);
  return {
    resolvidas,
    total,
    essenciaisAbertas: ps.reduce((s, p) => s + p.essenciaisAbertas, 0),
    pct: total ? Math.round((resolvidas / total) * 100) : 0,
  };
};

/**
 * Progresso de um conjunto de seções.
 *
 * "Não se aplica" conta como resolvida. Sem isso, uma casa sem área gourmet
 * ficaria para sempre com o briefing incompleto e o contador viraria ruído.
 */
export function progressoDeSecoes(secoes: Secao[], respostas: Respostas): Progresso {
  let resolvidas = 0;
  let total = 0;
  let essenciaisAbertas = 0;
  for (const s of secoes) {
    for (const p of s.perguntas) {
      total++;
      const r = respostas[p.id];
      if (r) resolvidas++;
      else if (p.essencial) essenciaisAbertas++;
    }
  }
  return { resolvidas, total, essenciaisAbertas, pct: total ? Math.round((resolvidas / total) * 100) : 0 };
}

/** Progresso do briefing inteiro: geral mais todos os ambientes adicionados. */
export function progressoDoBriefing(b: Briefing | undefined, r: Roteiro): Progresso {
  if (!b) return PROGRESSO_ZERO;
  const porAmbiente = b.ambientes.map((amb) => {
    const rot = r.ambientes.find((x) => x.id === amb.tipo);
    return rot ? progressoDeSecoes(rot.secoes, amb.respostas) : PROGRESSO_ZERO;
  });
  return soma([progressoDeSecoes(r.geral, b.geral), ...porAmbiente]);
}

/* ── partida ─────────────────────────────────────────────────────────────── */

const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * Briefing em branco, com os ambientes que já dá para adivinhar.
 *
 * O lead guarda os cômodos como texto solto — "Cozinha + closet", "Apto 3
 * dorms completo". Aqui a gente casa o que for reconhecível com os roteiros e
 * deixa o resto para ela adicionar na hora. Adivinhar errado custa um toque
 * para remover; não adivinhar custa a reunião inteira.
 */
export function briefingInicial(textoAmbientes: string, r: Roteiro): Briefing {
  const texto = semAcento(textoAmbientes);
  const achados = r.ambientes.filter((a) => texto.includes(semAcento(a.nome)));
  return {
    ...BRIEFING_VAZIO,
    ambientes: achados.map((a) => ({
      // Mesmo esquema de id do modo reunião: "cozinha-1", "closet-1"…
      id: a.id + "-1",
      tipo: a.id,
      apelido: a.nome,
      respostas: {},
      nota: "",
    })),
  };
}
