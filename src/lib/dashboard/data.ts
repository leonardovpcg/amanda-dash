// Dados e tokens do "Dashboard Arquitetura".
// Portado de claude.ai/design/p/cc5e4c8d-83bf-493e-bcbd-045df09d76dd
// (arquivo `Dashboard Arquitetura.dc.html`). Valores são de protótipo.

import type { OrcamentoAmbiente } from "@/lib/orcamento/tipos";

export const money = (n: number) =>
  "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export type ToneName = "terracota" | "clay" | "sand" | "olive";

export const TONES: Record<ToneName, { bg: string; fg: string; bd: string }> = {
  terracota: { bg: "#F8EDE5", fg: "#A84B1C", bd: "#EEDCCE" },
  clay: { bg: "#FAEAE7", fg: "#9C2B22", bd: "#F1D6D1" },
  sand: { bg: "#F1F0EA", fg: "#6E6A5F", bd: "#E3E0D6" },
  olive: { bg: "#F1F2E8", fg: "#6B7040", bd: "#E1E3D2" },
};

/** Equivalente ao `chip(tone)` do design, como objeto de estilo React. */
export const chip = (tone?: ToneName): React.CSSProperties => {
  const s = TONES[tone ?? "sand"] ?? TONES.sand;
  return {
    fontSize: "11.5px",
    fontWeight: 600,
    padding: "5px 11px",
    borderRadius: 999,
    whiteSpace: "nowrap",
    background: s.bg,
    color: s.fg,
    border: "1px solid " + s.bd,
  };
};

export const STATUS_TONE: Record<string, ToneName> = {
  "Em andamento": "terracota",
  "Aguardando aprovação": "clay",
  Concluído: "sand",
};

export const AMB_STEPS = [
  "Medição",
  "Projeto aprovado",
  "Produção",
  "Entrega",
  "Montagem",
  "Concluído",
];

export const CAT_COLORS = ["#8E3A12", "#A84B1C", "#C0663C", "#8C8A62", "#B9A88A"];

export type StageKey = "lead" | "visita" | "projeto" | "orcamento" | "negociacao" | "fechado";

export const STAGES: [StageKey, string][] = [
  ["lead", "Lead"],
  ["visita", "Visita técnica"],
  ["projeto", "Projeto"],
  ["orcamento", "Orçamento"],
  ["negociacao", "Negociação"],
  ["fechado", "Fechado / Perdido"],
];

export type Lead = {
  id: string;
  name: string;
  value: number;
  idle: number;
  ambientes: string;
  stage: StageKey;
  /**
   * Projeto já aberto para este lead, quando existe.
   *
   * É o vínculo que faltava entre o funil e o orçamento: com ele, o valor
   * mostrado no cartão do funil deixa de ser estimativa digitada e passa a
   * ser o total com ART calculado no projeto.
   */
  projetoId?: string;
  /** Do cadastro do cliente. Ausente enquanto ninguém preencheu. */
  telefone?: string | null;
  email?: string | null;
};

/* Os 14 leads de protótipo saíram daqui: o funil agora lê `v_funil`. O tipo
   `Lead` continua, porque é a forma que os componentes recebem. */

/** [nome, detalhe, valor, etapa (0-5), eta] */
export type Ambiente = [string, string, number, number, string];
/** [rótulo, data, estado] */
export type ProjectStage = [string, string, "done" | "current" | "todo"];
/** [rótulo, orçado, gasto] */
export type BudgetCat = [string, number, number];
/** [nome, spec, categoria, qtd, unitário, total] */
export type Material = [string, string, string, string, number, number];

export type Project = {
  id: string;
  name: string;
  client: string;
  address: string;
  status: string;
  stage: string;
  deadline: string;
  budget: number;
  spent: number;
  imageLabel: string;
  ambientes: Ambiente[];
  stages: ProjectStage[];
  /** Vazio desde a migração: a composição sai do orçamento calculado. */
  budgetCats: BudgetCat[];
  /** Vazio desde a migração: a lista de itens sai do orçamento. Uma segunda
   *  lista digitada à mão seria a fonte que envelhece. */
  materials: Material[];
  /**
   * Orçamento quantitativo do projeto — o que era uma aba por ambiente na
   * planilha. Vazio enquanto ninguém orçou; o total dele ainda não substitui
   * `budget`, que continua sendo o valor de contrato digitado.
   */
  orcamento: OrcamentoAmbiente[];
};

