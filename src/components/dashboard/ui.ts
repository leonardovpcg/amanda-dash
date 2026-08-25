import type { CSSProperties } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   Paleta Terracota — tirada da marca da loja (o símbolo do pinwheel usa dois
   tons: o queimado escuro e o alaranjado claro). Substituiu o petróleo
   (#1F5560) que veio do design original.

   Os componentes ainda escrevem hex inline, fiel ao design portado; estas
   constantes existem para o código novo não ter que garimpar o valor certo.
   ═════════════════════════════════════════════════════════════════════════ */
export const cores = {
  /** Tom escuro da logo — fundos cheios e gradientes profundos. */
  terraEscura: "#8E3A12",
  /** Acento principal do dashboard: barras, marcadores, foco, links. */
  terra: "#A84B1C",
  /** Tom claro da logo — hover, segunda faixa de gráfico. */
  terraClara: "#C0663C",
  /** Terracota sobre fundo escuro (rótulos no cartão de comissão). */
  terraSobreEscuro: "#D6A488",
  /** Tinta de fundo e borda das pílulas de status. */
  terraTinta: "#F8EDE5",
  terraBorda: "#EEDCCE",

  /** Vermelho tijolo — atenção/atraso. Fica separado do acento de marca. */
  alerta: "#9C2B22",
  alertaTinta: "#FAEAE7",
  alertaBorda: "#F1D6D1",

  /** Verde oliva — único tom frio que sobrou. Faz dois papéis: os controles
      cheios (aba ativa, "Novo atendimento", meta do mês, botões de salvar),
      que antes eram pretos, e o status "fechado/concluído" em tinta clara. */
  oliva: "#6B7040",

  /** Tinta do texto e cinzas quentes herdados do design. */
  tinta: "#23231F",
  cinza: "#6E6A5F",
  cinzaClaro: "#9A9689",
} as const;


/** Face mono do design (rótulos, datas, valores de referência). */
export const MONO = "var(--font-plex-mono), 'IBM Plex Mono', monospace";

/** Números do dashboard são sempre tabulares. */
export const NUM: CSSProperties = { fontVariantNumeric: "tabular-nums" };

/** O "painel de vidro" repetido em todas as abas. */
export const panel: CSSProperties = {
  background: "rgba(255,255,255,.68)",
  border: "1px solid rgba(255,255,255,.9)",
  borderRadius: 26,
  backdropFilter: "blur(10px)",
  boxShadow: "0 4px 24px rgba(52,56,50,.06)",
};

/** Rótulo em IBM Plex Mono. `ls`/`upper` variam por contexto no design. */
export const mono = (
  size: number,
  color: string,
  opts?: { ls?: string; upper?: boolean },
): CSSProperties => ({
  fontFamily: MONO,
  fontSize: size,
  color,
  ...(opts?.ls ? { letterSpacing: opts.ls } : null),
  ...(opts?.upper ? { textTransform: "uppercase" as const } : null),
});

/** Rótulo de coluna de tabela: mono 10px, caixa alta, cinza. */
export const colLabel = (align?: "right"): CSSProperties => ({
  ...mono(10, "#9A9689", { ls: "0.07em", upper: true }),
  ...(align ? { textAlign: align } : null),
});

/** Título de seção dentro de um painel. */
export const cardTitle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 600,
  letterSpacing: "-0.01em",
};

/** Título de aba (h2 fora dos painéis). */
export const sectionTitle: CSSProperties = {
  fontSize: "19px",
  fontWeight: 600,
  letterSpacing: "-0.02em",
  margin: 0,
};

/** Aba do topo — equivalente ao `tabStyle(active)` do design. */
export const tabStyle = (active: boolean): CSSProperties => ({
  border: "none",
  borderRadius: 999,
  padding: "11px 20px",
  fontSize: "13px",
  fontWeight: 600,
  letterSpacing: "-0.01em",
  transition: "background .15s ease, color .15s ease",
  background: active ? "#6B7040" : "transparent",
  color: active ? "#F4F3EE" : "#6E6A5F",
});

/** Pílula selecionável (origem do contato, ambientes) — `pillStyle(active)`. */
export const pillStyle = (active: boolean): CSSProperties => ({
  borderRadius: 999,
  padding: "9px 15px",
  fontSize: "12.5px",
  fontWeight: 600,
  letterSpacing: "-0.005em",
  transition: "all .15s ease",
  background: active ? "#A84B1C" : "rgba(255,255,255,.75)",
  color: active ? "#FBF2EC" : "#4A473F",
  border: "1px solid " + (active ? "#A84B1C" : "#E2DED4"),
});
