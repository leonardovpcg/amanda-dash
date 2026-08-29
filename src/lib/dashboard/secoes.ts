"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Quais blocos do projeto ficam recolhidos.

   A tela do projeto tem oito blocos empilhados, e preencher um projeto
   inteiro virou uma rolagem longa demais. Recolher é a saída — mas a escolha
   precisa sobreviver a fechar e reabrir o projeto, senão ela recolhe tudo de
   novo a cada visita.

   Fica no `localStorage`, e é o caso em que ele é a ferramenta certa: é
   preferência de tela deste aparelho, não dado do negócio. Não vai para o
   banco de propósito — a Amanda no computador da loja e no celular quer
   layouts diferentes, e sincronizar isso seria atrapalhar.
   ═════════════════════════════════════════════════════════════════════════ */

export type SecaoDoProjeto =
  | "ambientes"
  | "briefing"
  | "orcamento"
  | "contrato"
  | "linhaDoTempo"
  | "composicao"
  | "consulta"
  | "materiais";

/**
 * As que já nascem recolhidas.
 *
 * As três de baixo são leitura, não preenchimento: composição, consulta de
 * preço e a lista de materiais são conferência depois que o orçamento está
 * lançado. Recolhidas por padrão, elas tiram da frente a parte da rolagem que
 * ela menos usa enquanto digita.
 */
const PADRAO: SecaoDoProjeto[] = ["composicao", "consulta", "materiais", "linhaDoTempo"];

const CHAVE = "amanda-dash:secoes-recolhidas";

const ouvintes = new Set<() => void>();
let brutoEmCache: string | null = null;
let listaEmCache: SecaoDoProjeto[] = PADRAO;

function interpretar(bruto: string | null): SecaoDoProjeto[] {
  if (bruto === null) return PADRAO;
  try {
    const v = JSON.parse(bruto);
    return Array.isArray(v) ? (v as SecaoDoProjeto[]) : PADRAO;
  } catch {
    return PADRAO;
  }
}

/**
 * Precisa devolver a MESMA referência enquanto nada mudar, senão o React
 * entra em laço de renderização. Daí o cache pelo texto cru.
 */
export function lerRecolhidas(): SecaoDoProjeto[] {
  let bruto: string | null = null;
  try {
    bruto = localStorage.getItem(CHAVE);
  } catch {
    // Navegador com armazenamento bloqueado: vale o que estiver em memória.
    return listaEmCache;
  }
  if (bruto !== brutoEmCache) {
    brutoEmCache = bruto;
    listaEmCache = interpretar(bruto);
  }
  return listaEmCache;
}

/** No servidor não há navegador: vale o padrão. */
export const lerRecolhidasNoServidor = (): SecaoDoProjeto[] => PADRAO;

export function assinarRecolhidas(aoMudar: () => void): () => void {
  ouvintes.add(aoMudar);
  window.addEventListener("storage", aoMudar);
  return () => {
    ouvintes.delete(aoMudar);
    window.removeEventListener("storage", aoMudar);
  };
}

export function alternarSecao(secao: SecaoDoProjeto): void {
  const atual = lerRecolhidas();
  const nova = atual.includes(secao) ? atual.filter((s) => s !== secao) : [...atual, secao];
  try {
    localStorage.setItem(CHAVE, JSON.stringify(nova));
  } catch {
    // Sem armazenamento a escolha vale só nesta sessão.
    brutoEmCache = null;
    listaEmCache = nova;
  }
  ouvintes.forEach((fn) => fn());
}
