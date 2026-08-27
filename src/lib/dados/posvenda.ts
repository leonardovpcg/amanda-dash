"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Pós-venda: assistências, garantias e indicações.

   Das três, só a assistência é digitada. As outras duas são consequência:

   - **Garantia** conta da última montagem realizada e exige que *nenhum*
     ambiente esteja pendente — a cozinha ficar pronta não põe o projeto em
     garantia com o closet ainda na fábrica. Guardar "restam 58 meses" seria
     um número errado no dia seguinte, então é view.
   - **Indicação** é o cliente entregue há mais de 60 dias que ainda não
     indicou ninguém. Casa por id, não por nome: nome de cliente não é único
     nem estável.

   Isso significa que a lista de garantias fica vazia até um ambiente chegar
   a "Concluído" no cartão do projeto — é esse passo que grava a montagem.
   ═════════════════════════════════════════════════════════════════════════ */

import { supabase } from "@/lib/supabase/cliente";
import { criarArmazemDeColecao } from "@/lib/supabase/colecao";
import { lerSessao } from "@/lib/supabase/sessao";
import type { ToneName } from "@/lib/dashboard/data";

/* ── assistências ──────────────────────────────────────────────────────── */

export type SituacaoDaAssistencia = "aberta" | "peca_solicitada" | "agendada" | "resolvida";

export type Assistencia = {
  id: string;
  projetoId: string;
  projeto: string;
  cliente: string;
  ambiente: string;
  sintoma: string;
  abertaEm: string;
  prazo: string | null;
  situacao: SituacaoDaAssistencia;
  nota: string;
};

export const SITUACOES_DA_ASSISTENCIA: [SituacaoDaAssistencia, string, ToneName][] = [
  ["aberta", "Aberta", "sand"],
  ["peca_solicitada", "Peça solicitada", "clay"],
  ["agendada", "Agendada", "terracota"],
  ["resolvida", "Resolvida", "olive"],
];

const ROTULO_SITUACAO = new Map(SITUACOES_DA_ASSISTENCIA.map(([k, r]) => [k, r]));
const TOM_SITUACAO = new Map(SITUACOES_DA_ASSISTENCIA.map(([k, , t]) => [k, t]));

export const rotuloDaAssistencia = (s: string) => ROTULO_SITUACAO.get(s as SituacaoDaAssistencia) ?? s;
export const tomDaAssistencia = (s: string): ToneName =>
  TOM_SITUACAO.get(s as SituacaoDaAssistencia) ?? "sand";

const assistencias = criarArmazemDeColecao<Assistencia>(async () => {
  if (!supabase) return { dados: null, erro: null };
  // O nome do cliente vem pelo projeto: a assistência é do projeto, e um
  // segundo vínculo direto ao cliente seria a fonte que envelhece.
  const { data, error } = await supabase
    .from("assistencias")
    .select(
      "id, projeto_id, sintoma, aberta_em, prazo, situacao, nota, projetos!inner(nome, clientes!inner(nome)), ambientes(nome)",
    )
    .order("aberta_em", { ascending: false });
  if (error) {
    return { dados: null, erro: "Não foi possível carregar as assistências: " + error.message };
  }

  type Linha = {
    id: string;
    projeto_id: string;
    sintoma: string;
    aberta_em: string;
    prazo: string | null;
    situacao: SituacaoDaAssistencia;
    nota: string | null;
    projetos: { nome: string; clientes: { nome: string } };
    ambientes: { nome: string } | null;
  };
  const dados = (data as unknown as Linha[]).map((a) => ({
    id: a.id,
    projetoId: a.projeto_id,
    projeto: a.projetos.nome,
    cliente: a.projetos.clientes.nome,
    ambiente: a.ambientes?.nome ?? "",
    sintoma: a.sintoma,
    abertaEm: a.aberta_em,
    prazo: a.prazo,
    situacao: a.situacao,
    nota: a.nota ?? "",
  }));
  return { dados, erro: null };
});

export const lerAssistencias = assistencias.ler;
export const lerAssistenciasNoServidor = assistencias.lerNoServidor;
export const assinarAssistencias = assistencias.assinar;
export const lerStatusAssistencias = assistencias.lerStatus;
export const lerStatusAssistenciasNoServidor = assistencias.lerStatusNoServidor;

