"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Catálogo editável.

   A "Tabela de Valores" deixou de ser constante: preços e markups moram no
   Supabase, em `configuracoes`, e podem ser mexidos pela tela. Enquanto
   ninguém mexeu, vale `CATALOGO_PADRAO` — os valores portados da planilha.

   Antes isto era localStorage. A troca foi só de onde vem o texto: a leitura
   continua síncrona e a interpretação continua a mesma, porque quem consome
   não deveria saber a diferença.
   ═════════════════════════════════════════════════════════════════════════ */

import { criarArmazemDeDocumento } from "@/lib/supabase/documento";
import { ACESSORIOS, CORES, FITA_POR_METRO, MAO_DE_OBRA, MARKUPS } from "./tabela";
import type { Acessorio, CorChapa, Markups, ServicoMaoDeObra } from "./tipos";

export type Catalogo = {
  cores: CorChapa[];
  acessorios: Acessorio[];
  maoDeObra: ServicoMaoDeObra[];
  /** Custo da fita de borda por metro, igual para todas as cores. */
  fitaPorMetro: number;
  markups: Markups;
};

export const CATALOGO_PADRAO: Catalogo = {
  cores: CORES,
  acessorios: ACESSORIOS,
  maoDeObra: MAO_DE_OBRA,
  fitaPorMetro: FITA_POR_METRO,
  markups: MARKUPS,
};

/**
 * Lê o que veio do banco sem confiar nele.
 *
 * Cada lista só entra se for um array não vazio; qualquer campo faltando cai
 * no padrão. Assim um catálogo gravado por uma versão antiga do app continua
 * abrindo depois de a gente acrescentar campo novo.
 */
function interpretar(bruto: unknown): Catalogo {
  if (!bruto || typeof bruto !== "object") return CATALOGO_PADRAO;
  const c = bruto as Partial<Catalogo>;
  const lista = <T>(v: unknown, padrao: T[]): T[] =>
    Array.isArray(v) && v.length ? (v as T[]) : padrao;
  const numero = (v: unknown, padrao: number) =>
    typeof v === "number" && Number.isFinite(v) && v > 0 ? v : padrao;
  return {
    cores: lista<CorChapa>(c.cores, CORES),
    acessorios: lista<Acessorio>(c.acessorios, ACESSORIOS),
    maoDeObra: lista<ServicoMaoDeObra>(c.maoDeObra, MAO_DE_OBRA),
    fitaPorMetro: numero(c.fitaPorMetro, FITA_POR_METRO),
    markups: {
      chapas: numero(c.markups?.chapas, MARKUPS.chapas),
      fita: numero(c.markups?.fita, MARKUPS.fita),
      acessorios: numero(c.markups?.acessorios, MARKUPS.acessorios),
      art: numero(c.markups?.art, MARKUPS.art),
    },
  };
}

const armazem = criarArmazemDeDocumento<Catalogo>("catalogo", CATALOGO_PADRAO, interpretar);

export const lerCatalogo = armazem.ler;
export const lerCatalogoNoServidor = armazem.lerNoServidor;
export const assinarCatalogo = armazem.assinar;
export const guardarCatalogo = armazem.guardar;
export const restaurarCatalogo = armazem.restaurar;
export const catalogoEditado = armazem.foiEditado;

/** Carregando / erro de gravação, para a tela de Ajustes dar sinal. */
export const lerStatusCatalogo = armazem.lerStatus;
export const lerStatusCatalogoNoServidor = armazem.lerStatusNoServidor;
export const assinarStatusCatalogo = armazem.assinarStatus;
