/* ═══════════════════════════════════════════════════════════════════════════
   Motor de cálculo do orçamento.

   Funções puras: recebem o ambiente e o catálogo, devolvem os números. Nada de
   estado, nada de React — dá para testar no nó e comparar com a planilha.

   Cada bloco soma o array inteiro. Na planilha as somas eram faixas fixas
   (`SUM(D5:D12)`) e desalinharam sozinhas quando alguém inseriu uma linha: a
   cozinha perdia a primeira chapa e a mão de obra somava cinco de sete linhas.
   ═════════════════════════════════════════════════════════════════════════ */

import { CATALOGO_PADRAO, type Catalogo } from "./catalogo";
import { nomeCor } from "./tabela";
import type {
  Acessorio,
  Alerta,
  AmbienteCalculado,
  BlocoCalculado,
  BlocoId,
  CorChapa,
  LinhaCalculada,
  OrcamentoAmbiente,
  ProjetoCalculado,
  ServicoMaoDeObra,
} from "./tipos";

const TITULOS: Record<BlocoId, string> = {
  chapas: "Chapas",
  fita: "Fita de borda",
  acessorios: "Acessórios",
  maoDeObra: "Mão de obra",
};

const soma = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

/**
 * Arredonda para centavos.
 *
 * O Excel carregava o float inteiro e só arredondava na exibição, o que fazia
 * a cozinha fechar em 82.582,66399999999. Aqui o corte é no fim de cada bloco,
 * que é onde o valor vira dinheiro de verdade.
 */
const cents = (n: number) => Math.round(n * 100) / 100;

/* ── índice do catálogo ──────────────────────────────────────────────────
   O catálogo virou dado editável, então os mapas de busca não podem mais ser
   constantes de módulo. Ficam num WeakMap pela identidade do catálogo: enquanto
   ninguém salvar uma tabela nova, o índice é montado uma vez só. */

type Indice = {
  cores: Map<string, CorChapa>;
  acessorios: Map<string, Acessorio>;
  maoDeObra: Map<string, ServicoMaoDeObra>;
};

const indices = new WeakMap<Catalogo, Indice>();

function indexar(cat: Catalogo): Indice {
  const pronto = indices.get(cat);
  if (pronto) return pronto;
  const novo: Indice = {
    cores: new Map(cat.cores.map((c) => [c.id, c])),
    acessorios: new Map(cat.acessorios.map((a) => [a.id, a])),
    maoDeObra: new Map(cat.maoDeObra.map((s) => [s.id, s])),
  };
  indices.set(cat, novo);
  return novo;
}

function bloco(id: BlocoId, linhas: LinhaCalculada[], markup: number): BlocoCalculado {
  const custo = cents(soma(linhas.map((l) => l.custo)));
  return { id, titulo: TITULOS[id], linhas, custo, markup, venda: cents(custo * markup) };
}

