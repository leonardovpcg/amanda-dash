"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Contratos, recebimentos e meta.

   O evento que separa proposta de venda. Sem ele, "Faturado" mostrava zero em
   todo projeto, e Comissão e Financeiro seguiam com números de exemplo.

   Duas coisas que o schema já decidiu e que este módulo respeita:

   - **O valor do contrato é congelado na assinatura**, junto com um retrato
     do orçamento. Reajustar a tabela de preços não pode mudar contrato
     fechado — é a única quebra deliberada da regra "não guarde o que dá para
     calcular".
   - **"Vendido" é contrato assinado**, não proposta enviada. Se fosse a data
     de envio, a meta do mês mentiria.
   ═════════════════════════════════════════════════════════════════════════ */

import { supabase } from "@/lib/supabase/cliente";
import { criarArmazemDeColecao } from "@/lib/supabase/colecao";
import { lerSessao } from "@/lib/supabase/sessao";

export type Contrato = {
  id: string;
  projetoId: string;
  projeto: string;
  cliente: string;
  valor: number;
  assinadoEm: string;
  condicoes: string;
  garantiaMeses: number;
  /** Soma dos recebimentos das parcelas deste contrato. */
  recebido: number;
  taxa: number;
  comissao: number;
  situacao: "prevista" | "a liberar" | "recebida";
};

type LinhaComissao = {
  contrato_id: string;
  projeto: string;
  cliente: string;
  valor: number | null;
  assinado_em: string;
  taxa: number | null;
  comissao: number | null;
  recebido: number | null;
  situacao: Contrato["situacao"];
};

const armazem = criarArmazemDeColecao<Contrato>(async () => {
  if (!supabase) return { dados: null, erro: null };

  // A view já aplica a faixa de comissão e classifica a situação pelo quanto
  // entrou; aqui só falta o que ela não carrega (projeto_id, condições).
  const [comissoes, contratos] = await Promise.all([
    supabase
      .from("v_comissoes")
      .select("contrato_id, projeto, cliente, valor, assinado_em, taxa, comissao, recebido, situacao")
      .order("assinado_em", { ascending: false }),
    supabase.from("contratos").select("id, projeto_id, condicoes, garantia_meses"),
  ]);

  const falha = comissoes.error ?? contratos.error;
  if (falha) return { dados: null, erro: "Não foi possível carregar os contratos: " + falha.message };

  const extra = new Map(
    (contratos.data ?? []).map((c) => [
      c.id as string,
      c as { id: string; projeto_id: string; condicoes: string | null; garantia_meses: number },
    ]),
  );

  const dados = (comissoes.data as unknown as LinhaComissao[]).map((c) => ({
    id: c.contrato_id,
    projetoId: extra.get(c.contrato_id)?.projeto_id ?? "",
    projeto: c.projeto,
    cliente: c.cliente,
    valor: Number(c.valor ?? 0),
    assinadoEm: c.assinado_em,
    condicoes: extra.get(c.contrato_id)?.condicoes ?? "",
    garantiaMeses: extra.get(c.contrato_id)?.garantia_meses ?? 60,
    recebido: Number(c.recebido ?? 0),
    taxa: Number(c.taxa ?? 0),
    comissao: Number(c.comissao ?? 0),
    situacao: c.situacao,
  }));
  return { dados, erro: null };
});

export const lerContratos = armazem.ler;
export const lerContratosNoServidor = armazem.lerNoServidor;
export const assinarContratos = armazem.assinar;
export const lerStatusContratos = armazem.lerStatus;
export const lerStatusContratosNoServidor = armazem.lerStatusNoServidor;
export const recarregarContratos = armazem.recarregar;

/**
 * Assina o contrato do projeto.
 *
 * `orcamentoSnapshot` guarda o que foi vendido: sem ele, reajustar a tabela
 * de preços tornaria a proposta assinada irreproduzível.
 */
