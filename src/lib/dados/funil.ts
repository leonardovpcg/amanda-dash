"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Funil — clientes e leads, agora do banco.

   Veio junto com o briefing por obrigação: `briefings.lead_id` é chave
   estrangeira para `leads`, e não dá para gravar briefing de um lead que só
   existe na memória do navegador.

   O que muda de verdade em relação ao protótipo: **"parado há N dias" deixa
   de ser um número digitado**. Vem de `v_funil`, que calcula a diferença
   entre hoje e a última interação registrada — e se nunca houve contato,
   conta da abertura do lead.
   ═════════════════════════════════════════════════════════════════════════ */

import type { StageKey } from "@/lib/dashboard/data";
import { supabase } from "@/lib/supabase/cliente";
import { criarArmazemDeColecao } from "@/lib/supabase/colecao";
import { lerSessao } from "@/lib/supabase/sessao";
import { recarregarProjetos } from "./projetos";

export type LeadDoFunil = {
  id: string;
  clienteId: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  origem: string | null;
  etapa: StageKey;
  valorEstimado: number;
  ambientesTexto: string;
  diasParado: number;
};

type LinhaDaView = {
  id: string;
  cliente_id: string;
  cliente: string;
  etapa: StageKey;
  valor_estimado: number | null;
  ambientes_texto: string | null;
  dias_parado: number | null;
};

type Contato = { id: string; telefone: string | null; email: string | null; origem: string | null };

const armazem = criarArmazemDeColecao<LeadDoFunil>(async () => {
  if (!supabase) return { dados: null, erro: null };

  // Duas consultas em vez de uma: a view calcula o tempo parado mas não
  // carrega contato, e telefone errado na tela é pior que telefone ausente.
  const [funil, clientes] = await Promise.all([
    supabase
      .from("v_funil")
      .select("id, cliente_id, cliente, etapa, valor_estimado, ambientes_texto, dias_parado")
      .order("dias_parado", { ascending: false }),
    supabase.from("clientes").select("id, telefone, email, origem"),
  ]);

  const falha = funil.error ?? clientes.error;
  if (falha) return { dados: null, erro: "Não foi possível carregar o funil: " + falha.message };

  const contato = new Map((clientes.data ?? []).map((c) => [c.id as string, c as Contato]));

  const dados = (funil.data as LinhaDaView[]).map((l) => ({
    id: l.id,
    clienteId: l.cliente_id,
    nome: l.cliente,
    telefone: contato.get(l.cliente_id)?.telefone ?? null,
    email: contato.get(l.cliente_id)?.email ?? null,
    origem: contato.get(l.cliente_id)?.origem ?? null,
    etapa: l.etapa,
    valorEstimado: Number(l.valor_estimado ?? 0),
    ambientesTexto: l.ambientes_texto ?? "",
    diasParado: l.dias_parado ?? 0,
  }));
  return { dados, erro: null };
});

export const lerFunil = armazem.ler;
export const lerFunilNoServidor = armazem.lerNoServidor;
export const assinarFunil = armazem.assinar;
export const lerStatusFunil = armazem.lerStatus;
export const lerStatusFunilNoServidor = armazem.lerStatusNoServidor;
export const recarregarFunil = armazem.recarregar;

/* ── escritas ──────────────────────────────────────────────────────────── */

/**
 * Cria cliente e lead de uma vez, com o primeiro contato registrado.
 *
 * A interação de abertura não é enfeite: sem ela o lead nasceria contando
 * dias a partir da abertura, e o atendimento que acabou de acontecer não
 * apareceria no histórico.
 */
export async function criarAtendimento(dados: {
  nome: string;
  telefone?: string;
  origem?: string;
  ambientesTexto?: string;
  valorEstimado?: number;
}): Promise<string | null> {
  const dono = lerSessao().sessao?.user.id;
  if (!supabase || !dono) return "Sem sessão.";

  const { data: cliente, error: erroCliente } = await supabase
    .from("clientes")
    .insert({
      dono,
      nome: dados.nome.trim() || "Cliente sem nome",
      telefone: dados.telefone?.trim() || null,
      origem: dados.origem ?? null,
    })
    .select("id")
    .single();
  if (erroCliente) return "Não foi possível salvar o cliente: " + erroCliente.message;

  const { error: erroLead } = await supabase.from("leads").insert({
    dono,
    cliente_id: cliente.id,
    etapa: "lead",
    valor_estimado: dados.valorEstimado ?? null,
    ambientes_texto: dados.ambientesTexto ?? null,
  });
  if (erroLead) return "Não foi possível abrir o atendimento: " + erroLead.message;

  const { error: erroInteracao } = await supabase.from("interacoes").insert({
    dono,
    cliente_id: cliente.id,
    canal: dados.origem === "Loja" ? "loja" : "outro",
    nota: "Primeiro atendimento",
  });
  if (erroInteracao) return "Não foi possível registrar o contato: " + erroInteracao.message;

  await recarregarFunil();
  return null;
}

/**
 * Corrige o nome do cliente.
 *
 * Muda em todo lugar de uma vez — funil, projeto, contrato, garantia — porque
 * é a mesma pessoa em todos eles. Era esse o motivo de o campo estar
 * desligado no projeto, mas desligado ele era pior: aceitava a digitação e
 * descartava em silêncio, e ela não tinha por onde arrumar um nome escrito
 * errado no cadastro.
 *
 * Nome vazio é recusado em vez de gravado: cliente sem nome some das listas
 * que ordenam por ele.
 */
export async function renomearCliente(clienteId: string, nome: string): Promise<string | null> {
  if (!supabase) return "Sem conexão.";
  const limpo = nome.trim();
  if (!limpo) return null;
  const erro = await armazem.escrever(async () =>
    supabase!.from("clientes").update({ nome: limpo }).eq("id", clienteId),
  );
  // O projeto carrega o nome do cliente junto, então o armazém dele também
  // precisa reler — senão o funil mostra o nome novo e o projeto, o antigo.
  if (!erro) await recarregarProjetos();
  return erro;
}

/**
 * Move o lead de etapa.
 *
 * Registra a interação junto: mover a etapa **é** um contato, e sem isso o
 * lead que acabou de avançar continuaria contando dias parado desde o
 * contato anterior.
 */
export async function moverEtapa(
  leadId: string,
  clienteId: string,
  etapa: StageKey,
): Promise<string | null> {
  const dono = lerSessao().sessao?.user.id;
  if (!supabase || !dono) return "Sem sessão.";

  return armazem.escrever(async () => {
    const { error } = await supabase!
      .from("leads")
      .update({ etapa, fechado_em: etapa === "fechado" ? new Date().toISOString() : null })
      .eq("id", leadId);
    if (error) return { error };
    return supabase!
      .from("interacoes")
      .insert({ dono, cliente_id: clienteId, canal: "outro", nota: "Avançou para " + etapa });
  });
}

/** Contato avulso — o que zera o "parado há N dias". */
export async function registrarInteracao(
  clienteId: string,
  canal: string,
  nota: string,
): Promise<string | null> {
  const dono = lerSessao().sessao?.user.id;
  if (!supabase || !dono) return "Sem sessão.";
  return armazem.escrever(async () =>
    supabase!.from("interacoes").insert({ dono, cliente_id: clienteId, canal, nota }),
  );
}
