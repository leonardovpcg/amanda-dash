/* ═══════════════════════════════════════════════════════════════════════════
   Tabela de Valores — o catálogo de custos.

   Portada da aba "Tabela de Valores" da planilha. É a única fonte de custo do
   orçamento: nenhum preço deve aparecer solto em fórmula, como acontecia com
   os R$ 2,00/m da fita de borda (que viviam dentro da fórmula de 19 abas) e
   com os R$ 80 da usinagem.
   ═════════════════════════════════════════════════════════════════════════ */

import type { Acessorio, CorChapa, Markups, ServicoMaoDeObra } from "./tipos";

/**
 * Multiplicadores de venda.
 *
 * Chapas 3,6× e fita 3× eram uniformes na planilha. Acessórios oscilavam entre
 * 2× e 3× — a aba-modelo usava 3× e dois banheiros ficaram assim por herança.
 * Padronizado em 2×, que era a prática na maioria dos ambientes.
 */
export const MARKUPS: Markups = {
  chapas: 3.6,
  fita: 3,
  acessorios: 2,
  art: 1.1,
};

/** Custo da fita de borda por metro. Era constante dentro da fórmula. */
export const FITA_POR_METRO = 2;

export const CORES: CorChapa[] = [
  { id: "branco-tx", nome: "Branco TX", fabricante: "Greenplac", precos: { 6: 193.9, 15: 235.5, 18: 304.9 } },
  { id: "granile", nome: "Granile", fabricante: "Greenplac", precos: { 6: 245.9, 15: 363.9, 18: 421.9 } },
  { id: "carmel", nome: "Carmel", fabricante: "Greenplac", precos: { 6: 262.9, 15: 411.9, 18: 475.9 } },
  { id: "jade", nome: "Jade", fabricante: "Greenplac", precos: { 6: 274.9, 15: 430.9, 18: 497.9 } },
  { id: "itapua", nome: "Itapuã", fabricante: "Duratex", precos: { 6: 390.9, 15: 559.9, 18: 590.53 } },
  { id: "luanda", nome: "Luanda", fabricante: "Greenplac", precos: { 6: 274.9, 15: 430.9, 18: 497.9 } },
  { id: "jequitiba-silvestre", nome: "Jequitibá Silvestre", fabricante: "Greenplac", precos: { 6: 274.9, 15: 430.9, 18: 497.9 } },
  { id: "greige", nome: "Greige", fabricante: "Greenplac", precos: { 6: 254.9, 15: 376.9, 18: 435.9 } },
  { id: "frevo", nome: "Frevo", fabricante: "Arauco", precos: { 6: 348.9, 15: 487.9, 18: 585.9 } },
  // Argila nunca foi cotada em 6 mm — escolher essa combinação gera alerta.
  { id: "argila", nome: "Argila", fabricante: "Duratex", precos: { 15: 450, 18: 500 } },
  { id: "beton-matt", nome: "Beton Matt", fabricante: "Arauco", precos: { 6: 349.9, 15: 479.9, 18: 579.9 } },
  { id: "fresno-acores", nome: "Fresno Açores", fabricante: "Guararapes", precos: { 6: 405.9, 15: 528.47, 18: 601.51 } },
  { id: "azul-petroleo-matt", nome: "Azul Petróleo Matt", fabricante: "Guararapes", precos: { 6: 396.86, 15: 559.5, 18: 651.52 } },
  { id: "areia", nome: "Areia", fabricante: "Guararapes", precos: { 6: 389.9, 15: 549.9, 18: 639.9 } },
  { id: "cronos", nome: "Cronos", fabricante: "Eucatex", precos: { 6: 302.9, 15: 367.9, 18: 452.9 } },
  { id: "off-white-suave", nome: "Off White Suave", fabricante: "Duratex", precos: { 6: 280.9, 15: 394.9, 18: 473.9 } },
];

