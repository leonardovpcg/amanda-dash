/* ═══════════════════════════════════════════════════════════════════════════
   Regras da ponte briefing → orçamento.

   O princípio que decide o desenho todo: **o briefing sabe o quê, o projeto 3D
   sabe o quanto.** Quantas dobradiças a cozinha leva depende de quantas portas
   o projeto tem, e isso não se pergunta numa reunião comercial.

   Por isso a maioria das regras lança a linha com quantidade `aDefinir`, que
   vira zero no orçamento e acende a pendência que o motor de cálculo já sabe
   mostrar. Chutar um número daria orçamento errado com cara de certo.

   Chapas e fita ficam fora de propósito: metragem só existe depois do 3D. A
   ponte cobre acessórios e mão de obra, que é onde o esquecimento custa caro —
   ninguém esquece a chapa, mas o pistão do basculante e a fita de LED somem.
   ═════════════════════════════════════════════════════════════════════════ */

/** Quando a regra dispara, olhando a resposta de uma pergunta. */
export type Gatilho =
  /** Pergunta de múltipla escolha que contém esta opção. */
  | { tipo: "temOpcao"; opcao: string }
  /** Escolha única ou sim/não com este valor exato. */
  | { tipo: "igualA"; valor: string | boolean }
  /** Qualquer resposta serve — usada em número e texto. */
  | { tipo: "respondida" };

/** De onde sai a quantidade da linha lançada. */
export type Quantidade =
  | { tipo: "fixa"; n: number }
  /** Multiplica a resposta numérica de outra pergunta — "portas × 2". */
  | { tipo: "porResposta"; perguntaId: string; fator: number }
  /** Lança com zero: a conta só fecha depois do projeto 3D. */
  | { tipo: "aDefinir" };

export type BlocoDestino = "acessorios" | "maoDeObra";

/** Uma resposta que vira linha de orçamento. */
export type RegraDeLinha = {
  id: string;
  /** Id do `RoteiroAmbiente`. */
  ambiente: string;
  perguntaId: string;
  quando: Gatilho;
  bloco: BlocoDestino;
  /** Id no catálogo de acessórios ou de mão de obra. */
  itemId: string;
  quantidade: Quantidade;
};

/**
 * Uma resposta que vira aviso, não linha.
 *
 * "Ambiente úmido" não gera ferragem nenhuma, mas muda a chapa inteira. Hoje
 * isso vive na cabeça dela; aqui sai escrito junto do rascunho.
 */
export type RegraDeObservacao = {
  id: string;
  /** Id do `RoteiroAmbiente`, ou "geral" para o briefing do cliente. */
  ambiente: string;
  perguntaId: string;
  quando: Gatilho;
  texto: string;
};

export type Regras = {
  linhas: RegraDeLinha[];
  observacoes: RegraDeObservacao[];
};

/* ── atalhos de escrita ──────────────────────────────────────────────────── */

const opcao = (o: string): Gatilho => ({ tipo: "temOpcao", opcao: o });
const igual = (v: string | boolean): Gatilho => ({ tipo: "igualA", valor: v });
const respondida: Gatilho = { tipo: "respondida" };
const aDefinir: Quantidade = { tipo: "aDefinir" };
const por = (perguntaId: string, fator: number): Quantidade => ({
  tipo: "porResposta",
  perguntaId,
  fator,
});

const L = (
  id: string,
  ambiente: string,
  perguntaId: string,
  quando: Gatilho,
  bloco: BlocoDestino,
  itemId: string,
  quantidade: Quantidade = aDefinir,
): RegraDeLinha => ({ id, ambiente, perguntaId, quando, bloco, itemId, quantidade });

const O = (
  id: string,
  ambiente: string,
  perguntaId: string,
  quando: Gatilho,
  texto: string,
): RegraDeObservacao => ({ id, ambiente, perguntaId, quando, texto });

/* ── regras padrão ───────────────────────────────────────────────────────── */

