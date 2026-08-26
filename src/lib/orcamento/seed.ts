/* ═══════════════════════════════════════════════════════════════════════════
   Orçamento real, importado da planilha.

   São os 14 ambientes das abas visíveis de `Modelo_orçamentoquantitativo.xlsx`
   — inclusive o "hall intimo", que existia como aba mas nunca entrou no
   Resumo. Serve de dado de partida do módulo e de prova do motor: recalcular
   isto tem que bater com o que a planilha cobrou, exceto onde ela errava.

   As linhas sem quantidade e os serviços sem custo foram mantidos como estão.
   São eles que fazem o painel de alertas acender — apagá-los aqui esconderia
   justamente o que o módulo existe para mostrar.
   ═════════════════════════════════════════════════════════════════════════ */

import type { OrcamentoAmbiente } from "./tipos";

export const ORCAMENTO_SEED: OrcamentoAmbiente[] = [
  {
    id: "hall",
    nome: "Hall",
    chapas: [
      { corId: "jequitiba-silvestre", espessura: 15, qnt: 5 },
    ],
    fita: [
      { corId: "jequitiba-silvestre", metros: 80 },
    ],
    acessorios: [],
    maoDeObra: [
      { servicoId: "porta-pivotante-mimetizada", qnt: 1 },
    ],
  },
  {
    id: "lavabo",
    nome: "Lavabo",
    chapas: [
      { corId: "jequitiba-silvestre", espessura: 6, qnt: 1 },
      { corId: "jequitiba-silvestre", espessura: 15, qnt: 3 },
      { corId: "jequitiba-silvestre", espessura: 18, qnt: 1 },
      { corId: "off-white-suave", espessura: 18, qnt: 2 },
    ],
    fita: [
      { corId: "jequitiba-silvestre", metros: 180 },
      { corId: "branco-tx", metros: 20 },
    ],
    acessorios: [
      { acessorioId: "dobradica-blum", qnt: 4 },
    ],
    maoDeObra: [
      { servicoId: "usinagem-forro-muxarabi", qnt: 1 },
      { servicoId: "porta-giro-mimetizada", qnt: 1 },
    ],
  },
  {
    id: "sala-de-estar",
    nome: "Sala de estar",
    chapas: [
      { corId: "fresno-acores", espessura: 6, qnt: 3 },
      { corId: "fresno-acores", espessura: 15, qnt: 3 },
      { corId: "fresno-acores", espessura: 18, qnt: 1 },
      { corId: "azul-petroleo-matt", espessura: 6, qnt: 1 },
      { corId: "azul-petroleo-matt", espessura: 15, qnt: 2 },
      { corId: "azul-petroleo-matt", espessura: 18, qnt: 1 },
      { corId: "jequitiba-silvestre", espessura: 15, qnt: 8 },
    ],
    fita: [
      { corId: "fresno-acores", metros: 100 },
      { corId: "azul-petroleo-matt", metros: 40 },
      { corId: "jequitiba-silvestre", metros: 100 },
    ],
    acessorios: [
      { acessorioId: "dobradica-blum", qnt: 8 },
      { acessorioId: "corredica-telescopica", qnt: 4 },
    ],
    maoDeObra: [],
  },
  {
    id: "cozinha",
    nome: "Cozinha",
    chapas: [
      { corId: "azul-petroleo-matt", espessura: 6, qnt: 1 },
      { corId: "azul-petroleo-matt", espessura: 15, qnt: 4 },
      { corId: "azul-petroleo-matt", espessura: 18, qnt: 2 },
      { corId: "beton-matt", espessura: 6, qnt: 2 },
      { corId: "beton-matt", espessura: 15, qnt: 10 },
      { corId: "beton-matt", espessura: 18, qnt: 5 },
      { corId: "cronos", espessura: 15, qnt: 2 },
      { corId: "cronos", espessura: 18, qnt: 3 },
      { corId: "cronos", espessura: 6, qnt: 1 },
    ],
    fita: [
      { corId: "azul-petroleo-matt", metros: 40 },
      { corId: "beton-matt", metros: 260 },
      { corId: "cronos", metros: 40 },
    ],
    acessorios: [
      { acessorioId: "dobradica-blum", qnt: 38 },
      { acessorioId: "corredica-invisivel-blum", qnt: 19 },
      { acessorioId: "pistao", qnt: 8 },
    ],
    maoDeObra: [
      { servicoId: "porta-giro-mimetizada", qnt: 1 },
      { servicoId: "porta-vidro-slim", qnt: 4 },
    ],
  },
  {
    id: "banheiro-servico",
    nome: "Banheiro de serviço",
    chapas: [
      { corId: "off-white-suave", espessura: 6, qnt: 1 },
      { corId: "off-white-suave", espessura: 15, qnt: 1 },
      { corId: "beton-matt", espessura: 18, qnt: 1 },
    ],
    fita: [
      { corId: "argila", metros: 20 },
      { corId: "beton-matt", metros: 20 },
    ],
    acessorios: [
      { acessorioId: "dobradica-blum", qnt: 4 },
    ],
    maoDeObra: [
      { servicoId: "espelho-550x830", qnt: 1 },
    ],
  },
  {
    id: "lavanderia",
    nome: "Lavanderia",
    chapas: [
      { corId: "off-white-suave", espessura: 6, qnt: 3 },
      { corId: "off-white-suave", espessura: 15, qnt: 6 },
      { corId: "beton-matt", espessura: 6, qnt: 1 },
      { corId: "beton-matt", espessura: 15, qnt: 1 },
      { corId: "beton-matt", espessura: 18, qnt: 5 },
    ],
    fita: [
      { corId: "argila", metros: 60 },
      { corId: "beton-matt", metros: 140 },
    ],
    acessorios: [
      { acessorioId: "corredica-invisivel-blum", qnt: 8 },
      { acessorioId: "dobradica-blum", qnt: 40 },
      { acessorioId: "cabideiro", qnt: 1 },
    ],
    maoDeObra: [
      { servicoId: "usinagem-cava", qnt: 12 },
    ],
  },
  {
    id: "suite-master",
    nome: "Suíte master",
    chapas: [
      { corId: "areia", espessura: 6, qnt: 0 },
      { corId: "areia", espessura: 15, qnt: 0 },
      { corId: "areia", espessura: 18, qnt: 8 },
      { corId: "off-white-suave", espessura: 6, qnt: 7 },
      { corId: "off-white-suave", espessura: 15, qnt: 2 },
      { corId: "off-white-suave", espessura: 18, qnt: 10 },
      { corId: "cronos", espessura: 15, qnt: 2 },
    ],
    fita: [
      { corId: "areia", metros: 80 },
      { corId: "argila", metros: 100 },
      { corId: "cronos", metros: 40 },
    ],
    acessorios: [
      { acessorioId: "trilho-sup-inf-3m", qnt: 3 },
      { acessorioId: "kit-porta-correr-dominos", qnt: 6 },
      { acessorioId: "cabideiro", qnt: 7 },
      { acessorioId: "dobradica-blum", qnt: 5 },
      { acessorioId: "corredica-invisivel-blum", qnt: 18 },
    ],
    maoDeObra: [
      { servicoId: "usinagem-cava", qnt: 8 },
      { servicoId: "porta-pivotante-mimetizada", qnt: 1 },
    ],
  },
  {
    id: "wc-suite-master",
    nome: "WC suíte master",
    chapas: [
      { corId: "off-white-suave", espessura: 6, qnt: 1 },
      { corId: "off-white-suave", espessura: 15, qnt: 2 },
      { corId: "off-white-suave", espessura: 18, qnt: 0 },
      { corId: "beton-matt", espessura: 18, qnt: 1 },
      { corId: "jequitiba-silvestre", espessura: 18, qnt: 1 },
      { corId: "areia", espessura: 18, qnt: 0 },
    ],
    fita: [
      { corId: "off-white-suave", metros: 40 },
      { corId: "beton-matt", metros: 40 },
      { corId: "jequitiba-silvestre", metros: 20 },
    ],
    acessorios: [
      { acessorioId: "dobradica-blum", qnt: 20 },
    ],
    maoDeObra: [
      { servicoId: "usinagem-cava", qnt: 4 },
      { servicoId: "espelho-400x960", qnt: 6 },
    ],
  },
  {
    id: "hall-intimo",
    nome: "Hall íntimo",
    chapas: [
      { corId: "off-white-suave", espessura: 6, qnt: 1 },
      { corId: "off-white-suave", espessura: 15, qnt: 0 },
      { corId: "off-white-suave", espessura: 18, qnt: 2 },
      { corId: "beton-matt", espessura: 18, qnt: 0 },
      { corId: "jequitiba-silvestre", espessura: 18, qnt: 0 },
      { corId: "areia", espessura: 18, qnt: 2 },
    ],
    fita: [
      { corId: "off-white-suave", metros: 20 },
      { corId: "beton-matt", metros: 0 },
      { corId: "jequitiba-silvestre", metros: 0 },
      { corId: "areia", metros: 40 },
    ],
    acessorios: [
      { acessorioId: "dobradica-blum", qnt: 10 },
    ],
    maoDeObra: [
      { servicoId: "usinagem-cava", qnt: 2 },
    ],
  },
  {
    id: "suite-01",
    nome: "Suíte 01",
    chapas: [
      { corId: "areia", espessura: 6, qnt: 0 },
      { corId: "areia", espessura: 15, qnt: 4 },
      { corId: "areia", espessura: 18, qnt: 3 },
      { corId: "off-white-suave", espessura: 6, qnt: 3 },
      { corId: "off-white-suave", espessura: 15, qnt: 2 },
      { corId: "off-white-suave", espessura: 18, qnt: 6 },
      { corId: "jequitiba-silvestre", espessura: 18, qnt: 1 },
    ],
    fita: [
      { corId: "areia", metros: 100 },
      { corId: "argila", metros: 60 },
      { corId: "jequitiba-silvestre", metros: 20 },
    ],
    acessorios: [
      { acessorioId: "corredica-invisivel-blum", qnt: 5 },
      { acessorioId: "dobradica-blum", qnt: 30 },
      { acessorioId: "cabideiro", qnt: 3 },
      { acessorioId: "corredica-telescopica", qnt: 6 },
    ],
    maoDeObra: [
      { servicoId: "espelho-2550x650", qnt: 1 },
      { servicoId: "usinagem-cava", qnt: 5 },
    ],
  },
  {
    id: "wc-suite-01",
    nome: "WC suíte 01",
    chapas: [
      { corId: "off-white-suave", espessura: 6, qnt: 1 },
      { corId: "off-white-suave", espessura: 15, qnt: 1 },
      { corId: "beton-matt", espessura: 18, qnt: 1 },
    ],
    fita: [
      { corId: "off-white-suave", metros: 20 },
      { corId: "beton-matt", metros: 40 },
    ],
    acessorios: [
      { acessorioId: "dobradica-blum", qnt: 10 },
    ],
    maoDeObra: [
      { servicoId: "espelho-500x860", qnt: 3 },
      { servicoId: "usinagem-cava", qnt: 2 },
    ],
  },
  {
    id: "suite-02",
    nome: "Suíte 02",
    chapas: [
      { corId: "areia", espessura: 15, qnt: 3 },
      { corId: "areia", espessura: 18, qnt: 5 },
      { corId: "areia", espessura: 6, qnt: 0 },
      { corId: "off-white-suave", espessura: 6, qnt: 3 },
      { corId: "off-white-suave", espessura: 15, qnt: 1 },
      { corId: "off-white-suave", espessura: 18, qnt: 5 },
    ],
    fita: [
      { corId: "areia", metros: 120 },
      { corId: "argila", metros: 60 },
    ],
    acessorios: [
      { acessorioId: "cabideiro", qnt: 4 },
      { acessorioId: "dobradica-blum", qnt: 25 },
      { acessorioId: "corredica-telescopica", qnt: 10 },
    ],
    maoDeObra: [
      { servicoId: "usinagem-cava", qnt: 6 },
      { servicoId: "porta-espelho-834x2432", qnt: 1 },
    ],
  },
  {
    id: "wc-suite-02",
    nome: "WC suíte 02",
    chapas: [
      { corId: "off-white-suave", espessura: 6, qnt: 1 },
      { corId: "off-white-suave", espessura: 15, qnt: 1 },
      { corId: "beton-matt", espessura: 18, qnt: 1 },
    ],
    fita: [
      { corId: "off-white-suave", metros: 20 },
      { corId: "beton-matt", metros: 40 },
    ],
    acessorios: [
      { acessorioId: "dobradica-blum", qnt: 10 },
    ],
    maoDeObra: [
      { servicoId: "espelho-500x860", qnt: 3 },
      { servicoId: "usinagem-cava", qnt: 2 },
    ],
  },
  {
    id: "forro-cozinha",
    nome: "Forro da cozinha",
    chapas: [
      { corId: "jequitiba-silvestre", espessura: 15, qnt: 6 },
    ],
    fita: [
      { corId: "jequitiba-silvestre", metros: 160 },
    ],
    acessorios: [],
    maoDeObra: [],
  },];

/**
 * O que a planilha cobrou por ambiente, em valor com ART.
 *
 * Guardado para a conferência da importação: onde o motor discorda, é porque a
 * planilha tinha soma deslocada, `MATCH` truncado ou fórmula que esqueceu a
 * quantidade. Não é referência de preço — é referência do que foi faturado.
 */
export const COBRADO_NA_PLANILHA: Record<string, number> = {
  "hall": 14009.82,
  "lavabo": 20375.168,
  "sala-de-estar": 40512.032,
  "cozinha": 90840.9304,
  "banheiro-servico": 6061.132,
  "lavanderia": 41237.944,
  "suite-master": 81730.396,
  "wc-suite-master": 14355.22,
  "hall-intimo": 11957.66,
  "suite-01": 48823.676,
  "wc-suite-01": 8854.912,
  "suite-02": 45630.948,
  "wc-suite-02": 8854.912,
  "forro-cozinha": 11294.184,
};