export const ACESSORIOS: Acessorio[] = [
  { id: "trilho-sup-inf-3m", nome: "Trilho superior e inferior 3 m", unidade: "jogo", custo: 300 },
  { id: "kit-porta-correr-agility", nome: "Kit porta de correr Agility", unidade: "kit", custo: 292.77 },
  { id: "kit-porta-correr-dominos", nome: "Kit porta de correr Dominos", unidade: "kit", custo: 450 },
  { id: "corredica-telescopica", nome: "Corrediça telescópica", unidade: "par", custo: 265 },
  { id: "corredica-invisivel-blum", nome: "Corrediça invisível Blum", unidade: "par", custo: 265 },
  { id: "dobradica-blum", nome: "Dobradiça Blum", unidade: "un", custo: 50 },
  { id: "pistao", nome: "Pistão", unidade: "un", custo: 400 },
  { id: "cabideiro", nome: "Cabideiro", unidade: "un", custo: 90 },
  { id: "cabideiro-curvo", nome: "Cabideiro curvo", unidade: "un", custo: 180 },
  { id: "fita-led", nome: "Fita de LED", unidade: "m", custo: 120 },
  { id: "perfil-puxador-rm183", nome: "Perfil puxador alumínio RM-183 (3 m)", unidade: "barra", custo: 105 },
  { id: "puxador-citizen-preto", nome: "Puxador Citizen G 45º preto Zen", unidade: "un", custo: 101.26 },
  { id: "puxador-citizen-gold", nome: "Puxador Citizen G 45º gold escovado", unidade: "un", custo: 145.04 },
  { id: "puxador-cardiff-preto", nome: "Puxador Cardiff 30 mm preto Zen", unidade: "un", custo: 90 },
  { id: "puxador-udine-preto", nome: "Puxador Udine 85 mm preto Zen", unidade: "un", custo: 230.92 },
];

/**
 * Catálogo de mão de obra.
 *
 * Custo e markup foram extraídos das fórmulas da planilha: `=80*G18*3` virou
 * custo 80 com markup 3, `=520,05*G20*2` virou custo 520,05 com markup 2.
 * Onde só existia o preço final digitado (as portas mimetizadas, a R$ 4.500),
 * o custo real nunca foi anotado — ficam com `custoDesconhecido`.
 */
export const MAO_DE_OBRA: ServicoMaoDeObra[] = [
  { id: "usinagem-cava", nome: "Usinagem cava", unidade: "un", custo: 80, markup: 3 },
  { id: "usinagem-forro-muxarabi", nome: "Usinagem forro muxarabi", unidade: "un", custo: 525, markup: 3 },
  { id: "porta-vidro-slim", nome: "Porta de vidro perfil slim (400 × 1980)", unidade: "un", custo: 520.05, markup: 2 },
  { id: "espelho-550x830", nome: "Espelho (550 × 830)", unidade: "un", custo: 174.8, markup: 2 },
  // As duas fórmulas de espelho abaixo lançavam o valor do lote inteiro sem
  // multiplicar pela quantidade (`=594,7*2` com 3 peças, `=877,8*2` com 6).
  // Não era erro de conta: o custo digitado era do lote. Convertidos para
  // unitário — o m² bate com o do espelho 550 × 830 (~R$ 382/m²).
  { id: "espelho-500x860", nome: "Espelho (500 × 860)", unidade: "un", custo: 198.23, markup: 2 },
  { id: "espelho-400x960", nome: "Espelho (400 × 960)", unidade: "un", custo: 146.3, markup: 2 },
  // Estes dois foram lançados na planilha com quantidade e nenhum valor: a
  // linha existia e somava zero. Custo pendente de cotação.
  { id: "espelho-2550x650", nome: "Espelho (2550 × 650)", unidade: "un", custo: 0, markup: 2, custoDesconhecido: true },
  { id: "porta-espelho-834x2432", nome: "Porta em espelho (834 × 2432)", unidade: "un", custo: 0, markup: 2, custoDesconhecido: true },
  { id: "porta-pivotante-mimetizada", nome: "Porta pivotante mimetizada", unidade: "un", custo: 4500, markup: 1, custoDesconhecido: true },
  { id: "porta-giro-mimetizada", nome: "Porta de giro mimetizada", unidade: "un", custo: 4500, markup: 1, custoDesconhecido: true },
];

/* ── índices ─────────────────────────────────────────────────────────────── */

export const CORES_POR_ID = new Map(CORES.map((c) => [c.id, c]));
export const ACESSORIOS_POR_ID = new Map(ACESSORIOS.map((a) => [a.id, a]));
export const MAO_DE_OBRA_POR_ID = new Map(MAO_DE_OBRA.map((s) => [s.id, s]));

/** Nome completo da cor como ela aparece nos selects e na proposta. */
export const nomeCor = (c: CorChapa) => `${c.nome} (${c.fabricante})`;
