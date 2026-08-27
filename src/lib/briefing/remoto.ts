"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Briefings no banco.

   Três tabelas — `briefings`, `briefing_ambientes`, `briefing_respostas` —
   montadas de volta no mesmo formato que o app já usava quando isto era
   localStorage. Quem consome não muda: `lerBriefings()` continua devolvendo
   um mapa por id de lead.

   Duas decisões que valem explicação:

   **Id de ambiente virou uuid gerado aqui.** Antes era um slug determinístico
   ("cozinha-1") porque o localStorage precisava que o id sobrevivesse à
   sessão. Agora quem manda no id é o banco, e gerar o uuid no cliente permite
   inserir sem esperar resposta — o modo reunião não pode travar entre um
   toque e outro.

   **A gravação é adiada em ~700ms.** Em reunião ela toca rápido: sem isso,
   marcar cinco chips dispararia cinco viagens de rede em cima de uma conexão
   de celular. O cache muda na hora, o diff acumula, e uma só gravação leva
   tudo. Fechar o modo reunião força a descarga do que estiver pendente.
   ═════════════════════════════════════════════════════════════════════════ */

import { supabase } from "@/lib/supabase/cliente";
import { assinarSessao, lerSessao } from "@/lib/supabase/sessao";
import { BRIEFING_VAZIO, type Briefing, type Respostas } from "./tipos";

export type Briefings = Record<string, Briefing>;

const SEM_BRIEFINGS: Briefings = {};
const ATRASO_DA_GRAVACAO = 700;

let briefings: Briefings = SEM_BRIEFINGS;
/** Uuid da linha em `briefings`, por id de lead. */
let idPorLead: Record<string, string> = {};
/** O que o banco já tem, para o diff saber o que mudou. */
let sincronizado: Briefings = SEM_BRIEFINGS;
let erro: string | null = null;
let carregando = true;

const ouvintes = new Set<() => void>();
let iniciado = false;
let geracao = 0;
const timers: Record<string, ReturnType<typeof setTimeout>> = {};

const avisar = () => ouvintes.forEach((fn) => fn());

/** Id novo para ambiente de briefing. Fora do componente de propósito: gerar
 *  identificador é efeito, e render tem que ser puro. */
export function novoIdDeAmbiente(): string {
  return crypto.randomUUID();
}

/* ── leitura ───────────────────────────────────────────────────────────── */

type LinhaAmbiente = {
  id: string;
  briefing_id: string;
  tipo: string;
  apelido: string;
  nota: string;
  ordem: number;
};
type LinhaResposta = {
  briefing_id: string;
  ambiente_id: string | null;
  pergunta_id: string;
  estado: "respondida" | "naoSeAplica";
  valor: unknown;
};

async function buscar() {
  const minha = ++geracao;
  if (!supabase || !lerSessao().sessao) {
    briefings = SEM_BRIEFINGS;
    sincronizado = SEM_BRIEFINGS;
    idPorLead = {};
    carregando = false;
    avisar();
    return;
  }

  const [cabecas, ambientes, respostas] = await Promise.all([
    supabase.from("briefings").select("id, lead_id, nota_geral, atualizado_em"),
    supabase.from("briefing_ambientes").select("id, briefing_id, tipo, apelido, nota, ordem").order("ordem"),
    supabase.from("briefing_respostas").select("briefing_id, ambiente_id, pergunta_id, estado, valor"),
  ]);

  if (minha !== geracao) return;

  const falha = cabecas.error ?? ambientes.error ?? respostas.error;
  if (falha) {
    erro = "Não foi possível carregar os briefings: " + falha.message;
    carregando = false;
    avisar();
    return;
  }

  const porBriefing: Briefings = {};
  const novoIdPorLead: Record<string, string> = {};
  const leadDoBriefing: Record<string, string> = {};

  for (const c of cabecas.data as { id: string; lead_id: string; nota_geral: string; atualizado_em: string }[]) {
    novoIdPorLead[c.lead_id] = c.id;
    leadDoBriefing[c.id] = c.lead_id;
    porBriefing[c.lead_id] = {
      geral: {},
      notaGeral: c.nota_geral ?? "",
      ambientes: [],
      atualizadoEm: c.atualizado_em,
    };
  }

  for (const a of ambientes.data as LinhaAmbiente[]) {
    const lead = leadDoBriefing[a.briefing_id];
    if (!lead) continue;
    porBriefing[lead].ambientes.push({
      id: a.id,
      tipo: a.tipo,
      apelido: a.apelido,
      nota: a.nota ?? "",
      respostas: {},
    });
  }

  for (const r of respostas.data as LinhaResposta[]) {
    const lead = leadDoBriefing[r.briefing_id];
    if (!lead) continue;
    const alvo: Respostas | undefined = r.ambiente_id
      ? porBriefing[lead].ambientes.find((x) => x.id === r.ambiente_id)?.respostas
      : porBriefing[lead].geral;
    if (!alvo) continue;
    alvo[r.pergunta_id] =
      r.estado === "naoSeAplica"
        ? { estado: "naoSeAplica" }
        : { estado: "respondida", valor: r.valor as never };
  }

  briefings = porBriefing;
  // Cópia profunda barata: o diff precisa de um retrato imutável do que o
  // banco tem, e as duas árvores não podem compartilhar objeto.
  sincronizado = JSON.parse(JSON.stringify(porBriefing)) as Briefings;
  idPorLead = novoIdPorLead;
  erro = null;
  carregando = false;
  avisar();
}