export const REGRAS_PADRAO: Regras = {
  linhas: [
    // ── cozinha ───────────────────────────────────────────────────────────
    L("coz-giro", "cozinha", "abertura", opcao("Giro"), "acessorios", "dobradica-blum"),
    // A única quantidade que o briefing comercial realmente entrega: um par de
    // corrediça por gaveta, e o número de gavetas é pergunta do roteiro.
    L(
      "coz-gaveta",
      "cozinha",
      "abertura",
      opcao("Gaveta"),
      "acessorios",
      "corredica-invisivel-blum",
      por("gavetas", 1),
    ),
    L("coz-basculante", "cozinha", "abertura", opcao("Basculante"), "acessorios", "pistao"),
    L("coz-correr", "cozinha", "abertura", opcao("Correr"), "acessorios", "kit-porta-correr-dominos"),
    L("coz-cava", "cozinha", "puxador", igual("Cava usinada"), "maoDeObra", "usinagem-cava"),
    L("coz-perfil", "cozinha", "puxador", igual("Perfil de alumínio"), "acessorios", "perfil-puxador-rm183"),
    L("coz-alca", "cozinha", "puxador", igual("Alça aparente"), "acessorios", "puxador-cardiff-preto"),
    L("coz-led", "cozinha", "led", igual(true), "acessorios", "fita-led"),
    L("coz-despenseiro", "cozinha", "despenseiro", igual(true), "acessorios", "corredica-telescopica"),

    // ── dormitório ────────────────────────────────────────────────────────
    L("dor-giro", "dormitorio", "tipo-porta", igual("Giro"), "acessorios", "dobradica-blum", por("portas", 2)),
    L(
      "dor-correr",
      "dormitorio",
      "tipo-porta",
      igual("Correr"),
      "acessorios",
      "kit-porta-correr-dominos",
      por("portas", 0.5),
    ),
    L("dor-trilho", "dormitorio", "tipo-porta", igual("Correr"), "acessorios", "trilho-sup-inf-3m"),
    L("dor-misto", "dormitorio", "tipo-porta", igual("Misto"), "acessorios", "dobradica-blum"),
    L("dor-cab-curto", "dormitorio", "interno", opcao("Cabideiro curto"), "acessorios", "cabideiro"),
    L("dor-cab-longo", "dormitorio", "interno", opcao("Cabideiro longo"), "acessorios", "cabideiro"),
    L("dor-gav", "dormitorio", "interno", opcao("Gavetas internas"), "acessorios", "corredica-telescopica"),

    // ── closet ────────────────────────────────────────────────────────────
    L("clo-portas", "closet", "tipo", igual("Fechado com portas"), "acessorios", "dobradica-blum"),
    L("clo-vidro", "closet", "tipo", igual("Portas de vidro"), "maoDeObra", "porta-vidro-slim"),
    L("clo-cab-curto", "closet", "modulos", opcao("Cabideiro curto"), "acessorios", "cabideiro"),
    L("clo-cab-longo", "closet", "modulos", opcao("Cabideiro longo"), "acessorios", "cabideiro"),
    L("clo-gaveteiro", "closet", "modulos", opcao("Gaveteiro"), "acessorios", "corredica-telescopica"),
    L("clo-ilha", "closet", "ilha", igual(true), "acessorios", "corredica-telescopica"),
    L("clo-led", "closet", "led", igual(true), "acessorios", "fita-led"),

    // ── home office ───────────────────────────────────────────────────────
    L("ho-gaveteiro", "home-office", "armazenamento", opcao("Gaveteiro"), "acessorios", "corredica-telescopica"),
    L("ho-armario", "home-office", "armazenamento", opcao("Armário fechado"), "acessorios", "dobradica-blum"),
    L("ho-arquivo", "home-office", "armazenamento", opcao("Arquivo"), "acessorios", "corredica-telescopica"),

    // ── lavanderia ────────────────────────────────────────────────────────
    L("lav-aereo", "lavanderia", "itens", opcao("Armário aéreo"), "acessorios", "dobradica-blum"),
    L("lav-torre", "lavanderia", "itens", opcao("Torre de produtos"), "acessorios", "dobradica-blum"),
    L("lav-vassoura", "lavanderia", "itens", opcao("Guarda-vassoura"), "acessorios", "dobradica-blum"),
    L("lav-cesto", "lavanderia", "itens", opcao("Cesto de roupa"), "acessorios", "corredica-telescopica"),

    // ── banheiro ──────────────────────────────────────────────────────────
    L("ban-gab-susp", "banheiro", "gabinete", igual("Suspenso"), "acessorios", "dobradica-blum"),
    L("ban-gab-apoio", "banheiro", "gabinete", igual("Apoiado no piso"), "acessorios", "dobradica-blum"),
    L("ban-espelheira", "banheiro", "espelho", igual("Espelheira com armário"), "acessorios", "dobradica-blum"),
    L("ban-led", "banheiro", "espelho", igual("Espelho com LED"), "acessorios", "fita-led"),
    L("ban-gaveteiro", "banheiro", "itens", opcao("Gaveteiro"), "acessorios", "corredica-telescopica"),
    L("ban-toalhas", "banheiro", "itens", opcao("Torre de toalhas"), "acessorios", "dobradica-blum"),

    // ── área gourmet ──────────────────────────────────────────────────────
    L("gou-bancada", "area-gourmet", "bancada", igual(true), "acessorios", "dobradica-blum"),
  ],

  observacoes: [
    // ── geral ─────────────────────────────────────────────────────────────
    O(
      "ger-arquiteto",
      "geral",
      "arquiteto",
      igual("Sim, projeto pronto"),
      "Projeto de terceiros: medição e qualquer alteração passam pelo arquiteto.",
    ),
    O(
      "ger-revestimento",
      "geral",
      "revestimento",
      igual(false),
      "Piso e revestimento ainda indefinidos — a cor das chapas fica pendente.",
    ),
    O(
      "ger-reforma",
      "geral",
      "imovel",
      igual("Reforma"),
      "Reforma: conferir prumo, esquadrias e rodapé existente na medição.",
    ),

    // ── cozinha ───────────────────────────────────────────────────────────
    O(
      "coz-geladeira",
      "cozinha",
      "geladeira",
      respondida,
      "Conferir o vão da geladeira na medição antes de fechar o projeto.",
    ),
    O(
      "coz-gas",
      "cozinha",
      "eletros",
      opcao("Cooktop a gás"),
      "Cooktop a gás: confirmar ponto de gás e o recorte da bancada.",
    ),
    O(
      "coz-louca",
      "cozinha",
      "eletros",
      opcao("Lava-louças"),
      "Lava-louças: prever ponto hidráulico e frente de embutir.",
    ),
    O(
      "coz-coifa",
      "cozinha",
      "eletros",
      opcao("Coifa"),
      "Coifa: confirmar quem fornece e a altura de instalação.",
    ),

    // ── dormitório ────────────────────────────────────────────────────────
    O("dor-ar", "dormitorio", "ar", respondida, "Ar-condicionado: conferir a altura livre do armário."),
    O(
      "dor-espelho",
      "dormitorio",
      "espelho",
      igual(true),
      "Espelho no guarda-roupa: definir medida e tipo na visita técnica.",
    ),

    // ── closet ────────────────────────────────────────────────────────────
    O("clo-sapatos", "closet", "sapatos", respondida, "Dimensionar a sapateira pelo número de pares informado."),

    // ── home office ───────────────────────────────────────────────────────
    O("ho-fio", "home-office", "fio", igual(true), "Passagem de fio: prever furação e tomada na bancada."),
    O("ho-cpu", "home-office", "cpu", igual(true), "Nicho de CPU: confirmar as medidas do gabinete."),

    // ── lavanderia ────────────────────────────────────────────────────────
    O(
      "lav-empilhadas",
      "lavanderia",
      "arranjo",
      igual("Empilhadas"),
      "Máquinas empilhadas: confirmar kit de empilhamento e altura livre.",
    ),
    O("lav-medidas", "lavanderia", "medidas", respondida, "Conferir o vão das máquinas na medição."),

    // ── banheiro ──────────────────────────────────────────────────────────
    O(
      "ban-umidade",
      "banheiro",
      "umidade",
      igual(true),
      "Ambiente úmido: especificar MDF hidrófugo em todo o ambiente.",
    ),

    // ── área gourmet ──────────────────────────────────────────────────────
    O(
      "gou-descoberta",
      "area-gourmet",
      "coberta",
      igual(false),
      "Área descoberta: o móvel precisa de material para exterior — revisar a especificação inteira.",
    ),
    O(
      "gou-alvenaria",
      "area-gourmet",
      "churrasqueira",
      igual("Alvenaria"),
      "Churrasqueira de alvenaria: alinhar com a obra civil antes de medir.",
    ),
    O("gou-coifa", "area-gourmet", "coifa", igual(true), "Coifa: confirmar exaustão e quem fornece."),
  ],
};
