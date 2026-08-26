/* ═══════════════════════════════════════════════════════════════════════════
   Catálogo editável.

   A "Tabela de Valores" deixou de ser constante: preços e markups agora moram
   no localStorage e podem ser mexidos pela tela. Enquanto ninguém mexeu, vale
   `CATALOGO_PADRAO` — os valores portados da planilha.

   Mesma solução do perfil, e pelo mesmo motivo: sem Supabase ainda, isto é um
   paliativo deliberado. Quando o backend entrar, este módulo vira uma camada
   fina sobre ele e a assinatura de quem consome não muda.
   ═════════════════════════════════════════════════════════════════════════ */

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

const CHAVE = "amanda-dash:catalogo";

/**
 * Lê o que está guardado sem confiar nele.
 *
 * Cada lista só entra se for um array não vazio; qualquer campo faltando cai
 * no padrão. Assim um catálogo salvo por uma versão antiga do app continua
 * abrindo depois de a gente acrescentar campo novo.
 */
function interpretar(bruto: string | null): Catalogo {
  if (!bruto) return CATALOGO_PADRAO;
  try {
    const c = JSON.parse(bruto) as Partial<Catalogo>;
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
  } catch {
    return CATALOGO_PADRAO;
  }
}

// ── fonte externa para useSyncExternalStore ────────────────────────────────

const ouvintes = new Set<() => void>();
let brutoEmCache: string | null = null;
let catalogoEmCache: Catalogo = CATALOGO_PADRAO;

/** Precisa devolver a MESMA referência enquanto nada mudar — o cálculo indexa
 *  o catálogo por identidade, e o React entra em laço se a referência trocar
 *  a cada render. Daí o cache pelo texto cru. */
export function lerCatalogo(): Catalogo {
  let bruto: string | null = null;
  try {
    bruto = localStorage.getItem(CHAVE);
  } catch {
    return catalogoEmCache;
  }
  if (bruto !== brutoEmCache) {
    brutoEmCache = bruto;
    catalogoEmCache = interpretar(bruto);
  }
  return catalogoEmCache;
}

/** No servidor não há navegador: sempre o padrão. */
export function lerCatalogoNoServidor(): Catalogo {
  return CATALOGO_PADRAO;
}

export function assinarCatalogo(aoMudar: () => void): () => void {
  ouvintes.add(aoMudar);
  window.addEventListener("storage", aoMudar);
  return () => {
    ouvintes.delete(aoMudar);
    window.removeEventListener("storage", aoMudar);
  };
}

export function guardarCatalogo(c: Catalogo): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(c));
  } catch {
    // localStorage cheio ou bloqueado — a tabela vale só nesta sessão
    brutoEmCache = null;
    catalogoEmCache = c;
  }
  ouvintes.forEach((fn) => fn());
}

/** Volta aos valores da planilha, descartando o que foi editado. */
export function restaurarCatalogo(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    brutoEmCache = null;
    catalogoEmCache = CATALOGO_PADRAO;
  }
  ouvintes.forEach((fn) => fn());
}

/** `true` quando a tabela em uso já foi editada. */
export function catalogoEditado(c: Catalogo): boolean {
  return c !== CATALOGO_PADRAO;
}