function iniciar() {
  if (iniciado) return;
  iniciado = true;
  assinarSessao(() => {
    if (lerSessao().carregando) return;
    void buscar();
  });
  if (!lerSessao().carregando) void buscar();
}

export function lerBriefings(): Briefings {
  return briefings;
}
export function lerBriefingsNoServidor(): Briefings {
  return SEM_BRIEFINGS;
}
export function assinarBriefings(aoMudar: () => void): () => void {
  iniciar();
  ouvintes.add(aoMudar);
  return () => ouvintes.delete(aoMudar);
}

export type StatusDosBriefings = { carregando: boolean; erro: string | null };
export function lerStatusBriefings(): StatusDosBriefings {
  return { carregando, erro };
}
export function lerStatusBriefingsNoServidor(): StatusDosBriefings {
  return { carregando: true, erro: null };
}

/* ── escrita ───────────────────────────────────────────────────────────── */

export function guardarBriefing(leadId: string, b: Briefing): void {
  atualizarBriefing(leadId, () => b);
}

/**
 * Altera a partir do que está em cache agora, não de um instantâneo.
 *
 * Em reunião ela toca rápido, e dois toques dentro do mesmo quadro de render
 * leem a mesma cópia antiga — o segundo apagaria o primeiro. Recebendo a
 * função em vez do valor pronto, cada alteração parte do estado atual.
 */
export function atualizarBriefing(leadId: string, fn: (b: Briefing) => Briefing): void {
  const base = briefings[leadId] ?? BRIEFING_VAZIO;
  briefings = {
    ...briefings,
    [leadId]: { ...fn(base), atualizadoEm: new Date().toISOString() },
  };
  avisar();

  clearTimeout(timers[leadId]);
  timers[leadId] = setTimeout(() => void sincronizar(leadId), ATRASO_DA_GRAVACAO);
}

/** Descarrega o que estiver pendente. Chamado ao fechar o modo reunião. */
export async function sincronizarAgora(leadId: string): Promise<void> {
  clearTimeout(timers[leadId]);
  await sincronizar(leadId);
}

const mesmaResposta = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

