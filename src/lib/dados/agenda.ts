"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Agenda.

   Três coisas diferentes que a tela junta, e que o banco mantém separadas de
   propósito:

   - **Compromissos** — o que ela marca à mão: visita, medição, apresentação.
     Tem hora e lugar. Sem sincronização com Google, por decisão dela.
   - **Marcos de ambiente** — produção, entrega e montagem. Não são digitados
     na agenda: nascem do prazo que ela põe no cartão do ambiente, dentro do
     projeto. Aparecem aqui porque é onde ela olha, não porque moram aqui.
   - **Retornos** — leads parados tempo demais. Não têm data marcada: são
     calculados por `v_retornos`, com um limite de dias por etapa. Guardar
     "atrasado 4 dias" seria um número errado no dia seguinte.

   Só o primeiro grupo é escrito por esta tela. Os outros dois são
   consequência — e é isso que impede a agenda de virar uma lista paralela que
   discorda do resto do painel.
   ═════════════════════════════════════════════════════════════════════════ */

import { supabase } from "@/lib/supabase/cliente";
import { criarArmazemDeColecao } from "@/lib/supabase/colecao";
import { lerSessao } from "@/lib/supabase/sessao";

export type TipoDeCompromisso =
  | "visita"
  | "medicao"
  | "apresentacao"
  | "entrega"
  | "montagem"
  | "assistencia"
  | "outro";

export type SituacaoDoCompromisso = "marcado" | "confirmado" | "feito" | "cancelado";

export type ItemDaAgenda = {
  id: string;
  tipo: string;
  /** "2026-09-18" */
  dia: string;
  /** Timestamp completo — nulo em marco de ambiente, que só tem data. */
  quando: string | null;
  titulo: string;
  nota: string;
  local: string;
  situacao: string;
  cliente: string;
  projeto: string;
  clienteId: string | null;
  projetoId: string | null;
  /** `compromisso` dá para editar e remover; `marco` vem do projeto. */
  fonte: "compromisso" | "marco";
};

const ROTULOS: Record<string, string> = {
  visita: "Visita",
  medicao: "Medição",
  apresentacao: "Apresentação",
  entrega: "Entrega",
  montagem: "Montagem",
  producao: "Produção",
  assistencia: "Assistência",
  outro: "Compromisso",
};

export const rotuloDoTipo = (t: string) => ROTULOS[t] ?? t;

/** Tipos que a tela oferece ao criar. Produção não entra: vem do ambiente. */
export const TIPOS_MARCAVEIS: [TipoDeCompromisso, string][] = [
  ["visita", "Visita"],
  ["medicao", "Medição"],
  ["apresentacao", "Apresentação"],
  ["entrega", "Entrega"],
  ["montagem", "Montagem"],
  ["assistencia", "Assistência"],
  ["outro", "Outro"],
];

const armazem = criarArmazemDeColecao<ItemDaAgenda>(async () => {
  if (!supabase) return { dados: null, erro: null };
  const { data, error } = await supabase
    .from("v_agenda")
    .select(
      "id, tipo, dia, quando, titulo, nota, local, situacao, cliente, projeto, cliente_id, projeto_id, fonte",
    )
    .order("dia");
  if (error) return { dados: null, erro: "Não foi possível carregar a agenda: " + error.message };

  type Linha = {
    id: string;
    tipo: string;
    dia: string;
    quando: string | null;
    titulo: string | null;
    nota: string | null;
    local: string | null;
    situacao: string;
    cliente: string | null;
    projeto: string | null;
    cliente_id: string | null;
    projeto_id: string | null;
    fonte: "compromisso" | "marco";
  };
  const dados = (data as unknown as Linha[]).map((l) => ({
    id: l.id,
    tipo: l.tipo,
    dia: l.dia,
    quando: l.quando,
    titulo: l.titulo ?? rotuloDoTipo(l.tipo),
    nota: l.nota ?? "",
    local: l.local ?? "",
    situacao: l.situacao,
    cliente: l.cliente ?? "",
    projeto: l.projeto ?? "",
    clienteId: l.cliente_id,
    projetoId: l.projeto_id,
    fonte: l.fonte,
  }));
  return { dados, erro: null };
});

export const lerAgenda = armazem.ler;
export const lerAgendaNoServidor = armazem.lerNoServidor;
export const assinarAgenda = armazem.assinar;
export const lerStatusAgenda = armazem.lerStatus;
export const lerStatusAgendaNoServidor = armazem.lerStatusNoServidor;
export const recarregarAgenda = armazem.recarregar;

