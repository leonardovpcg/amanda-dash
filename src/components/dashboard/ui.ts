import type { CSSProperties } from "react";

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
  background: active ? "#23231F" : "transparent",
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
  background: active ? "#1F5560" : "rgba(255,255,255,.75)",
  color: active ? "#F1F5F4" : "#4A473F",
  border: "1px solid " + (active ? "#1F5560" : "#E2DED4"),
});