export async function abrirAssistencia(dados: {
  projetoId: string;
  ambienteId?: string | null;
  sintoma: string;
  prazo?: string | null;
}): Promise<string | null> {
  const dono = lerSessao().sessao?.user.id;
  if (!supabase || !dono) return "Sem sessão.";
  if (!dados.projetoId) return "Escolha o projeto.";
  if (!dados.sintoma.trim()) return "Descreva o problema.";
  return assistencias.escrever(async () =>
    supabase!.from("assistencias").insert({
      dono,
      projeto_id: dados.projetoId,
      ambiente_id: dados.ambienteId || null,
      sintoma: dados.sintoma.trim(),
      prazo: dados.prazo || null,
    }),
  );
}

/** `resolvida_em` acompanha a situação: as duas discordarem é o bug óbvio. */
export async function mudarSituacaoDaAssistencia(
  id: string,
  situacao: SituacaoDaAssistencia,
  hoje: string,
): Promise<string | null> {
  if (!supabase) return "Sem conexão.";
  return assistencias.escrever(async () =>
    supabase!
      .from("assistencias")
      .update({ situacao, resolvida_em: situacao === "resolvida" ? hoje : null })
      .eq("id", id),
  );
}

export async function apagarAssistencia(id: string): Promise<string | null> {
  if (!supabase) return "Sem conexão.";
  return assistencias.escrever(async () => supabase!.from("assistencias").delete().eq("id", id));
}

/* ── garantias ─────────────────────────────────────────────────────────── */

export type Garantia = {
  projetoId: string;
  projeto: string;
  cliente: string;
  entregueEm: string;
  venceEm: string;
  diasRestantes: number;
};

const garantias = criarArmazemDeColecao<Garantia>(async () => {
  if (!supabase) return { dados: null, erro: null };
  const { data, error } = await supabase
    .from("v_garantias")
    .select("projeto_id, projeto, cliente, entregue_em, vence_em, dias_restantes")
    .order("dias_restantes");
  if (error) return { dados: null, erro: "Não foi possível carregar as garantias: " + error.message };
  type Linha = {
    projeto_id: string;
    projeto: string;
    cliente: string;
    entregue_em: string;
    vence_em: string;
    dias_restantes: number;
  };
  const dados = (data as unknown as Linha[]).map((g) => ({
    projetoId: g.projeto_id,
    projeto: g.projeto,
    cliente: g.cliente,
    entregueEm: g.entregue_em,
    venceEm: g.vence_em,
    diasRestantes: Number(g.dias_restantes),
  }));
  return { dados, erro: null };
});

export const lerGarantias = garantias.ler;
export const lerGarantiasNoServidor = garantias.lerNoServidor;
export const assinarGarantias = garantias.assinar;

/* ── indicação e recompra ──────────────────────────────────────────────── */

export type Indicacao = {
  projetoId: string;
  projeto: string;
  clienteId: string;
  cliente: string;
  entregueEm: string;
  diasDesdeEntrega: number;
};

const indicacoes = criarArmazemDeColecao<Indicacao>(async () => {
  if (!supabase) return { dados: null, erro: null };
  const { data, error } = await supabase
    .from("v_indicacoes")
    .select("projeto_id, projeto, cliente_id, cliente, entregue_em, dias_desde_entrega")
    .order("dias_desde_entrega", { ascending: false });
  if (error) return { dados: null, erro: "Não foi possível carregar as indicações: " + error.message };
  type Linha = {
    projeto_id: string;
    projeto: string;
    cliente_id: string;
    cliente: string;
    entregue_em: string;
    dias_desde_entrega: number;
  };
  const dados = (data as unknown as Linha[]).map((i) => ({
    projetoId: i.projeto_id,
    projeto: i.projeto,
    clienteId: i.cliente_id,
    cliente: i.cliente,
    entregueEm: i.entregue_em,
    diasDesdeEntrega: Number(i.dias_desde_entrega),
  }));
  return { dados, erro: null };
});

export const lerIndicacoes = indicacoes.ler;
export const lerIndicacoesNoServidor = indicacoes.lerNoServidor;
export const assinarIndicacoes = indicacoes.assinar;
