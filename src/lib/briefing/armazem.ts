"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Armazém do briefing.

   Três coisas guardadas separadamente, porque mudam em ritmos diferentes:

   - **o roteiro** e **as regras da ponte**, documentos de configuração que
     quase nunca mudam, em `configuracoes`;
   - **os briefings**, um por lead, que mudam a cada reunião e vivem em três
     tabelas normalizadas.

   Este arquivo virou o índice do módulo: as implementações estão no armazém
   de documento e em `remoto.ts`, e aqui ficam só as contas de progresso, que
   não dependem de onde o dado mora.
   ═════════════════════════════════════════════════════════════════════════ */

import { criarArmazemDeDocumento } from "@/lib/supabase/documento";
import { novoIdDeAmbiente } from "./remoto";
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

/* ── roteiro e regras ──────────────────────────────────────────────────────
   Os dois são documentos de configuração e moram no Supabase, em
   `configuracoes`. A tela edita o objeto inteiro e o motor carrega o objeto
   inteiro — ninguém consulta uma pergunta solta —, então normalizar aqui
   seria trabalho sem resposta nova.
   ───────────────────────────────────────────────────────────────────────── */

function interpretarRoteiro(bruto: unknown): Roteiro {
  if (!bruto || typeof bruto !== "object") return ROTEIRO_PADRAO;
  const r = bruto as Partial<Roteiro>;
  return {
    geral: Array.isArray(r.geral) ? (r.geral as Secao[]) : ROTEIRO_PADRAO.geral,
    ambientes: Array.isArray(r.ambientes)
      ? (r.ambientes as RoteiroAmbiente[])
      : ROTEIRO_PADRAO.ambientes,
  };
}

const armazemRoteiro = criarArmazemDeDocumento<Roteiro>(
  "roteiro",
  ROTEIRO_PADRAO,
  interpretarRoteiro,
);

export const lerRoteiro = armazemRoteiro.ler;
export const lerRoteiroNoServidor = armazemRoteiro.lerNoServidor;
export const assinarRoteiro = armazemRoteiro.assinar;
export const guardarRoteiro = armazemRoteiro.guardar;
export const restaurarRoteiro = armazemRoteiro.restaurar;
export const roteiroEditado = armazemRoteiro.foiEditado;
export const lerStatusRoteiro = armazemRoteiro.lerStatus;
export const lerStatusRoteiroNoServidor = armazemRoteiro.lerStatusNoServidor;
export const assinarStatusRoteiro = armazemRoteiro.assinarStatus;

function interpretarRegras(bruto: unknown): Regras {
  if (!bruto || typeof bruto !== "object") return REGRAS_PADRAO;
  const r = bruto as Partial<Regras>;
  return {
    linhas: Array.isArray(r.linhas) ? r.linhas : REGRAS_PADRAO.linhas,
    observacoes: Array.isArray(r.observacoes) ? r.observacoes : REGRAS_PADRAO.observacoes,
  };
}

const armazemRegras = criarArmazemDeDocumento<Regras>("regras", REGRAS_PADRAO, interpretarRegras);

export const lerRegras = armazemRegras.ler;
export const lerRegrasNoServidor = armazemRegras.lerNoServidor;
export const assinarRegras = armazemRegras.assinar;
export const guardarRegras = armazemRegras.guardar;
export const restaurarRegras = armazemRegras.restaurar;
export const regrasEditadas = armazemRegras.foiEditado;
export const lerStatusRegras = armazemRegras.lerStatus;
export const lerStatusRegrasNoServidor = armazemRegras.lerStatusNoServidor;
export const assinarStatusRegras = armazemRegras.assinarStatus;


/* ── briefings ─────────────────────────────────────────────────────────────
   Saíram do localStorage para as três tabelas do banco. O reexport mantém o
   caminho de importação de quem já usava — nenhum componente precisou saber
   que a origem mudou.
   ───────────────────────────────────────────────────────────────────────── */

export {
  apagarBriefing,
  assinarBriefings,
  atualizarBriefing,
  guardarBriefing,
  lerBriefings,
  lerBriefingsNoServidor,
  lerStatusBriefings,
  lerStatusBriefingsNoServidor,
  novoIdDeAmbiente,
  sincronizarAgora,
  type Briefings,
} from "./remoto";

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
      // Uuid, como qualquer ambiente criado na reunião: quem manda no id
      // agora é o banco, e gerar aqui permite inserir sem esperar resposta.
      id: novoIdDeAmbiente(),
      tipo: a.id,
      apelido: a.nome,
      respostas: {},
      nota: "",
    })),
  };
}