export async function assinarContrato(dados: {
  projetoId: string;
  valor: number;
  assinadoEm: string;
  condicoes?: string;
  orcamentoSnapshot?: unknown;
}): Promise<string | null> {
  const dono = lerSessao().sessao?.user.id;
  if (!supabase || !dono) return "Sem sessão.";

  return armazem.escrever(async () =>
    supabase!.from("contratos").insert({
      dono,
      projeto_id: dados.projetoId,
      valor: dados.valor,
      assinado_em: dados.assinadoEm,
      condicoes: dados.condicoes?.trim() || null,
      orcamento_snapshot: dados.orcamentoSnapshot ?? null,
    }),
  );
}

export async function apagarContrato(id: string): Promise<string | null> {
  if (!supabase) return "Sem conexão.";
  return armazem.escrever(async () => supabase!.from("contratos").delete().eq("id", id));
}

/**
 * Dá baixa numa parcela: o dinheiro entrou.
 *
 * Recebe a parcela pronta, não a cria. Antes fazia as duas coisas de uma vez,
 * o que impedia planejar o parcelamento antes de o dinheiro entrar — e é
 * exatamente esse plano que ela combina com o cliente na assinatura.
 *
 * O valor é separado do valor da parcela de propósito: cliente paga a menos,
 * paga em duas vezes, paga com desconto. A parcela só fica quitada quando a
 * soma das baixas alcança o previsto.
 */
export async function registrarRecebimento(dados: {
  parcelaId: string;
  valor: number;
  recebidoEm: string;
  forma?: string;
}): Promise<string | null> {
  const dono = lerSessao().sessao?.user.id;
  if (!supabase || !dono) return "Sem sessão.";
  if (!(dados.valor > 0)) return "Informe o valor recebido.";

  const erro = await entradas.escrever(async () =>
    supabase!.from("recebimentos").insert({
      dono,
      parcela_id: dados.parcelaId,
      valor: dados.valor,
      recebido_em: dados.recebidoEm,
      forma: dados.forma?.trim() || null,
    }),
  );
  // Três armazéns olham para o mesmo dinheiro: a parcela para saber se
  // quitou, o contrato para o "Faturado" e a comissão. Sem recarregar, cada
  // tela mostraria um total diferente até a próxima carga.
  if (!erro) await Promise.all([parcelas.recarregar(), armazem.recarregar()]);
  return erro;
}

/* ── parcelas ──────────────────────────────────────────────────────────────

   Planejar e receber deixaram de ser o mesmo gesto.

   `registrarRecebimento` criava a parcela e a baixa na mesma chamada, porque
   não havia tela para planejar o parcelamento — o que impedia justamente o
   que ela pediu: dizer "entrada na assinatura, 30 dias depois a segunda,
   entrega a terceira" antes de qualquer dinheiro entrar.

   Agora a parcela nasce no projeto, ao fechar o contrato, e a baixa acontece
   depois — no Financeiro, onde ela vê tudo que está para receber de todos os
   projetos, ou no próprio projeto quando já estiver com ele aberto. É a mesma
   função nos dois lugares, não duas listas que podem discordar.
   ═══════════════════════════════════════════════════════════════════════ */

export type Parcela = {
  id: string;
  contratoId: string;
  projetoId: string;
  projeto: string;
  cliente: string;
  numero: number;
  valor: number;
  /** "2026-09-18" */
  venceEm: string;
  /** Soma do que já entrou nesta parcela. */
  recebido: number;
  /** Quitada quando o recebido alcança o valor. */
  quitada: boolean;
};

const parcelas = criarArmazemDeColecao<Parcela>(async () => {
  if (!supabase) return { dados: null, erro: null };
  // `!inner` no contrato e no projeto porque parcela sem contrato não existe;
  // `recebimentos` fica solto, que é o caso normal de uma parcela em aberto.
  const { data, error } = await supabase
    .from("parcelas")
    .select(
      "id, contrato_id, numero, valor, vence_em, contratos!inner(projeto_id, projetos!inner(nome, clientes!inner(nome))), recebimentos(valor)",
    )
    .order("vence_em");
  if (error) return { dados: null, erro: "Não foi possível carregar as parcelas: " + error.message };

  type Linha = {
    id: string;
    contrato_id: string;
    numero: number;
    valor: number;
    vence_em: string;
    contratos: { projeto_id: string; projetos: { nome: string; clientes: { nome: string } } };
    recebimentos: { valor: number }[];
  };
  const dados = (data as unknown as Linha[]).map((p) => {
    const valor = Number(p.valor);
    const recebido = p.recebimentos.reduce((t, r) => t + Number(r.valor), 0);
    return {
      id: p.id,
      contratoId: p.contrato_id,
      projetoId: p.contratos.projeto_id,
      projeto: p.contratos.projetos.nome,
      cliente: p.contratos.projetos.clientes.nome,
      numero: p.numero,
      valor,
      venceEm: p.vence_em,
      recebido,
      // Centavo de folga: soma de decimais não fecha exata, e uma parcela
      // paga por R$ 0,004 a menos não pode ficar aberta para sempre.
      quitada: recebido >= valor - 0.01,
    };
  });
  return { dados, erro: null };
});

