/* ═══════════════════════════════════════════════════════════════════════════
   Roteiro comercial padrão.

   As perguntas estão escritas como ela fala, não como um formulário rotula —
   "Quem cozinha e com que frequência?" e não "Perfil de uso". Quem lê é ela,
   em voz alta, na frente do cliente.

   `essencial` marca o que trava o orçamento. É pouco de propósito: roteiro com
   vinte obrigatórias ninguém preenche. O resto existe para quando a conversa
   render.

   Isto é só o padrão de fábrica — a partir daqui o roteiro vive no armazém e
   ela edita pela tela de Ajustes.
   ═════════════════════════════════════════════════════════════════════════ */

import type { Roteiro } from "./tipos";

export const ROTEIRO_PADRAO: Roteiro = {
  geral: [
    {
      id: "cliente-imovel",
      titulo: "Cliente e imóvel",
      perguntas: [
        {
          id: "quem-mora",
          texto: "Quem mora ou vai usar o espaço?",
          ajuda: "quantas pessoas, idades, crianças, pets",
          tipo: "texto",
        },
        {
          id: "imovel",
          texto: "O imóvel é novo ou é reforma?",
          tipo: "escolha",
          opcoes: ["Novo / na planta", "Novo / entregue", "Reforma", "Ainda decidindo"],
          essencial: true,
        },
        {
          id: "chaves",
          texto: "Quando você recebe as chaves ou libera o espaço?",
          ajuda: "é a data que a produção persegue",
          tipo: "texto",
        },
        {
          id: "obra",
          texto: "Tem obra civil acontecendo?",
          tipo: "escolha",
          opcoes: ["Não", "Sim, em andamento", "Sim, vai começar", "Já terminou"],
        },
        {
          id: "revestimento",
          texto: "Piso e revestimento já estão definidos?",
          ajuda: "define a cor das chapas e o recorte do rodapé",
          tipo: "simNao",
        },
      ],
    },
    {
      id: "projeto-prazo",
      titulo: "Projeto e prazo",
      perguntas: [
        {
          id: "prazo",
          texto: "Existe uma data limite?",
          ajuda: "mudança, casamento, chegada de bebê — é o que aperta a produção",
          tipo: "texto",
          essencial: true,
        },
        {
          id: "arquiteto",
          texto: "Tem arquiteto ou designer no projeto?",
          ajuda: "com projeto de terceiros, medição e decisões passam por ele",
          tipo: "escolha",
          opcoes: [
            "Não",
            "Sim, projeto pronto",
            "Sim, projeto em desenvolvimento",
            "Vou contratar",
          ],
          essencial: true,
        },
        {
          id: "ambientes",
          texto: "Quais ambientes entram agora?",
          ajuda: "adicione cada um na aba dele para as perguntas específicas",
          tipo: "texto",
          essencial: true,
        },
        {
          id: "prioridade",
          texto: "Se não der para fazer tudo agora, o que vem primeiro?",
          ajuda: "abre a porta para fasear em vez de perder a venda",
          tipo: "texto",
        },
      ],
    },
    {
      id: "investimento",
      titulo: "Investimento e decisão",
      perguntas: [
        {
          id: "faixa",
          texto: "Qual a faixa de investimento pretendida?",
          tipo: "escolha",
          opcoes: [
            "Até 30 mil",
            "30 a 60 mil",
            "60 a 120 mil",
            "120 a 250 mil",
            "Acima de 250 mil",
            "Prefere não dizer",
          ],
          essencial: true,
        },
        {
          id: "pagamento",
          texto: "Como pretende pagar?",
          tipo: "multipla",
          opcoes: ["À vista", "Cartão", "Boleto parcelado", "Financiamento", "Consórcio"],
        },
        {
          id: "decisor",
          texto: "Quem assina e decide?",
          ajuda: "evita apresentar proposta para quem não decide",
          tipo: "texto",
          essencial: true,
        },
        {
          id: "ja-comprou",
          texto: "Já comprou planejados antes?",
          tipo: "simNao",
        },
        {
          id: "experiencia",
          texto: "O que gostou e o que não gostou da experiência anterior?",
          ajuda: "a resposta costuma entregar a objeção que vem depois",
          tipo: "texto",
        },
        {
          id: "concorrencia",
          texto: "Está cotando com mais alguém?",
          tipo: "simNao",
        },
      ],
    },
    {
      id: "estilo",
      titulo: "Estilo",
      perguntas: [
        {
          id: "estilo",
          texto: "Que estilo te agrada?",
          tipo: "multipla",
          opcoes: [
            "Clean / minimalista",
            "Amadeirado",
            "Industrial",
            "Clássico",
            "Contemporâneo",
            "Colorido",
          ],
        },
        {
          id: "tons",
          texto: "Tons preferidos",
          tipo: "multipla",
          opcoes: ["Claros", "Neutros e terrosos", "Escuros", "Preto e branco", "Coloridos"],
        },
        {
          id: "acabamento",
          texto: "Acabamento preferido",
          tipo: "multipla",
          opcoes: ["Texturizado (TX)", "Liso / matte", "Laca", "Ripado", "Vidro"],
        },
        {
          id: "referencias",
          texto: "Tem referências salvas?",
          ajuda: "Pinterest, Instagram, fotos no celular — peça para mandar hoje",
          tipo: "texto",
        },
        {
          id: "nao-quero",
          texto: "Tem alguma coisa que você já sabe que NÃO quer?",
          ajuda: "costuma valer mais que a lista do que quer",
          tipo: "texto",
        },
      ],
    },
  ],

  ambientes: [
    /* ── cozinha ───────────────────────────────────────────────────────── */
    {
      id: "cozinha",
      nome: "Cozinha",
      secoes: [
        {
          id: "uso",
          titulo: "Uso",
          perguntas: [
            {
              id: "quem-cozinha",
              texto: "Quem cozinha e com que frequência?",
              ajuda: "define bancada, torre quente e quantidade de gaveta",
              tipo: "texto",
            },
            {
              id: "lugares",
              texto: "Quantas pessoas sentam para comer?",
              tipo: "numero",
              unidade: "pessoas",
            },
          ],
        },
        {
          id: "eletros",
          titulo: "Eletrodomésticos",
          perguntas: [
            {
              id: "eletros",
              texto: "Quais eletros vão ser embutidos?",
              tipo: "multipla",
              opcoes: [
                "Cooktop a gás",
                "Cooktop elétrico / indução",
                "Forno de embutir",
                "Micro-ondas",
                "Coifa",
                "Depurador",
                "Lava-louças",
                "Adega",
                "Purificador",
                "Frigobar",
              ],
              essencial: true,
            },
            {
              id: "geladeira",
              texto: "Modelo e medidas da geladeira",
              ajuda: "o vão da geladeira é a medida que mais trava projeto",
              tipo: "texto",
              essencial: true,
            },
            { id: "torre-quente", texto: "Vai ter torre quente?", tipo: "simNao" },
            { id: "despenseiro", texto: "Vai ter despenseiro?", tipo: "simNao" },
          ],
        },
        {
          id: "layout",
          titulo: "Bancada e layout",
          perguntas: [
            {
              id: "formato",
              texto: "Formato da cozinha",
              tipo: "escolha",
              opcoes: ["Linear", "Em L", "Em U", "Com ilha", "Com península"],
            },
            {
              id: "bancada",
              texto: "Material da bancada",
              tipo: "escolha",
              opcoes: ["Granito", "Quartzo", "Porcelanato", "Inox", "Ainda não definido"],
            },
            {
              id: "cuba",
              texto: "Tipo de cuba",
              tipo: "escolha",
              opcoes: ["Sobrepor", "Embutida", "Gourmet", "Dupla"],
            },
          ],
        },
        {
          id: "marcenaria",
          titulo: "Marcenaria",
          perguntas: [
            {
              id: "abertura",
              texto: "Tipo de abertura das portas",
              tipo: "multipla",
              opcoes: ["Giro", "Correr", "Basculante", "Gaveta", "Tip-on"],
              essencial: true,
            },
            {
              id: "puxador",
              texto: "Tipo de puxador",
              tipo: "escolha",
              opcoes: [
                "Perfil de alumínio",
                "Cava usinada",
                "Alça aparente",
                "Tip-on / sem puxador",
              ],
              essencial: true,
            },
            {
              id: "gavetas",
              texto: "Quantas gavetas, aproximadamente?",
              tipo: "numero",
              unidade: "gavetas",
            },
            { id: "led", texto: "Fita de LED sob os aéreos?", tipo: "simNao" },
            {
              id: "organizadores",
              texto: "Organizadores internos",
              tipo: "multipla",
              opcoes: [
                "Lixeira embutida",
                "Porta-temperos",
                "Secador de louças",
                "Divisor de talheres",
                "Porta-panelas",
              ],
            },
          ],
        },
      ],
    },

    /* ── dormitório ────────────────────────────────────────────────────── */
    {
      id: "dormitorio",
      nome: "Dormitório",
      secoes: [
        {
          id: "uso",
          titulo: "Uso",
          perguntas: [
            { id: "quem-usa", texto: "Quem usa o dormitório?", tipo: "texto" },
            {
              id: "cama",
              texto: "Tamanho da cama",
              tipo: "escolha",
              opcoes: ["Solteiro", "Casal", "Queen", "King", "Ainda não definido"],
              essencial: true,
            },
          ],
        },
        {
          id: "guarda-roupa",
          titulo: "Guarda-roupa",
          perguntas: [
            {
              id: "portas",
              texto: "Quantas portas o guarda-roupa vai ter?",
              tipo: "numero",
              unidade: "portas",
              essencial: true,
            },
            {
              id: "tipo-porta",
              texto: "Portas de correr ou de giro?",
              tipo: "escolha",
              opcoes: ["Correr", "Giro", "Misto"],
              essencial: true,
            },
            { id: "espelho", texto: "Espelho no guarda-roupa?", tipo: "simNao" },
            {
              id: "interno",
              texto: "Divisão interna",
              tipo: "multipla",
              opcoes: [
                "Cabideiro curto",
                "Cabideiro longo",
                "Gavetas internas",
                "Sapateira",
                "Calceiro",
                "Porta-gravatas",
                "Nicho de malas",
              ],
            },
          ],
        },
        {
          id: "resto",
          titulo: "Resto do quarto",
          perguntas: [
            {
              id: "cabeceira",
              texto: "Cabeceira ou painel?",
              tipo: "escolha",
              opcoes: ["Cabeceira estofada", "Painel ripado", "Painel liso", "Nenhum"],
            },
            { id: "tv", texto: "Painel de TV?", tipo: "simNao" },
            {
              id: "extras",
              texto: "Outros móveis",
              tipo: "multipla",
              opcoes: ["Criado-mudo", "Penteadeira", "Escrivaninha", "Baú / recamier"],
            },
            {
              id: "ar",
              texto: "Onde fica o ar-condicionado?",
              ajuda: "interfere na altura do armário",
              tipo: "texto",
            },
          ],
        },
      ],
    },

    /* ── closet ────────────────────────────────────────────────────────── */
    {
      id: "closet",
      nome: "Closet",
      secoes: [
        {
          id: "formato",
          titulo: "Formato",
          perguntas: [
            {
              id: "tipo",
              texto: "Closet aberto ou fechado com portas?",
              tipo: "escolha",
              opcoes: ["Aberto", "Fechado com portas", "Portas de vidro"],
              essencial: true,
            },
            {
              id: "pessoas",
              texto: "Quantas pessoas vão usar?",
              tipo: "numero",
              unidade: "pessoas",
            },
            { id: "ilha", texto: "Ilha central com gavetas?", tipo: "simNao" },
          ],
        },
        {
          id: "modulos",
          titulo: "Módulos",
          perguntas: [
            {
              id: "modulos",
              texto: "Que módulos você precisa?",
              tipo: "multipla",
              opcoes: [
                "Cabideiro curto",
                "Cabideiro longo",
                "Gaveteiro",
                "Sapateira",
                "Nicho de bolsas",
                "Porta-joias",
                "Nicho de malas",
              ],
              essencial: true,
            },
            {
              id: "sapatos",
              texto: "Quantos pares de sapato, aproximadamente?",
              ajuda: "é o que dimensiona a sapateira, e sempre é mais do que dizem",
              tipo: "numero",
              unidade: "pares",
            },
            { id: "espelho", texto: "Espelho de corpo inteiro?", tipo: "simNao" },
            { id: "led", texto: "Iluminação em fita nos nichos?", tipo: "simNao" },
          ],
        },
      ],
    },

    /* ── home office ───────────────────────────────────────────────────── */
    {
      id: "home-office",
      nome: "Home office",
      secoes: [
        {
          id: "uso",
          titulo: "Uso",
          perguntas: [
            {
              id: "pessoas",
              texto: "Quantas pessoas usam ao mesmo tempo?",
              tipo: "numero",
              unidade: "pessoas",
              essencial: true,
            },
            {
              id: "uso",
              texto: "Uso principal",
              tipo: "escolha",
              opcoes: ["Trabalho integral", "Trabalho eventual", "Estudo", "Misto"],
            },
            {
              id: "chamada",
              texto: "Faz videochamada com a parede do fundo aparecendo?",
              ajuda: "muda o acabamento da parede de trás e a posição da estante",
              tipo: "simNao",
            },
          ],
        },
        {
          id: "bancada",
          titulo: "Bancada e armazenamento",
          perguntas: [
            {
              id: "comprimento",
              texto: "Comprimento aproximado da bancada",
              tipo: "numero",
              unidade: "m",
              essencial: true,
            },
            { id: "fio", texto: "Precisa de passagem de fio e tomada na bancada?", tipo: "simNao" },
            { id: "cpu", texto: "Tem CPU ou torre para acomodar?", tipo: "simNao" },
            {
              id: "armazenamento",
              texto: "Armazenamento",
              tipo: "multipla",
              opcoes: ["Estante aberta", "Nichos", "Armário fechado", "Gaveteiro", "Arquivo"],
            },
          ],
        },
      ],
    },

    /* ── lavanderia ────────────────────────────────────────────────────── */
    {
      id: "lavanderia",
      nome: "Lavanderia",
      secoes: [
        {
          id: "maquinas",
          titulo: "Máquinas",
          perguntas: [
            {
              id: "maquinas",
              texto: "Quais máquinas entram?",
              tipo: "multipla",
              opcoes: ["Lava-roupas", "Secadora", "Lava e seca", "Tanque"],
              essencial: true,
            },
            {
              id: "arranjo",
              texto: "Máquina e secadora empilhadas ou lado a lado?",
              tipo: "escolha",
              opcoes: ["Empilhadas", "Lado a lado", "Só uma máquina", "Não se aplica"],
              essencial: true,
            },
            {
              id: "medidas",
              texto: "Medidas das máquinas",
              ajuda: "igual à geladeira: é o vão que trava o projeto",
              tipo: "texto",
              essencial: true,
            },
          ],
        },
        {
          id: "armarios",
          titulo: "Armários",
          perguntas: [
            {
              id: "itens",
              texto: "O que precisa caber?",
              tipo: "multipla",
              opcoes: [
                "Armário aéreo",
                "Torre de produtos",
                "Guarda-vassoura",
                "Cesto de roupa",
                "Bancada de dobrar",
                "Varal embutido",
              ],
            },
            {
              id: "tanque",
              texto: "Tipo de tanque ou cuba",
              tipo: "escolha",
              opcoes: ["Tanque de louça", "Cuba em bancada", "Tanque inox", "Não vai ter"],
            },
            { id: "passar", texto: "Vai passar roupa aqui?", tipo: "simNao" },
          ],
        },
      ],
    },

    /* ── banheiro ──────────────────────────────────────────────────────── */
    {
      id: "banheiro",
      nome: "Banheiro",
      secoes: [
        {
          id: "identificacao",
          titulo: "Qual banheiro",
          perguntas: [
            {
              id: "tipo",
              texto: "Que banheiro é este?",
              tipo: "escolha",
              opcoes: ["Suíte", "Social", "Lavabo", "Serviço"],
              essencial: true,
            },
            {
              id: "umidade",
              texto: "O ambiente é muito úmido ou sem ventilação?",
              ajuda: "define se vai MDF hidrófugo",
              tipo: "simNao",
            },
          ],
        },
        {
          id: "gabinete",
          titulo: "Gabinete e espelho",
          perguntas: [
            {
              id: "gabinete",
              texto: "Gabinete suspenso ou apoiado?",
              tipo: "escolha",
              opcoes: ["Suspenso", "Apoiado no piso", "Não vai ter"],
            },
            {
              id: "cuba",
              texto: "Tipo de cuba",
              tipo: "escolha",
              opcoes: ["Apoio", "Embutida", "Esculpida", "Semi-encaixe"],
              essencial: true,
            },
            {
              id: "espelho",
              texto: "Espelho",
              tipo: "escolha",
              opcoes: [
                "Espelheira com armário",
                "Espelho simples",
                "Espelho com LED",
                "Não vai ter",
              ],
            },
            {
              id: "itens",
              texto: "O que mais entra?",
              tipo: "multipla",
              opcoes: ["Torre de toalhas", "Nicho no box", "Gaveteiro", "Prateleira", "Cesto"],
            },
          ],
        },
      ],
    },

    /* ── área gourmet ──────────────────────────────────────────────────── */
    {
      id: "area-gourmet",
      nome: "Área gourmet",
      secoes: [
        {
          id: "local",
          titulo: "O espaço",
          perguntas: [
            {
              id: "coberta",
              texto: "A área é coberta?",
              ajuda: "área descoberta muda o material do móvel inteiro",
              tipo: "simNao",
              essencial: true,
            },
            {
              id: "frequencia",
              texto: "Com que frequência você recebe?",
              tipo: "texto",
            },
            {
              id: "banquetas",
              texto: "Quantas banquetas?",
              tipo: "numero",
              unidade: "banquetas",
            },
          ],
        },
        {
          id: "equipamentos",
          titulo: "Equipamentos",
          perguntas: [
            {
              id: "churrasqueira",
              texto: "Tipo de churrasqueira",
              tipo: "escolha",
              opcoes: ["Alvenaria", "Pré-moldada", "A gás", "Elétrica", "Não vai ter"],
              essencial: true,
            },
            { id: "coifa", texto: "Vai ter coifa?", tipo: "simNao" },
            {
              id: "eletros",
              texto: "Eletros",
              tipo: "multipla",
              opcoes: [
                "Cervejeira",
                "Adega",
                "Frigobar",
                "Cooktop",
                "Forno de pizza",
                "Micro-ondas",
              ],
            },
            { id: "bancada", texto: "Bancada de apoio com cuba?", tipo: "simNao" },
          ],
        },
      ],
    },
  ],
};