/* Os seis projetos de protótipo saíram: projetos, ambientes e orçamento vêm
   de `src/lib/dados/projetos.ts`. O tipo `Project` continua, porque é a forma
   que os componentes recebem — e continuará valendo quando houver uma ficha de
   cliente de verdade por trás de `client`. */

/**
 * Percentual de comissão sobre o valor vendido.
 *
 * Hoje é 2% em toda venda. No banco isso vira a tabela `faixas_comissao`
 * com uma linha só — de zero a sem teto —, porque faixa por valor de venda é
 * o passo seguinte natural e acrescentar linha sai mais barato que migrar
 * coluna.
 */
export const TAXA_COMISSAO = 0.02;

/**
 * [cliente, detalhe, valor, situação, tom]
 *
 * A comissão não é guardada aqui: sai de `valor × TAXA_COMISSAO` na tela.
 * Guardar os dois deixaria a taxa e o valor discordarem no dia em que uma
 * das duas mudasse — foi assim que a aba "Resumo" da planilha ficou errada.
 */
export const COMMISSIONS: [string, string, number, string, ToneName][] = [
  ["Helô Bandeira", "Cozinha + dormitório · assinado 04 ago", 58000, "Recebida", "terracota"],
  ["Sr. Aurélio Braga", "Casa de praia · 3 ambientes", 71000, "Recebida", "terracota"],
  ["Família Moretti", "Aditivo home office", 36000, "A liberar", "clay"],
  ["Marcos Iório", "Closet + lavanderia", 41400, "A liberar", "clay"],
  ["Studio Anelli", "Escritório · 1ª parcela", 44000, "Prevista", "sand"],
  ["Bruno Kertész", "Closet + banheiro", 18000, "Prevista", "sand"],
];

export const MONTHLY: [string, number][] = [
  ["Mar", 196000],
  ["Abr", 241000],
  ["Mai", 178000],
  ["Jun", 312000],
  ["Jul", 287000],
  ["Ago", 268400],
];

/** [dia, mês, título, detalhe, meta, cor da meta] */
export type AgendaItem = [string, string, string, string, string, string];

export const AGENDA: [string, string, AgendaItem[]][] = [
  [
    "Visitas técnicas",
    "Medições e visitas agendadas",
    [
      ["25", "ago", "Juliana Beltrão", "Medição final · cozinha e lavanderia", "09:00 · Perdizes", "#A84B1C"],
      ["27", "ago", "Sr. Aurélio Braga", "Medição inicial · 3 ambientes", "14:30 · Camburi (deslocamento)", "#6E6A5F"],
      ["29", "ago", "Marina Sampaio", "Primeira visita · cozinha e closet", "10:30 · Vila Nova Conceição", "#6E6A5F"],
      ["02", "set", "Estúdio Faro", "Conferência de medidas do mezanino", "16:00 · Vila Madalena", "#6E6A5F"],
    ],
  ],
  [
    "Retornos a fazer",
    "Follow-up de propostas enviadas",
    [
      ["22", "ago", "Paulo Andrade", "Proposta enviada há 14 dias, sem resposta", "atrasado 4 dias", "#9C2B22"],
      ["23", "ago", "Ana Lúcia Verona", "Revisar orçamento da cozinha gourmet", "hoje", "#9C2B22"],
      ["26", "ago", "Família Ferraz", "Retomar contato · lead há 9 dias", "em 4 dias", "#6E6A5F"],
      ["28", "ago", "Dra. Renata Sampaio", "Negociação de condições de pagamento", "em 6 dias", "#6E6A5F"],
    ],
  ],
  [
    "Entregas e montagens",
    "Logística confirmada com a fábrica",
    [
      ["10", "set", "Residência Alvorada", "Montagem lavanderia · equipe 2 montadores", "confirmado", "#A84B1C"],
      ["12", "set", "Clínica Vértice", "Montagem recepção · balcão curvo", "confirmado", "#A84B1C"],
      ["18", "set", "Residência Alvorada", "Montagem cozinha · 3 dias de obra", "a confirmar frete", "#9C2B22"],
      ["28", "set", "Clínica Vértice", "Entrega sala clínica 2", "confirmado", "#A84B1C"],
    ],
  ],
];