async function sincronizar(leadId: string): Promise<void> {
  const dono = lerSessao().sessao?.user.id;
  const atual = briefings[leadId];
  if (!supabase || !dono || !atual) return;

  const anterior = sincronizado[leadId];

  // A linha-cabeça pode não existir ainda: nasce na primeira alteração.
  let briefingId = idPorLead[leadId];
  if (!briefingId) {
    const { data, error } = await supabase
      .from("briefings")
      .insert({ dono, lead_id: leadId, nota_geral: atual.notaGeral })
      .select("id")
      .single();
    if (error) return falhar("Não foi possível criar o briefing: " + error.message);
    briefingId = data.id as string;
    idPorLead = { ...idPorLead, [leadId]: briefingId };
  } else if (anterior && anterior.notaGeral !== atual.notaGeral) {
    const { error } = await supabase
      .from("briefings")
      .update({ nota_geral: atual.notaGeral })
      .eq("id", briefingId);
    if (error) return falhar("Não foi possível salvar a anotação: " + error.message);
  }

  const antes = anterior ?? BRIEFING_VAZIO;

  // ── ambientes ────────────────────────────────────────────────────────
  const idsAgora = new Set(atual.ambientes.map((a) => a.id));
  const removidos = antes.ambientes.filter((a) => !idsAgora.has(a.id)).map((a) => a.id);
  if (removidos.length) {
    // As respostas caem junto pelo `on delete cascade` do schema.
    const { error } = await supabase.from("briefing_ambientes").delete().in("id", removidos);
    if (error) return falhar("Não foi possível remover o ambiente: " + error.message);
  }

  for (const [i, a] of atual.ambientes.entries()) {
    const antigo = antes.ambientes.find((x) => x.id === a.id);
    if (!antigo) {
      const { error } = await supabase.from("briefing_ambientes").insert({
        id: a.id,
        dono,
        briefing_id: briefingId,
        tipo: a.tipo,
        apelido: a.apelido,
        nota: a.nota,
        ordem: i,
      });
      if (error) return falhar("Não foi possível criar o ambiente: " + error.message);
    } else if (antigo.apelido !== a.apelido || antigo.nota !== a.nota) {
      const { error } = await supabase
        .from("briefing_ambientes")
        .update({ apelido: a.apelido, nota: a.nota, ordem: i })
        .eq("id", a.id);
      if (error) return falhar("Não foi possível renomear o ambiente: " + error.message);
    }
  }

  // ── respostas ────────────────────────────────────────────────────────
  const escopos: { ambienteId: string | null; antes: Respostas; agora: Respostas }[] = [
    { ambienteId: null, antes: antes.geral, agora: atual.geral },
    ...atual.ambientes.map((a) => ({
      ambienteId: a.id,
      antes: antes.ambientes.find((x) => x.id === a.id)?.respostas ?? {},
      agora: a.respostas,
    })),
  ];

  for (const e of escopos) {
    const apagar = Object.keys(e.antes).filter((k) => !e.agora[k]);
    for (const perguntaId of apagar) {
      const q = supabase
        .from("briefing_respostas")
        .delete()
        .eq("briefing_id", briefingId)
        .eq("pergunta_id", perguntaId);
      const { error } = await (e.ambienteId
        ? q.eq("ambiente_id", e.ambienteId)
        : q.is("ambiente_id", null));
      if (error) return falhar("Não foi possível limpar a resposta: " + error.message);
    }

    const gravar = Object.keys(e.agora).filter((k) => !mesmaResposta(e.antes[k], e.agora[k]));
    for (const perguntaId of gravar) {
      const r = e.agora[perguntaId];
      // Apaga e insere em vez de upsert: a chave única tem `ambiente_id`
      // nulo no bloco geral, e depender do banco inferir o índice com
      // `nulls not distinct` é sutileza demais para um caminho que não posso
      // testar de antemão.
      const del = supabase
        .from("briefing_respostas")
        .delete()
        .eq("briefing_id", briefingId)
        .eq("pergunta_id", perguntaId);
      await (e.ambienteId ? del.eq("ambiente_id", e.ambienteId) : del.is("ambiente_id", null));

      const { error } = await supabase.from("briefing_respostas").insert({
        dono,
        briefing_id: briefingId,
        ambiente_id: e.ambienteId,
        pergunta_id: perguntaId,
        estado: r.estado,
        valor: r.estado === "respondida" ? r.valor : null,
      });
      if (error) return falhar("Não foi possível salvar a resposta: " + error.message);
    }
  }

  // Deu tudo certo: o retrato do banco passa a ser o que está na tela.
  sincronizado = { ...sincronizado, [leadId]: JSON.parse(JSON.stringify(atual)) as Briefing };
  if (erro) {
    erro = null;
    avisar();
  }
}

function falhar(mensagem: string) {
  erro = mensagem;
  avisar();
}

export async function apagarBriefing(leadId: string): Promise<void> {
  const id = idPorLead[leadId];
  briefings = Object.fromEntries(Object.entries(briefings).filter(([k]) => k !== leadId));
  avisar();
  if (!supabase || !id) return;
  const { error } = await supabase.from("briefings").delete().eq("id", id);
  if (error) falhar("Não foi possível apagar o briefing: " + error.message);
  else await buscar();
}
