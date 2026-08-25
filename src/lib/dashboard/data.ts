// Dados e tokens do "Dashboard Arquitetura".
// Portado de claude.ai/design/p/cc5e4c8d-83bf-493e-bcbd-045df09d76dd
// (arquivo `Dashboard Arquitetura.dc.html`). Valores são de protótipo.

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
};

export const LEADS: Lead[] = [
  { id: "l1", name: "Marina Sampaio", value: 62000, idle: 1, ambientes: "Cozinha + closet", stage: "lead" },
  { id: "l2", name: "Eduardo Prates", value: 28000, idle: 3, ambientes: "Home office", stage: "lead" },
  { id: "l3", name: "Família Ferraz", value: 94000, idle: 9, ambientes: "Apto 3 dorms completo", stage: "lead" },
  { id: "l4", name: "Juliana Beltrão", value: 51000, idle: 2, ambientes: "Cozinha + lavanderia", stage: "visita" },
  { id: "l5", name: "Rogério Matias", value: 37500, idle: 6, ambientes: "Dormitório casal", stage: "visita" },
  { id: "l6", name: "Studio Anelli", value: 118000, idle: 4, ambientes: "Escritório corporativo", stage: "projeto" },
  { id: "l7", name: "Camila e Rui Tavares", value: 76000, idle: 11, ambientes: "Cozinha, closet, home", stage: "projeto" },
  { id: "l8", name: "Bruno Kertész", value: 44000, idle: 2, ambientes: "Closet + banheiro", stage: "orcamento" },
  { id: "l9", name: "Ana Lúcia Verona", value: 88000, idle: 8, ambientes: "Cozinha gourmet", stage: "orcamento" },
  { id: "l10", name: "Família Moretti", value: 132000, idle: 1, ambientes: "Casa completa · 5 ambientes", stage: "negociacao" },
  { id: "l11", name: "Dra. Renata Sampaio", value: 96000, idle: 5, ambientes: "Clínica · recepção e salas", stage: "negociacao" },
  { id: "l12", name: "Paulo Andrade", value: 42000, idle: 14, ambientes: "Dormitório + home office", stage: "negociacao" },
  { id: "l13", name: "Helô Bandeira", value: 58000, idle: 0, ambientes: "Cozinha + dormitório", stage: "fechado" },
  { id: "l14", name: "Sr. Aurélio Braga", value: 71000, idle: 3, ambientes: "Casa de praia · 3 ambientes", stage: "fechado" },
];

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
  budgetCats: BudgetCat[];
  materials: Material[];
};