/** [cliente, ambiente, problema, aberto em, situação, tom] */
export const ASSIST: [string, string, string, string, string, ToneName][] = [
  ["Família Nogueira", "Closet · Ipanema", "Regulagem de porta de correr desalinhada", "12 ago", "Peça solicitada", "clay"],
  ["Marcos Iório", "Lavanderia · Pinheiros", "Troca de corrediça com ruído", "05 ago", "Prazo vencido", "clay"],
  ["Helô Bandeira", "Cozinha · Santana", "Retoque de acabamento no rodapé", "18 ago", "Agendada 30 ago", "terracota"],
  ["Clínica Vértice", "Sala clínica 1 · Itaim", "Ajuste de dobradiça em armário técnico", "20 ago", "Em análise", "sand"],
];

/** [cliente, escopo, até, restante, cor] */
export const WARRANTIES: [string, string, string, string, string][] = [
  ["Família Nogueira", "Suíte e closet · marcenaria completa", "jun 2031", "58 meses", "#A84B1C"],
  ["Marcos Iório", "Closet e lavanderia", "out 2026", "2 meses", "#9C2B22"],
  ["Helô Bandeira", "Cozinha e dormitório", "ago 2031", "60 meses", "#A84B1C"],
  ["Condomínio Aurora", "Armários de área comum", "nov 2026", "3 meses", "#9C2B22"],
];

/** [cliente, nota, ação] */
export const REFERRALS: [string, string, string][] = [
  ["Família Nogueira", "Entregue há 2 meses · NPS 9", "Pedir indicação"],
  ["Marcos Iório", "Mencionou reforma do home office", "Oferecer projeto"],
  ["Condomínio Aurora", "Segundo bloco em obras", "Propor recompra"],
  ["Helô Bandeira", "Indicou 1 cliente em julho", "Agradecer e reativar"],
];

/** [chave de busca, valor, unidade, fonte] */
export const PRICES: [string, string, string, string][] = [
  ["mdf", "R$ 289,00", "por chapa 18 mm (2,75 × 1,85 m)", "Média de 5 fornecedores · atualizado hoje"],
  ["porcelanato", "R$ 132,90", "por m² · acetinado 90x90", "Média de 7 fornecedores · atualizado hoje"],
  ["marmore", "R$ 1.180,00", "por m² · chapa polida", "Média de 3 marmorarias · atualizado hoje"],
  ["corrediça", "R$ 96,00", "por par · soft close 500 mm", "Média de 4 fornecedores · atualizado hoje"],
  ["led", "R$ 210,00", "por metro linear instalado", "Média de 4 fornecedores · atualizado hoje"],
];

export const ORIGENS = ["Loja", "Indicação", "Instagram", "Arquiteto parceiro", "Site"];

export const AMB_OPTS = [
  "Cozinha",
  "Dormitório",
  "Closet",
  "Home office",
  "Lavanderia",
  "Banheiro",
  "Área gourmet",
];

/** [título, detalhe, tempo, cor] */
export const NOTICES: [string, string, string, string][] = [
  ["Paulo Andrade sem retorno", "Proposta de R$ 42.000 enviada há 14 dias, negociação parada.", "atrasado 4 dias", "#9C2B22"],
  ["Fábrica confirmou entrega", "Clínica Vértice · balcão da recepção sai em 09 set.", "há 2 h", "#A84B1C"],
  ["Aprovação pendente", "Camila e Rui Tavares precisam assinar o executivo até 31 ago.", "hoje, 08:40", "#9C2B22"],
  ["Assistência agendada", "Helô Bandeira · retoque de rodapé em 30 ago, 10:00.", "ontem", "#6B7040"],
];

/** Próximo passo sugerido por etapa do funil. */
export const NEXT_STEPS: [string, string][] = [
  ["Ligar para qualificar o interesse", "sem contato desde a entrada"],
  ["Confirmar medição no local", "agenda sugerida: 27 ago, 14:30"],
  ["Enviar projeto 3D para aprovação", "prazo interno: 3 dias úteis"],
  ["Apresentar orçamento detalhado", "proposta pronta para envio"],
  ["Fechar condições de pagamento", "desconto máximo aprovado: 7%"],
  ["Abrir pedido na fábrica", "contrato assinado"],
];