export const lerParcelas = parcelas.ler;
export const lerParcelasNoServidor = parcelas.lerNoServidor;
export const assinarParcelas = parcelas.assinar;
export const lerStatusParcelas = parcelas.lerStatus;
export const lerStatusParcelasNoServidor = parcelas.lerStatusNoServidor;

/** Uma parcela prevista: valor e vencimento, sem dinheiro nenhum ainda. */
export async function criarParcela(dados: {
  contratoId: string;
  numero: number;
  valor: number;
  venceEm: string;
}): Promise<string | null> {
  const dono = lerSessao().sessao?.user.id;
  if (!supabase || !dono) return "Sem sessão.";
  if (!(dados.valor > 0)) return "Informe o valor da parcela.";
  if (!dados.venceEm) return "Escolha o vencimento.";
  return parcelas.escrever(async () =>
    supabase!.from("parcelas").insert({
      dono,
      contrato_id: dados.contratoId,
      numero: dados.numero,
      valor: dados.valor,
      vence_em: dados.venceEm,
    }),
  );
}

/** Apaga a parcela. As baixas dela caem junto, por `on delete cascade`. */
export async function apagarParcela(id: string): Promise<string | null> {
  if (!supabase) return "Sem conexão.";
  const erro = await parcelas.escrever(async () =>
    supabase!.from("parcelas").delete().eq("id", id),
  );
  if (!erro) await Promise.all([entradas.recarregar(), armazem.recarregar()]);
  return erro;
}

/* ── recebimentos ──────────────────────────────────────────────────────── */

export type Recebimento = {
  id: string;
  /** A parcela que nasceu junto — apagar a entrada apaga as duas. */
  parcelaId: string;
  contratoId: string;
  numero: number;
  valor: number;
  recebidoEm: string;
  forma: string;
};

const entradas = criarArmazemDeColecao<Recebimento>(async () => {
  if (!supabase) return { dados: null, erro: null };
  // `!inner` porque recebimento sem parcela não existe — e é a parcela que
  // sabe de qual contrato ele é.
  const { data, error } = await supabase
    .from("recebimentos")
    .select("id, valor, recebido_em, forma, parcela_id, parcelas!inner(contrato_id, numero)")
    .order("recebido_em", { ascending: false });
  if (error) {
    return { dados: null, erro: "Não foi possível carregar os recebimentos: " + error.message };
  }

  type Linha = {
    id: string;
    parcela_id: string;
    valor: number;
    recebido_em: string;
    forma: string | null;
    parcelas: { contrato_id: string; numero: number };
  };
  const dados = (data as unknown as Linha[]).map((r) => ({
    id: r.id,
    parcelaId: r.parcela_id,
    contratoId: r.parcelas.contrato_id,
    numero: r.parcelas.numero,
    valor: Number(r.valor),
    recebidoEm: r.recebido_em,
    forma: r.forma ?? "",
  }));
  return { dados, erro: null };
});

export const lerRecebimentos = entradas.ler;
export const lerRecebimentosNoServidor = entradas.lerNoServidor;
export const assinarRecebimentos = entradas.assinar;

/**
 * Desfaz a baixa: apaga só o recebimento, e a parcela volta a ficar em
 * aberto.
 *
 * Antes apagava a parcela junto, porque as duas nasciam no mesmo gesto e
 * deixar a parcela órfã inventaria uma cobrança que nunca existiu. Agora a
 * parcela é o plano combinado com o cliente — desfazer um lançamento errado
 * não pode apagar o plano.
 */