export const PROJECTS: Project[] = [
  {
    id: "p1",
    name: "Residência Alvorada",
    client: "Família Moretti",
    address: "Jardins, São Paulo",
    status: "Em andamento",
    stage: "Produção de marcenaria",
    deadline: "12 set 2026",
    budget: 640000,
    spent: 431000,
    imageLabel: "living integrado",
    ambientes: [
      ["Cozinha", "Ilha 3,20 m · MDF carvalho + Corian", 148000, 4, "18 set · montagem"],
      ["Dormitório casal", "Painel ripado + guarda-roupa 4,10 m", 126000, 3, "02 out · entrega"],
      ["Closet", "Módulos abertos com iluminação embutida", 98000, 3, "02 out · entrega"],
      ["Home office", "Bancada suspensa 2,40 m + estante", 74000, 2, "20 out · produção"],
      ["Lavanderia", "Torre de serviço + armário alto", 42000, 5, "10 set · montagem"],
    ],
    stages: [
      ["Briefing", "jan 2026", "done"],
      ["Projeto", "fev 2026", "done"],
      ["Aprovação", "abr 2026", "done"],
      ["Produção", "em curso", "current"],
      ["Entrega", "set 2026", "todo"],
      ["Montagem", "out 2026", "todo"],
    ],
    budgetCats: [
      ["Materiais", 210000, 168000],
      ["Mão de obra", 175000, 132000],
      ["Mobiliário", 168000, 96000],
      ["Iluminação", 52000, 25000],
      ["Decoração", 35000, 10000],
    ],
    materials: [
      ["Porcelanato acetinado", "Bege areia 90x90 cm", "Materiais", "180 m²", 132, 23760],
      ["MDF branco TX", "18 mm · marcenaria sob medida", "Materiais", "46 chapas", 289, 13294],
      ["Mármore Travertino", "Bancada cozinha, acabamento escovado", "Materiais", "9 m²", 1180, 10620],
      ["Corrediça telescópica", "Soft close 500 mm", "Ferragens", "38 pares", 96, 3648],
      ["Perfil de LED embutido", "Linear 2700K, 24 V", "Iluminação", "38 m", 210, 7980],
      ["Montagem dormitório", "Equipe 2 montadores · 3 dias", "Mão de obra", "1 un", 4800, 4800],
    ],
  },
  {
    id: "p2",
    name: "Apartamento Higienópolis",
    client: "Camila e Rui Tavares",
    address: "Higienópolis, São Paulo",
    status: "Aguardando aprovação",
    stage: "Projeto executivo",
    deadline: "31 ago 2026",
    budget: 285000,
    spent: 96000,
    imageLabel: "cozinha aberta",
    ambientes: [
      ["Cozinha", "Torre quente + despenseiro", 96000, 2, "25 set · aprovação"],
      ["Closet", "Portas de correr espelhadas", 68000, 1, "aguardando medição final"],
      ["Home office", "Marcenaria em freijó", 54000, 1, "aguardando aprovação"],
    ],
    stages: [
      ["Briefing", "mar 2026", "done"],
      ["Projeto", "mai 2026", "done"],
      ["Aprovação", "em curso", "current"],
      ["Produção", "set 2026", "todo"],
      ["Entrega", "out 2026", "todo"],
      ["Montagem", "dez 2026", "todo"],
    ],
    budgetCats: [
      ["Materiais", 96000, 41000],
      ["Mão de obra", 74000, 28000],
      ["Mobiliário", 68000, 19000],
      ["Iluminação", 27000, 8000],
      ["Decoração", 20000, 0],
    ],
    materials: [
      ["MDF carvalho natural", "18 mm · painel ripado sala", "Materiais", "22 chapas", 412, 9064],
      ["Porcelanato cimentício", "Cinza claro 60x120 cm", "Materiais", "92 m²", 118, 10856],
      ["Puxador perfil embutido", "Alumínio anodizado", "Ferragens", "26 m", 148, 3848],
      ["Pendentes de vidro", "Fumê, sobre bancada", "Iluminação", "3 un", 1450, 4350],
    ],
  },
  {
    id: "p3",
    name: "Clínica Vértice",
    client: "Dra. Renata Sampaio",
    address: "Itaim Bibi, São Paulo",
    status: "Em andamento",
    stage: "Entrega e montagem",
    deadline: "05 out 2026",
    budget: 420000,
    spent: 238000,
    imageLabel: "recepção",
    ambientes: [
      ["Recepção", "Balcão curvo 4,00 m + painel", 132000, 4, "12 set · montagem"],
      ["Sala clínica 1", "Armários técnicos e cuba", 78000, 5, "concluído"],
      ["Sala clínica 2", "Armários técnicos e cuba", 78000, 3, "28 set · entrega"],
      ["Copa", "Marcenaria compacta + torre", 46000, 2, "produção em fila"],
    ],
    stages: [
      ["Briefing", "dez 2025", "done"],
      ["Projeto", "jan 2026", "done"],
      ["Aprovação", "mar 2026", "done"],
      ["Produção", "jul 2026", "done"],
      ["Entrega", "em curso", "current"],
      ["Montagem", "out 2026", "todo"],
    ],
    budgetCats: [
      ["Materiais", 148000, 92000],
      ["Mão de obra", 112000, 68000],
      ["Mobiliário", 96000, 54000],
      ["Iluminação", 38000, 18000],
      ["Decoração", 26000, 6000],
    ],
    materials: [
      ["Vinílico em régua", "Tom nogueira, tráfego comercial", "Materiais", "210 m²", 96, 20160],
      ["Divisória acústica", "Vidro duplo com película", "Materiais", "18 m²", 1240, 22320],
      ["Poltronas de espera", "Estofado bouclé areia", "Mobiliário", "12 un", 2380, 28560],
      ["Luminária de trilho", "Preto fosco, 3000K", "Iluminação", "24 un", 540, 12960],
    ],
  },
  {
    id: "p4",
    name: "Casa de Praia Camburi",
    client: "Sr. Aurélio Braga",
    address: "Camburi, São Sebastião",
    status: "Em andamento",
    stage: "Medição e projeto",
    deadline: "20 nov 2026",
    budget: 310000,
    spent: 62000,
    imageLabel: "varanda",
    ambientes: [
      ["Cozinha", "Marcenaria naval + bancada quartzo", 118000, 1, "medição em 27 ago"],
      ["Dormitório suíte", "Guarda-roupa 3,60 m", 92000, 1, "projeto em desenvolvimento"],
      ["Área gourmet", "Churrasqueira e armário externo", 74000, 0, "aguardando medição"],
    ],
    stages: [
      ["Briefing", "jun 2026", "done"],
      ["Projeto", "em curso", "current"],
      ["Aprovação", "set 2026", "todo"],
      ["Produção", "out 2026", "todo"],
      ["Entrega", "dez 2026", "todo"],
      ["Montagem", "mar 2027", "todo"],
    ],
    budgetCats: [
      ["Materiais", 112000, 26000],
      ["Mão de obra", 88000, 18000],
      ["Mobiliário", 74000, 14000],
      ["Iluminação", 21000, 4000],
      ["Decoração", 15000, 0],
    ],
    materials: [
      ["Deck de cumaru", "Régua 10 cm, tratado", "Materiais", "64 m²", 385, 24640],
      ["Fibra sintética", "Trama natural, área externa", "Mobiliário", "6 un", 1980, 11880],
      ["MDF hidrófugo", "18 mm · verde, área úmida", "Materiais", "18 chapas", 468, 8424],
    ],
  },
  {
    id: "p5",
    name: "Loft Vila Madalena",
    client: "Estúdio Faro",
    address: "Vila Madalena, São Paulo",
    status: "Aguardando aprovação",
    stage: "Aprovação de orçamento",
    deadline: "09 set 2026",
    budget: 118000,
    spent: 34000,
    imageLabel: "mezanino",
    ambientes: [
      ["Home office", "Bancada corrida 5,20 m + nichos", 62000, 1, "aguardando aprovação"],
      ["Copa", "Módulo compacto com bancada", 34000, 1, "aguardando aprovação"],
      ["Dormitório mezanino", "Guarda-roupa sob laje inclinada", 22000, 0, "medição pendente"],
    ],
    stages: [
      ["Briefing", "mai 2026", "done"],
      ["Projeto", "jul 2026", "done"],
      ["Aprovação", "aguardando", "current"],
      ["Produção", "out 2026", "todo"],
      ["Entrega", "nov 2026", "todo"],
      ["Montagem", "jan 2027", "todo"],
    ],
    budgetCats: [
      ["Materiais", 42000, 14000],
      ["Mão de obra", 31000, 11000],
      ["Mobiliário", 28000, 7000],
      ["Iluminação", 11000, 2000],
      ["Decoração", 6000, 0],
    ],
    materials: [
      ["MDF preto TX", "18 mm · estantes e nichos", "Materiais", "16 chapas", 342, 5472],
      ["Estrutura metálica", "Guarda-corpo mezanino", "Mão de obra", "11 m", 940, 10340],
    ],
  },
  {
    id: "p6",
    name: "Cobertura Ipanema",
    client: "Família Nogueira",
    address: "Ipanema, Rio de Janeiro",
    status: "Concluído",
    stage: "Entregue e documentado",
    deadline: "30 jun 2026",
    budget: 72000,
    spent: 71000,
    imageLabel: "suíte principal",
    ambientes: [
      ["Suíte principal", "Cabeceira estofada + guarda-roupa", 48000, 6, "concluído em 22 jun"],
      ["Closet", "Módulos com portas de vidro", 24000, 6, "concluído em 30 jun"],
    ],
    stages: [
      ["Briefing", "set 2025", "done"],
      ["Projeto", "out 2025", "done"],
      ["Aprovação", "dez 2025", "done"],
      ["Produção", "fev 2026", "done"],
      ["Entrega", "mai 2026", "done"],
      ["Montagem", "jun 2026", "done"],
    ],
    budgetCats: [
      ["Materiais", 26000, 25800],
      ["Mão de obra", 21000, 21000],
      ["Mobiliário", 17000, 16600],
      ["Iluminação", 5000, 4900],
      ["Decoração", 3000, 2700],
    ],
    materials: [
      ["Papel de parede texturizado", "Linho off-white", "Materiais", "38 m²", 172, 6536],
      ["Cabeceira estofada", "Veludo verde-oliva, 2,00 m", "Mobiliário", "1 un", 8400, 8400],
    ],
  },
];

/** [cliente, detalhe, valor, comissão, situação, tom] */
export const COMMISSIONS: [string, string, number, number, string, ToneName][] = [
  ["Helô Bandeira", "Cozinha + dormitório · assinado 04 ago", 58000, 2320, "Recebida", "terracota"],
  ["Sr. Aurélio Braga", "Casa de praia · 3 ambientes", 71000, 2840, "Recebida", "terracota"],
  ["Família Moretti", "Aditivo home office", 36000, 1440, "A liberar", "clay"],
  ["Marcos Iório", "Closet + lavanderia", 41400, 1656, "A liberar", "clay"],
  ["Studio Anelli", "Escritório · 1ª parcela", 44000, 1760, "Prevista", "sand"],
  ["Bruno Kertész", "Closet + banheiro", 18000, 720, "Prevista", "sand"],
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
