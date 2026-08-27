/* ═══════════════════════════════════════════════════════════════════════════
   Consulta de preço.

   A busca antes devolvia "média de 5 fornecedores" de uma lista fixa de cinco
   materiais. Não havia fornecedor nenhum atrás daquilo — era número de
   protótipo com cara de pesquisa de mercado, que é o pior tipo de número
   inventado: parece apurado.

   Agora procura na tabela de valores dela, a mesma que orça. O preço que sai
   daqui é o que o cliente pagaria hoje se o item entrasse no orçamento —
   custo × markup —, então nunca discorda da proposta.
   ═════════════════════════════════════════════════════════════════════════ */

import type { Catalogo } from "./catalogo";
import { ESPESSURAS } from "./tipos";

export type AchadoDePreco = {
  id: string;
  nome: string;
  /** De onde veio: "Chapa", "Acessório", "Mão de obra", "Fita de borda". */
  bloco: string;
  unidade: string;
  custo: number;
  venda: number;
  markup: number;
};

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Procura por pedaço de nome, sem acento e sem caixa.
 *
 * Todos os termos precisam bater, em qualquer ordem: "off 18" acha
 * "Off White 18mm" sem achar "Branco 18mm". Buscar a frase inteira exigiria
 * digitar o nome exato, e ela lembra do item por pedaços.
 */
export function consultarPreco(cat: Catalogo, termo: string, limite = 8): AchadoDePreco[] {
  const partes = semAcento(termo).split(/\s+/).filter(Boolean);
  if (partes.length === 0) return [];
  const bate = (texto: string) => {
    const alvo = semAcento(texto);
    return partes.every((p) => alvo.includes(p));
  };

  const achados: AchadoDePreco[] = [];

  for (const cor of cat.cores) {
    for (const esp of ESPESSURAS) {
      const custo = cor.precos[esp];
      if (custo === undefined) continue;
      const rotulo = `${cor.nome} ${esp}mm ${cor.fabricante}`;
      if (!bate(rotulo)) continue;
      achados.push({
        id: `chapa:${cor.id}:${esp}`,
        nome: `${cor.nome} · ${esp} mm`,
        bloco: "Chapa",
        unidade: "por chapa",
        custo,
        venda: custo * cat.markups.chapas,
        markup: cat.markups.chapas,
      });
    }
  }

  for (const a of cat.acessorios) {
    if (!bate(a.nome)) continue;
    achados.push({
      id: `acessorio:${a.id}`,
      nome: a.nome,
      bloco: "Acessório",
      unidade: "por " + a.unidade,
      custo: a.custo,
      venda: a.custo * cat.markups.acessorios,
      markup: cat.markups.acessorios,
    });
  }

  for (const s of cat.maoDeObra) {
    if (!bate(s.nome)) continue;
    achados.push({
      id: `servico:${s.id}`,
      nome: s.nome,
      bloco: "Mão de obra",
      unidade: "por " + s.unidade,
      custo: s.custo,
      venda: s.custo * s.markup,
      markup: s.markup,
    });
  }

  if (bate("fita de borda")) {
    achados.push({
      id: "fita",
      nome: "Fita de borda",
      bloco: "Fita de borda",
      unidade: "por metro",
      custo: cat.fitaPorMetro,
      venda: cat.fitaPorMetro * cat.markups.fita,
      markup: cat.markups.fita,
    });
  }

  // Mais barato primeiro: procurar preço quase sempre é procurar a opção que
  // cabe no que o cliente aceitou pagar.
  return achados.sort((x, y) => x.venda - y.venda).slice(0, limite);
}
