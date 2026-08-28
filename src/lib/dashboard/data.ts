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

export type StageKey = "lead" | "visita" | "projeto" | "negociacao" | "fechado";

/**
 * As etapas do funil.
 *
 * "Orçamento" saiu e virou parte de "Projeto". Nas palavras dela: "projeto e
 * orçamento pra marcenaria é a mesma coisa" — o orçamento só existe porque o
 * projeto foi redesenhado, e duas etapas para um trabalho só significavam
 * arrastar o cartão duas vezes pelo mesmo motivo.
 */
export const STAGES: [StageKey, string][] = [
  ["lead", "Lead"],
  ["visita", "Visita técnica"],
  ["projeto", "Projeto"],
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
export type ProjectStage = [string, string, "done" | "current" | "todo" | "dispensado"];
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
  /**
   * Valor congelado na assinatura, quando o contrato já existe.
   *
   * Manda em cima do orçamento calculado: reajustar a tabela de valores muda
   * proposta aberta, nunca contrato fechado.
   */
  contratoAssinado?: number;
};

/* Os seis projetos de protótipo saíram: projetos, ambientes e orçamento vêm
   de `src/lib/dados/projetos.ts`. O tipo `Project` continua, porque é a forma
   que os componentes recebem — e continuará valendo quando houver uma ficha de
   cliente de verdade por trás de `client`. */

/* A comissão e o histórico mensal de protótipo saíram: a taxa vem de
   `faixas_comissao` e os contratos de `src/lib/dados/contratos.ts`, que é o
   mesmo caminho de `v_comissoes` no banco. */

/* Agenda, assistências, garantias, indicações e a lista de preços de
   protótipo saíram. Agenda vem de `v_agenda` e `v_retornos`; pós-venda de
   `assistencias`, `v_garantias` e `v_indicacoes`; a consulta de preço passou
   a procurar na tabela de valores dela, em `src/lib/orcamento/consultar.ts`. */

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

/* Os avisos de protótipo saíram: agora são derivados das condições que já
   estão no banco, em `src/lib/dados/avisos.ts`. Sem tabela de propósito —
   aviso guardado precisaria de alguém para apagá-lo quando o motivo passa. */

/**
 * Próximo passo sugerido por etapa do funil.
 *
 * Só a ação. A linha de apoio que existia aqui era inventada — data de
 * reunião que ninguém marcou, desconto que ninguém aprovou. A gaveta do lead
 * mostra no lugar dela o tempo parado, que é dado real.
 */
export const NEXT_STEPS: string[] = [
  "Ligar para qualificar o interesse",
  "Confirmar medição no local",
  "Desenhar o projeto e levantar o quantitativo",
  "Fechar condições de pagamento",
  "Abrir pedido na fábrica",
];