export async function criarCompromisso(dados: {
  tipo: TipoDeCompromisso;
  /** "2026-09-18" */
  dia: string;
  /** "14:30" — a tabela guarda timestamp, e sem hora o dia começa à meia-noite. */
  hora: string;
  titulo: string;
  local?: string;
  nota?: string;
  clienteId?: string | null;
  projetoId?: string | null;
}): Promise<string | null> {
  const dono = lerSessao().sessao?.user.id;
  if (!supabase || !dono) return "Sem sessão.";
  if (!dados.dia) return "Escolha o dia.";
  if (!dados.titulo.trim()) return "Dê um nome ao compromisso.";

  // Sem fuso na string, o Postgres grava no fuso do servidor e a hora anda.
  // O ISO local com o deslocamento do aparelho dela é o que preserva "14:30".
  const quando = comFuso(dados.dia, dados.hora || "09:00");

  return armazem.escrever(async () =>
    supabase!.from("compromissos").insert({
      dono,
      tipo: dados.tipo,
      quando,
      titulo: dados.titulo.trim(),
      local: dados.local?.trim() || null,
      nota: dados.nota?.trim() || null,
      cliente_id: dados.clienteId || null,
      projeto_id: dados.projetoId || null,
    }),
  );
}

export async function mudarSituacao(
  id: string,
  situacao: SituacaoDoCompromisso,
): Promise<string | null> {
  if (!supabase) return "Sem conexão.";
  return armazem.escrever(async () =>
    supabase!.from("compromissos").update({ situacao }).eq("id", id),
  );
}

export async function apagarCompromisso(id: string): Promise<string | null> {
  if (!supabase) return "Sem conexão.";
  return armazem.escrever(async () => supabase!.from("compromissos").delete().eq("id", id));
}

/**
 * "2026-09-18" + "14:30" → "2026-09-18T14:30:00-03:00".
 *
 * O deslocamento sai do próprio aparelho: escrever "-03:00" fixo quebraria no
 * horário de verão, se ele voltar.
 */
function comFuso(dia: string, hora: string): string {
  const [a, m, d] = dia.split("-").map(Number);
  const [h, min] = hora.split(":").map(Number);
  const local = new Date(a, m - 1, d, h || 0, min || 0);
  const desloc = -local.getTimezoneOffset();
  const sinal = desloc >= 0 ? "+" : "-";
  const abs = Math.abs(desloc);
  const dd = (n: number) => String(n).padStart(2, "0");
  return `${dia}T${dd(h || 0)}:${dd(min || 0)}:00${sinal}${dd(Math.floor(abs / 60))}:${dd(abs % 60)}`;
}

/** "14:30", ou vazio quando o item não tem hora (marco de ambiente). */
export function horaDe(item: ItemDaAgenda): string {
  if (!item.quando) return "";
  const d = new Date(item.quando);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/* ── retornos ──────────────────────────────────────────────────────────────
   Leads parados além do limite da etapa. Vêm de `v_retornos`, que já aplica
   o limite: 3 dias em lead, 7 em projeto, e assim por diante. */

export type RetornoPendente = {
  id: string;
  clienteId: string;
  nome: string;
  etapa: string;
  diasParado: number;
  valorEstimado: number;
  ambientesTexto: string;
};

const retornos = criarArmazemDeColecao<RetornoPendente>(async () => {
  if (!supabase) return { dados: null, erro: null };
  const { data, error } = await supabase
    .from("v_retornos")
    .select("id, cliente_id, cliente, etapa, dias_parado, valor_estimado, ambientes_texto")
    .order("dias_parado", { ascending: false });
  if (error) return { dados: null, erro: "Não foi possível carregar os retornos: " + error.message };
  type Linha = {
    id: string;
    cliente_id: string;
    cliente: string;
    etapa: string;
    dias_parado: number;
    valor_estimado: number | null;
    ambientes_texto: string | null;
  };
  const dados = (data as unknown as Linha[]).map((l) => ({
    id: l.id,
    clienteId: l.cliente_id,
    nome: l.cliente,
    etapa: l.etapa,
    diasParado: Number(l.dias_parado),
    valorEstimado: Number(l.valor_estimado ?? 0),
    ambientesTexto: l.ambientes_texto ?? "",
  }));
  return { dados, erro: null };
});

export const lerRetornos = retornos.ler;
export const lerRetornosNoServidor = retornos.lerNoServidor;
export const assinarRetornos = retornos.assinar;
export const recarregarRetornos = retornos.recarregar;
