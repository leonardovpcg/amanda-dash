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
import { criarProjeto, recarregarProjetos } from "./projetos";

export type LeadDoFunil = {
  id: string;
  clienteId: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  origem: string | null;
  etapa: StageKey;
  /**
   * A estimativa da abertura do atendimento.
   *
   * Registro de como o negócio nasceu. Quem manda no valor que aparece na
   * tela é o projeto — ele conhece a ordem certa: contrato assinado, senão
   * orçamento, senão valor previsto. Dois números para a mesma coisa foi o
   * que fez o funil mostrar valor e a aba Projetos mostrar zero.
   */
  valorEstimado: number;
  ambientesTexto: string;
  diasParado: number;
  /**
   * O projeto deste atendimento.
   *
   * Nunca nulo em atendimento novo: nascem juntos. Fica nulo só em lead
   * antigo que a migration 0004 não alcançou.
   */
  projetoId: string | null;
};

type LinhaDaView = {
  id: string;
  cliente_id: string;
  cliente: string;
  etapa: StageKey;
  valor_estimado: number | null;
  ambientes_texto: string | null;
  dias_parado: number | null;
  projeto_id: string | null;
};

type Contato = { id: string; telefone: string | null; email: string | null; origem: string | null };

const armazem = criarArmazemDeColecao<LeadDoFunil>(async () => {
  if (!supabase) return { dados: null, erro: null };

  // Duas consultas em vez de uma: a view calcula o tempo parado mas não
  // carrega contato, e telefone errado na tela é pior que telefone ausente.
  const [funil, clientes] = await Promise.all([
    supabase
      .from("v_funil")
      .select(
        "id, cliente_id, cliente, etapa, valor_estimado, ambientes_texto, dias_parado, projeto_id",
      )
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
    projetoId: l.projeto_id,
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
 * Cria cliente, lead **e projeto** de uma vez, com o primeiro contato
 * registrado.
 *
 * O projeto nasce junto porque é assim que ela trabalha: "ele passa naquelas
 * fases do funil, só que ele já é um projeto desde o início". Independente de
 * o cliente chegar com projeto pronto ou não, ela vai redesenhar e levantar o
 * quantitativo — e o quantitativo só existe dentro do projeto. Fazer o
 * projeto nascer só na negociação a obrigava a criar tudo de novo, com um
 * cliente duplicado, para conseguir orçar.
 *
 * A interação de abertura não é enfeite: sem ela o lead nasceria contando
 * dias a partir da abertura, e o atendimento que acabou de acontecer não
 * apareceria no histórico.
 */
export async function criarAtendimento(dados: {
  /** Nome do cliente. Vira também o nome do projeto quando não vem outro. */
  nome: string;
  telefone?: string;
  origem?: string;
  ambientesTexto?: string;
  valorEstimado?: number;
  /** Ambientes escolhidos na tela — viram os ambientes do projeto. */
  ambientes?: string[];
  /** Nome do projeto, quando a tela pergunta os dois separados. */
  projetoNome?: string;
  endereco?: string;
  prazo?: string | null;
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

  const { data: lead, error: erroLead } = await supabase
    .from("leads")
    .insert({
      dono,
      cliente_id: cliente.id,
      etapa: "lead",
      valor_estimado: dados.valorEstimado ?? null,
      ambientes_texto: dados.ambientesTexto ?? null,
    })
    .select("id")
    .single();
  if (erroLead) return "Não foi possível abrir o atendimento: " + erroLead.message;

  const { error: erroInteracao } = await supabase.from("interacoes").insert({
    dono,
    cliente_id: cliente.id,
    canal: dados.origem === "Loja" ? "loja" : "outro",
    nota: "Primeiro atendimento",
  });
  if (erroInteracao) return "Não foi possível registrar o contato: " + erroInteracao.message;

  // O projeto do atendimento. Reaproveita o cliente que acabou de nascer, em
  // vez de criar outro com o mesmo nome — era esse o cliente duplicado.
  const erroProjeto = await criarProjeto({
    nome: dados.projetoNome?.trim() || dados.nome.trim() || "Projeto sem nome",
    clienteId: cliente.id,
    leadId: lead.id,
    endereco: dados.endereco,
    prazo: dados.prazo ?? null,
    valorPrevisto: dados.valorEstimado,
    ambientes: dados.ambientes,
  });
  if (erroProjeto) return erroProjeto;

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