export async function apagarRecebimento(id: string): Promise<string | null> {
  if (!supabase) return "Sem conexão.";
  const erro = await entradas.escrever(async () =>
    supabase!.from("recebimentos").delete().eq("id", id),
  );
  if (!erro) await Promise.all([parcelas.recarregar(), armazem.recarregar()]);
  return erro;
}

/* ── faixas de comissão ────────────────────────────────────────────────── */

export type FaixaDeComissao = {
  id: string;
  de: number;
  /** Nulo = sem teto. */
  ate: number | null;
  taxa: number;
};

const faixas = criarArmazemDeColecao<FaixaDeComissao>(async () => {
  if (!supabase) return { dados: null, erro: null };
  const { data, error } = await supabase
    .from("faixas_comissao")
    .select("id, de, ate, taxa")
    .order("de");
  if (error) return { dados: null, erro: "Não foi possível carregar a comissão: " + error.message };
  const dados = (data as unknown as { id: string; de: number; ate: number | null; taxa: number }[]).map(
    (f) => ({ id: f.id, de: Number(f.de), ate: f.ate === null ? null : Number(f.ate), taxa: Number(f.taxa) }),
  );
  return { dados, erro: null };
});

export const lerFaixas = faixas.ler;
export const lerFaixasNoServidor = faixas.lerNoServidor;
export const assinarFaixas = faixas.assinar;

/**
 * A taxa que vale para um valor de venda.
 *
 * Mesma regra do `left join` de `v_comissoes`: intervalo fechado embaixo e
 * aberto em cima, para R$ 100.000 não cair em duas faixas ao mesmo tempo.
 * Devolve zero quando não há faixa — número inventado seria pior que um zero
 * que ela nota na tela.
 */
export function taxaDaFaixa(lista: FaixaDeComissao[], valor: number): number {
  return lista.find((f) => valor >= f.de && (f.ate === null || valor < f.ate))?.taxa ?? 0;
}

/* ── meta do mês ───────────────────────────────────────────────────────── */

export type MetaDoMes = {
  /** "2026-08" */
  mes: string;
  meta: number;
  vendido: number;
  pct: number;
  falta: number;
};

const metas = criarArmazemDeColecao<MetaDoMes>(async () => {
  if (!supabase) return { dados: null, erro: null };
  const { data, error } = await supabase
    .from("v_meta_mes")
    .select("ano_mes, meta, vendido, pct, falta")
    .order("ano_mes", { ascending: false });
  if (error) return { dados: null, erro: "Não foi possível carregar a meta: " + error.message };
  const dados = (data as unknown as {
    ano_mes: string;
    meta: number;
    vendido: number;
    pct: number;
    falta: number;
  }[]).map((m) => ({
    mes: m.ano_mes.slice(0, 7),
    meta: Number(m.meta),
    vendido: Number(m.vendido),
    pct: Number(m.pct),
    falta: Number(m.falta),
  }));
  return { dados, erro: null };
});

export const lerMetas = metas.ler;
export const lerMetasNoServidor = metas.lerNoServidor;
export const assinarMetas = metas.assinar;
export const lerStatusMetas = metas.lerStatus;
export const lerStatusMetasNoServidor = metas.lerStatusNoServidor;

/** Define a meta de um mês. `mes` no formato "2026-08". */
export async function definirMeta(mes: string, valor: number): Promise<string | null> {
  const dono = lerSessao().sessao?.user.id;
  if (!supabase || !dono) return "Sem sessão.";
  if (!(valor > 0)) return "A meta precisa ser maior que zero.";
  return metas.escrever(async () =>
    supabase!
      .from("metas")
      // `ano_mes` guarda o primeiro dia do mês — o schema exige, para dar
      // para comparar e ordenar sem gambiarra de texto.
      .upsert({ dono, ano_mes: mes + "-01", valor }, { onConflict: "dono,ano_mes" }),
  );
}

export async function apagarMeta(mes: string): Promise<string | null> {
  if (!supabase) return "Sem conexão.";
  return metas.escrever(async () =>
    supabase!.from("metas").delete().eq("ano_mes", mes + "-01"),
  );
}
