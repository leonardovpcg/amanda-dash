/* ═══════════════════════════════════════════════════════════════════════════
   O que o resto do dashboard tira do orçamento.

   Estas funções não conhecem os tipos do dashboard de propósito: recebem a
   lista de ambientes e devolvem formas cruas. Quem adapta para `Project`,
   `BudgetCat` e `Material` é a camada de cima — assim o módulo de orçamento
   continua podendo ser testado sozinho.
   ═════════════════════════════════════════════════════════════════════════ */

import { calcularProjeto } from "./calculo";
import { CATALOGO_PADRAO, type Catalogo } from "./catalogo";
import type { BlocoId, OrcamentoAmbiente } from "./tipos";

/** Um projeto só tem orçamento quando alguém lançou alguma linha nele. */
export function temOrcamento(orcamento: OrcamentoAmbiente[]): boolean {
  return orcamento.some(
    (a) => a.chapas.length || a.fita.length || a.acessorios.length || a.maoDeObra.length,
  );
}

/**
 * Valor de contrato do projeto.
 *
 * Com orçamento lançado, é o total com ART — o número que ela passa para o
 * cliente. Sem orçamento, continua sendo o valor digitado no cabeçalho, que é
 * como todos os projetos funcionavam antes deste módulo.
 */
export function valorDeContrato(
  orcamento: OrcamentoAmbiente[],
  digitado: number,
  cat: Catalogo = CATALOGO_PADRAO,
): number {
  if (!temOrcamento(orcamento)) return digitado;
  return calcularProjeto(orcamento, cat).totalComArt;
}

export type Composicao = {
  id: BlocoId;
  label: string;
  custo: number;
  venda: number;
  /** Margem sobre a venda, de 0 a 1 — é o que a barra do painel desenha. */
  margem: number;
};

/**
 * Composição do orçamento por bloco.
 *
 * Substitui o painel "Orçamento por categoria" quando há orçamento: em vez de
 * orçado × gasto por categoria inventada, mostra custo × venda por bloco, que
 * é a conta que ela realmente faz.
 */
export function composicao(
  orcamento: OrcamentoAmbiente[],
  cat: Catalogo = CATALOGO_PADRAO,
): Composicao[] {
  const proj = calcularProjeto(orcamento, cat);
  const ordem: BlocoId[] = ["chapas", "fita", "acessorios", "maoDeObra"];
  return ordem.map((id) => {
    const custo = proj.ambientes.reduce((s, a) => s + a.blocos[id].custo, 0);
    const venda = proj.ambientes.reduce((s, a) => s + a.blocos[id].venda, 0);
    return {
      id,
      label: proj.ambientes[0]?.blocos[id].titulo ?? id,
      custo: Math.round(custo * 100) / 100,
      venda: Math.round(venda * 100) / 100,
      margem: venda ? (venda - custo) / venda : 0,
    };
  });
}

export type ItemDeMaterial = {
  nome: string;
  spec: string;
  categoria: string;
  qtd: string;
  unitario: number;
  total: number;
};

/**
 * As linhas do orçamento como lista de compras.
 *
 * Agrupa item igual entre ambientes — a fábrica quer saber quantas dobradiças
 * Blum o projeto inteiro precisa, não quantas cabem em cada quarto. O valor é
 * o de custo: esta lista é o que se compra, não o que se vende.
 */
export function materiais(
  orcamento: OrcamentoAmbiente[],
  cat: Catalogo = CATALOGO_PADRAO,
): ItemDeMaterial[] {
  const proj = calcularProjeto(orcamento, cat);
  const juntos = new Map<string, ItemDeMaterial & { qntNum: number; unidade: string }>();

  for (const amb of proj.ambientes) {
    for (const id of ["chapas", "fita", "acessorios", "maoDeObra"] as BlocoId[]) {
      const b = amb.blocos[id];
      for (const l of b.linhas) {
        if (!l.qnt) continue;
        const chave = b.titulo + "|" + l.nome + "|" + l.detalhe;
        const atual = juntos.get(chave);
        if (atual) {
          atual.qntNum += l.qnt;
          atual.total += l.custo;
        } else {
          juntos.set(chave, {
            nome: l.nome,
            spec: l.detalhe || b.titulo,
            categoria: b.titulo,
            qtd: "",
            unitario: l.custoUnitario,
            total: l.custo,
            qntNum: l.qnt,
            unidade: l.unidade,
          });
        }
      }
    }
  }

  return [...juntos.values()].map((i) => ({
    nome: i.nome,
    spec: i.spec,
    categoria: i.categoria,
    qtd: `${i.qntNum.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${i.unidade}`,
    unitario: i.unitario,
    total: Math.round(i.total * 100) / 100,
  }));
}