export function calcularAmbiente(
  amb: OrcamentoAmbiente,
  cat: Catalogo = CATALOGO_PADRAO,
): AmbienteCalculado {
  const ix = indexar(cat);
  const markups = cat.markups;
  const alertas: Alerta[] = [];
  const avisar = (bloco: BlocoId, linha: number, codigo: Alerta["codigo"], texto: string) =>
    alertas.push({ bloco, linha, codigo, texto });

  // ── chapas ─────────────────────────────────────────────────────────────
  const chapas: LinhaCalculada[] = amb.chapas.map((l, i) => {
    const cor = ix.cores.get(l.corId);
    if (!cor) {
      avisar("chapas", i, "item-desconhecido", `Cor "${l.corId}" não está na tabela de valores.`);
      return {
        nome: l.corId,
        detalhe: `${l.espessura} mm`,
        qnt: l.qnt,
        unidade: "chapa",
        custoUnitario: 0,
        custo: 0,
      };
    }
    const preco = cor.precos[l.espessura];
    if (preco === undefined) {
      avisar("chapas", i, "sem-preco", `${nomeCor(cor)} não é cotada em ${l.espessura} mm.`);
    } else if (!l.qnt) {
      avisar("chapas", i, "sem-quantidade", `${nomeCor(cor)} ${l.espessura} mm está sem quantidade.`);
    }
    return {
      nome: nomeCor(cor),
      detalhe: `${l.espessura} mm`,
      qnt: l.qnt,
      unidade: "chapa",
      custoUnitario: preco ?? 0,
      custo: (preco ?? 0) * l.qnt,
    };
  });

  // ── fita de borda ──────────────────────────────────────────────────────
  // A cor da fita é só rótulo: o custo é por metro, igual para todas. Na
  // planilha era texto livre e o mesmo tom aparecia como "BETON", "BETTON" e
  // "BETON MATT (ARAUCO)"; aqui aponta para a mesma cor de chapa.
  const fita: LinhaCalculada[] = amb.fita.map((l, i) => {
    const cor = ix.cores.get(l.corId);
    if (!cor) {
      avisar("fita", i, "item-desconhecido", `Cor "${l.corId}" não está na tabela de valores.`);
    } else if (!l.metros) {
      avisar("fita", i, "sem-quantidade", `Fita ${nomeCor(cor)} está sem metragem.`);
    }
    return {
      nome: cor ? nomeCor(cor) : l.corId,
      detalhe: "fita de borda",
      qnt: l.metros,
      unidade: "m",
      custoUnitario: cat.fitaPorMetro,
      custo: cat.fitaPorMetro * l.metros,
    };
  });

  // ── acessórios ─────────────────────────────────────────────────────────
  const acessorios: LinhaCalculada[] = amb.acessorios.map((l, i) => {
    const item = ix.acessorios.get(l.acessorioId);
    if (!item) {
      avisar(
        "acessorios",
        i,
        "item-desconhecido",
        `Acessório "${l.acessorioId}" não está na tabela de valores.`,
      );
      return { nome: l.acessorioId, detalhe: "", qnt: l.qnt, unidade: "un", custoUnitario: 0, custo: 0 };
    }
    if (!l.qnt) avisar("acessorios", i, "sem-quantidade", `${item.nome} está sem quantidade.`);
    return {
      nome: item.nome,
      detalhe: "",
      qnt: l.qnt,
      unidade: item.unidade,
      custoUnitario: item.custo,
      custo: item.custo * l.qnt,
    };
  });

  // ── mão de obra ────────────────────────────────────────────────────────
  // Único bloco com markup por item: usinagem sai a 3×, espelho e porta de
  // vidro a 2×. Por isso a venda é somada linha a linha, não no fim.
  const maoDeObraLinhas: LinhaCalculada[] = [];
  let maoDeObraVenda = 0;
  amb.maoDeObra.forEach((l, i) => {
    const s = ix.maoDeObra.get(l.servicoId);
    if (!s) {
      avisar("maoDeObra", i, "item-desconhecido", `Serviço "${l.servicoId}" não está no catálogo.`);
      maoDeObraLinhas.push({
        nome: l.servicoId,
        detalhe: "",
        qnt: l.qnt,
        unidade: "un",
        custoUnitario: 0,
        custo: 0,
      });
      return;
    }
    if (!l.qnt) avisar("maoDeObra", i, "sem-quantidade", `${s.nome} está sem quantidade.`);
    if (!s.custo) avisar("maoDeObra", i, "sem-preco", `${s.nome} ainda não tem custo cotado.`);
    maoDeObraVenda += s.custo * s.markup * l.qnt;
    maoDeObraLinhas.push({
      nome: s.nome,
      detalhe: s.markup === 1 ? "preço fechado" : `markup ${s.markup}×`,
      qnt: l.qnt,
      unidade: s.unidade,
      custoUnitario: s.custo,
      custo: s.custo * l.qnt,
    });
  });

  const blocos = {
    chapas: bloco("chapas", chapas, markups.chapas),
    fita: bloco("fita", fita, markups.fita),
    acessorios: bloco("acessorios", acessorios, markups.acessorios),
    maoDeObra: {
      ...bloco("maoDeObra", maoDeObraLinhas, 1),
      // markup 0 sinaliza "varia por item" — a UI mostra "por item".
      markup: 0,
      venda: cents(maoDeObraVenda),
    } as BlocoCalculado,
  };

  const total = cents(
    blocos.chapas.venda + blocos.fita.venda + blocos.acessorios.venda + blocos.maoDeObra.venda,
  );

  return {
    id: amb.id,
    nome: amb.nome,
    blocos,
    custoTotal: cents(
      blocos.chapas.custo + blocos.fita.custo + blocos.acessorios.custo + blocos.maoDeObra.custo,
    ),
    total,
    totalComArt: cents(total * markups.art),
    alertas,
  };
}

/**
 * Soma o projeto inteiro.
 *
 * Na planilha a aba "Resumo" era digitada à mão, sem fórmula — foi assim que o
 * ambiente "hall intimo" ficou de fora do total por R$ 11.957,66. Aqui o
 * resumo é sempre derivado da lista.
 */
export function calcularProjeto(
  ambientes: OrcamentoAmbiente[],
  cat: Catalogo = CATALOGO_PADRAO,
): ProjetoCalculado {
  const calculados = ambientes.map((a) => calcularAmbiente(a, cat));
  const total = cents(soma(calculados.map((a) => a.total)));
  return {
    ambientes: calculados,
    custoTotal: cents(soma(calculados.map((a) => a.custoTotal))),
    total,
    totalComArt: cents(total * cat.markups.art),
    alertas: soma(calculados.map((a) => a.alertas.length)),
  };
}

/** "R$ 1.234,56" — o orçamento precisa dos centavos que `money` descarta. */
export const brl = (n: number) =>
  "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Número sem símbolo, para campos editáveis. */
export const num = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
