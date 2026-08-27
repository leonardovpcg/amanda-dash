"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Projetos, ambientes e orçamento — do banco.

   A migração que unifica duas listas que o protótipo mantinha separadas: os
   "ambientes do projeto" (nome, etapa, prazo) e os "ambientes do orçamento"
   (chapas, fita, acessórios). Eram a mesma coisa em dois lugares, e por isso
   podiam discordar. No banco são uma tabela só, `ambientes`, e o orçamento
   pendura nela.

   Escrita otimista com gravação adiada, como no briefing: ela digita
   quantidade e o número precisa mudar na hora. O diff manda só o que mudou.
   ═════════════════════════════════════════════════════════════════════════ */

import type {
  LinhaAcessorio,
  LinhaChapa,
  LinhaFita,
  LinhaMaoDeObra,
  OrcamentoAmbiente,
} from "@/lib/orcamento/tipos";
import { supabase } from "@/lib/supabase/cliente";
import { assinarSessao, lerSessao } from "@/lib/supabase/sessao";

export type TipoDeMarco =
  | "briefing"
  | "projeto"
  | "aprovacao"
  | "producao"
  | "entrega"
  | "montagem";

export const MARCOS: [TipoDeMarco, string][] = [
  ["briefing", "Briefing"],
  ["projeto", "Projeto"],
  ["aprovacao", "Aprovação"],
  ["producao", "Produção"],
  ["entrega", "Entrega"],
  ["montagem", "Montagem"],
];

export type SituacaoDoProjeto = "aguardando" | "andamento" | "concluido" | "cancelado";

export type AmbienteDoBanco = {
  id: string;
  nome: string;
  detalhe: string;
  /** 0..5, os passos de AMB_STEPS. */
  etapa: number;
  eta: string;
  ordem: number;
  origemBriefing: string | null;
  orcamento: {
    chapas: LinhaChapa[];
    fita: LinhaFita[];
    acessorios: LinhaAcessorio[];
    maoDeObra: LinhaMaoDeObra[];
  };
};

export type ProjetoDoBanco = {
  id: string;
  clienteId: string;
  cliente: string;
  leadId: string | null;
  nome: string;
  endereco: string;
  situacao: SituacaoDoProjeto;
  etapa: string;
  prazo: string | null;
  valorPrevisto: number;
  ambientes: AmbienteDoBanco[];
  marcos: Partial<Record<TipoDeMarco, { previsto: string | null; realizado: string | null }>>;
};

const VAZIO: ProjetoDoBanco[] = [];
const ATRASO_DA_GRAVACAO = 700;

let projetos: ProjetoDoBanco[] = VAZIO;
let sincronizado: ProjetoDoBanco[] = VAZIO;
let carregando = true;
let erro: string | null = null;

const ouvintes = new Set<() => void>();
let iniciado = false;
let geracao = 0;
const timers: Record<string, ReturnType<typeof setTimeout>> = {};

const avisar = () => ouvintes.forEach((fn) => fn());
const copia = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** Id novo. Fora do componente: gerar identificador é efeito. */
export function novoId(): string {
  return crypto.randomUUID();
}

/* ── leitura ───────────────────────────────────────────────────────────── */

type LinhaAmbiente = {
  id: string;
  projeto_id: string;
  nome: string;
  detalhe: string | null;
  etapa: number;
  eta: string | null;
  ordem: number;
  origem_briefing: string | null;
};

type LinhaProjeto = {
  id: string;
  cliente_id: string;
  lead_id: string | null;
  nome: string;
  endereco: string | null;
  situacao: SituacaoDoProjeto;
  etapa: string | null;
  prazo: string | null;
  valor_previsto: number | null;
  clientes: { nome: string } | { nome: string }[] | null;
};

type LinhaOrcamento = {
  id: string;
  ambiente_id: string;
  bloco: "chapas" | "fita" | "acessorios" | "mao_de_obra";
  item_id: string;
  espessura: number | null;
  qnt: number;
  ordem: number;
};

async function buscar() {
  const minha = ++geracao;
  if (!supabase || !lerSessao().sessao) {
    projetos = VAZIO;
    sincronizado = VAZIO;
    carregando = false;
    avisar();
    return;
  }

  const [ps, ambs, linhas, marcos] = await Promise.all([
    supabase
      .from("projetos")
      .select(
        "id, cliente_id, lead_id, nome, endereco, situacao, etapa, prazo, valor_previsto, clientes(nome)",
      )
      .order("criado_em", { ascending: false }),
    supabase
      .from("ambientes")
      .select("id, projeto_id, nome, detalhe, etapa, eta, ordem, origem_briefing")
      .order("ordem"),
    supabase
      .from("orcamento_linhas")
      .select("id, ambiente_id, bloco, item_id, espessura, qnt, ordem")
      .order("ordem"),
    supabase.from("projeto_marcos").select("projeto_id, tipo, previsto, realizado"),
  ]);

  if (minha !== geracao) return;

  const falha = ps.error ?? ambs.error ?? linhas.error ?? marcos.error;
  if (falha) {
    erro = "Não foi possível carregar os projetos: " + falha.message;
    carregando = false;
    avisar();
    return;
  }

  const porAmbiente = new Map<string, AmbienteDoBanco["orcamento"]>();
  for (const l of (linhas.data ?? []) as LinhaOrcamento[]) {
    let o = porAmbiente.get(l.ambiente_id);
    if (!o) {
      o = { chapas: [], fita: [], acessorios: [], maoDeObra: [] };
      porAmbiente.set(l.ambiente_id, o);
    }
    const qnt = Number(l.qnt);
    if (l.bloco === "chapas") o.chapas.push({ corId: l.item_id, espessura: (l.espessura ?? 18) as 6 | 15 | 18, qnt });
    else if (l.bloco === "fita") o.fita.push({ corId: l.item_id, metros: qnt });
    else if (l.bloco === "acessorios") o.acessorios.push({ acessorioId: l.item_id, qnt });
    else o.maoDeObra.push({ servicoId: l.item_id, qnt });
  }

  const ambientesPorProjeto = new Map<string, AmbienteDoBanco[]>();
  for (const linha of (ambs.data ?? []) as unknown as LinhaAmbiente[]) {
    const lista = ambientesPorProjeto.get(linha.projeto_id) ?? [];
    lista.push({
      id: linha.id,
      nome: linha.nome,
      detalhe: linha.detalhe ?? "",
      etapa: linha.etapa,
      eta: linha.eta ?? "",
      ordem: linha.ordem,
      origemBriefing: linha.origem_briefing,
      orcamento: porAmbiente.get(linha.id) ?? {
        chapas: [],
        fita: [],
        acessorios: [],
        maoDeObra: [],
      },
    });
    ambientesPorProjeto.set(linha.projeto_id, lista);
  }

  const marcosPorProjeto = new Map<string, ProjetoDoBanco["marcos"]>();
  for (const m of (marcos.data ?? []) as {
    projeto_id: string;
    tipo: TipoDeMarco;
    previsto: string | null;
    realizado: string | null;
  }[]) {
    const atual = marcosPorProjeto.get(m.projeto_id) ?? {};
    atual[m.tipo] = { previsto: m.previsto, realizado: m.realizado };
    marcosPorProjeto.set(m.projeto_id, atual);
  }

  projetos = ((ps.data ?? []) as unknown as LinhaProjeto[]).map((linha) => {
    const cliente = Array.isArray(linha.clientes) ? linha.clientes[0] : linha.clientes;
    return {
      id: linha.id,
      clienteId: linha.cliente_id,
      cliente: cliente?.nome ?? "Cliente",
      leadId: linha.lead_id,
      nome: linha.nome,
      endereco: linha.endereco ?? "",
      situacao: linha.situacao,
      etapa: linha.etapa ?? "",
      prazo: linha.prazo,
      valorPrevisto: Number(linha.valor_previsto ?? 0),
      ambientes: ambientesPorProjeto.get(linha.id) ?? [],
      marcos: marcosPorProjeto.get(linha.id) ?? {},
    };
  });

  sincronizado = copia(projetos);
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

export const lerProjetos = () => projetos;
export const lerProjetosNoServidor = () => VAZIO;
export function assinarProjetos(aoMudar: () => void): () => void {
  iniciar();
  ouvintes.add(aoMudar);
  return () => ouvintes.delete(aoMudar);
}
export const lerStatusProjetos = () => ({ carregando, erro });
export const lerStatusProjetosNoServidor = () => ({ carregando: true, erro: null as string | null });
export const recarregarProjetos = buscar;

/* ── escrita ───────────────────────────────────────────────────────────── */

function falhar(mensagem: string) {
  erro = mensagem;
  avisar();
}

/** Altera o projeto em cache e agenda a gravação do que mudou. */
export function atualizarProjeto(id: string, fn: (p: ProjetoDoBanco) => ProjetoDoBanco): void {
  projetos = projetos.map((p) => (p.id === id ? fn(p) : p));
  avisar();
  clearTimeout(timers[id]);
  timers[id] = setTimeout(() => void sincronizar(id), ATRASO_DA_GRAVACAO);
}

export async function sincronizarProjetoAgora(id: string): Promise<void> {
  clearTimeout(timers[id]);
  await sincronizar(id);
}

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** As quatro listas do orçamento viram linhas de `orcamento_linhas`. */
function linhasDoAmbiente(a: AmbienteDoBanco, dono: string) {
  const o = a.orcamento;
  return [
    ...o.chapas.map((l, i) => ({
      dono,
      ambiente_id: a.id,
      bloco: "chapas",
      item_id: l.corId,
      espessura: l.espessura,
      qnt: l.qnt,
      ordem: i,
    })),
    ...o.fita.map((l, i) => ({
      dono,
      ambiente_id: a.id,
      bloco: "fita",
      item_id: l.corId,
      espessura: null,
      qnt: l.metros,
      ordem: i,
    })),
    ...o.acessorios.map((l, i) => ({
      dono,
      ambiente_id: a.id,
      bloco: "acessorios",
      item_id: l.acessorioId,
      espessura: null,
      qnt: l.qnt,
      ordem: i,
    })),
    ...o.maoDeObra.map((l, i) => ({
      dono,
      ambiente_id: a.id,
      bloco: "mao_de_obra",
      item_id: l.servicoId,
      espessura: null,
      qnt: l.qnt,
      ordem: i,
    })),
  ];
}

async function sincronizar(id: string): Promise<void> {
  const dono = lerSessao().sessao?.user.id;
  const atual = projetos.find((p) => p.id === id);
  if (!supabase || !dono || !atual) return;
  const antes = sincronizado.find((p) => p.id === id);

  // ── cabeçalho ────────────────────────────────────────────────────────
  if (
    !antes ||
    antes.nome !== atual.nome ||
    antes.endereco !== atual.endereco ||
    antes.situacao !== atual.situacao ||
    antes.etapa !== atual.etapa ||
    antes.prazo !== atual.prazo ||
    antes.valorPrevisto !== atual.valorPrevisto
  ) {
    const { error } = await supabase
      .from("projetos")
      .update({
        nome: atual.nome,
        endereco: atual.endereco || null,
        situacao: atual.situacao,
        etapa: atual.etapa || null,
        prazo: atual.prazo,
        valor_previsto: atual.valorPrevisto || null,
      })
      .eq("id", id);
    if (error) return falhar("Não foi possível salvar o projeto: " + error.message);
  }

  // ── ambientes ────────────────────────────────────────────────────────
  const idsAgora = new Set(atual.ambientes.map((a) => a.id));
  const removidos = (antes?.ambientes ?? []).filter((a) => !idsAgora.has(a.id)).map((a) => a.id);
  if (removidos.length) {
    // As linhas de orçamento caem junto pelo `on delete cascade`.
    const { error } = await supabase.from("ambientes").delete().in("id", removidos);
    if (error) return falhar("Não foi possível remover o ambiente: " + error.message);
  }

  for (const [i, a] of atual.ambientes.entries()) {
    const antigo = antes?.ambientes.find((x) => x.id === a.id);
    if (!antigo) {
      const { error } = await supabase.from("ambientes").insert({
        id: a.id,
        dono,
        projeto_id: id,
        nome: a.nome,
        detalhe: a.detalhe || null,
        etapa: a.etapa,
        eta: a.eta || null,
        ordem: i,
        origem_briefing: a.origemBriefing,
      });
      if (error) return falhar("Não foi possível criar o ambiente: " + error.message);
    } else if (
      antigo.nome !== a.nome ||
      antigo.detalhe !== a.detalhe ||
      antigo.etapa !== a.etapa ||
      antigo.eta !== a.eta ||
      antigo.ordem !== i ||
      antigo.origemBriefing !== a.origemBriefing
    ) {
      const { error } = await supabase
        .from("ambientes")
        .update({
          nome: a.nome,
          detalhe: a.detalhe || null,
          etapa: a.etapa,
          eta: a.eta || null,
          ordem: i,
          origem_briefing: a.origemBriefing,
        })
        .eq("id", a.id);
      if (error) return falhar("Não foi possível salvar o ambiente: " + error.message);
    }

    // ── orçamento do ambiente ──────────────────────────────────────────
    // Troca a lista inteira em vez de casar linha a linha: a chave natural
    // seria (bloco, item, espessura), e ela pode repetir o mesmo item duas
    // vezes de propósito — duas entradas de Off White 18mm por motivos
    // diferentes. Sem chave estável, apagar e reinserir é o que não perde
    // nem inventa linha.
    if (!antigo || !igual(antigo.orcamento, a.orcamento)) {
      const { error: erroApagar } = await supabase
        .from("orcamento_linhas")
        .delete()
        .eq("ambiente_id", a.id);
      if (erroApagar) return falhar("Não foi possível limpar o orçamento: " + erroApagar.message);

      const novas = linhasDoAmbiente(a, dono);
      if (novas.length) {
        const { error } = await supabase.from("orcamento_linhas").insert(novas);
        if (error) return falhar("Não foi possível salvar o orçamento: " + error.message);
      }
    }
  }

  // ── marcos ───────────────────────────────────────────────────────────
  for (const [tipo] of MARCOS) {
    const agora = atual.marcos[tipo];
    const antigo = antes?.marcos[tipo];
    if (igual(agora, antigo)) continue;
    if (!agora) {
      const { error } = await supabase
        .from("projeto_marcos")
        .delete()
        .eq("projeto_id", id)
        .eq("tipo", tipo);
      if (error) return falhar("Não foi possível limpar o marco: " + error.message);
      continue;
    }
    const { error } = await supabase.from("projeto_marcos").upsert(
      { dono, projeto_id: id, tipo, previsto: agora.previsto, realizado: agora.realizado },
      { onConflict: "projeto_id,tipo" },
    );
    if (error) return falhar("Não foi possível salvar o marco: " + error.message);
  }

  sincronizado = sincronizado.some((p) => p.id === id)
    ? sincronizado.map((p) => (p.id === id ? copia(atual) : p))
    : [...sincronizado, copia(atual)];
  if (erro) {
    erro = null;
    avisar();
  }
}

/* ── criação ───────────────────────────────────────────────────────────── */

/**
 * Cria projeto novo, com cliente.
 *
 * Aceita um cliente já existente (quando vem do funil) ou cria um pelo nome.
 * Casar por nome seria tentador e errado: dois "João Silva" viram o mesmo
 * cliente e o histórico de um contamina o outro.
 */
export async function criarProjeto(dados: {
  nome: string;
  clienteId?: string;
  clienteNome?: string;
  endereco?: string;
  prazo?: string | null;
  valorPrevisto?: number;
  leadId?: string | null;
  ambientes?: string[];
}): Promise<string | null> {
  const dono = lerSessao().sessao?.user.id;
  if (!supabase || !dono) return "Sem sessão.";

  let clienteId = dados.clienteId;
  if (!clienteId) {
    const { data, error } = await supabase
      .from("clientes")
      .insert({ dono, nome: dados.clienteNome?.trim() || "Cliente a definir" })
      .select("id")
      .single();
    if (error) return "Não foi possível criar o cliente: " + error.message;
    clienteId = data.id as string;
  }

  const { data: projeto, error: erroProjeto } = await supabase
    .from("projetos")
    .insert({
      dono,
      cliente_id: clienteId,
      lead_id: dados.leadId ?? null,
      nome: dados.nome.trim() || "Projeto sem nome",
      endereco: dados.endereco?.trim() || null,
      situacao: "aguardando",
      etapa: "Medição e projeto",
      prazo: dados.prazo ?? null,
      valor_previsto: dados.valorPrevisto ?? null,
    })
    .select("id")
    .single();
  if (erroProjeto) return "Não foi possível criar o projeto: " + erroProjeto.message;

  const ambientes = (dados.ambientes ?? []).map((nome, i) => ({
    dono,
    projeto_id: projeto.id,
    nome,
    detalhe: null,
    etapa: 0,
    ordem: i,
  }));
  if (ambientes.length) {
    const { error } = await supabase.from("ambientes").insert(ambientes);
    if (error) return "Não foi possível criar os ambientes: " + error.message;
  }

  await buscar();
  return null;
}

/** Ambiente novo dentro de um projeto que já existe. */
export function adicionarAmbiente(projetoId: string, nome = "Novo ambiente"): void {
  atualizarProjeto(projetoId, (p) => ({
    ...p,
    ambientes: [
      ...p.ambientes,
      {
        id: novoId(),
        nome,
        detalhe: "",
        etapa: 0,
        eta: "",
        ordem: p.ambientes.length,
        origemBriefing: null,
        orcamento: { chapas: [], fita: [], acessorios: [], maoDeObra: [] },
      },
    ],
  }));
}

export async function apagarProjeto(id: string): Promise<string | null> {
  if (!supabase) return "Sem conexão.";
  projetos = projetos.filter((p) => p.id !== id);
  avisar();
  const { error } = await supabase.from("projetos").delete().eq("id", id);
  if (error) {
    falhar("Não foi possível apagar o projeto: " + error.message);
    return error.message;
  }
  await buscar();
  return null;
}

/* ── ponte com o orçamento ─────────────────────────────────────────────── */

/** O orçamento do projeto no formato que o motor de cálculo espera. */
export function orcamentoDoProjeto(p: ProjetoDoBanco): OrcamentoAmbiente[] {
  return p.ambientes.map((a) => ({
    id: a.id,
    nome: a.nome,
    origemBriefing: a.origemBriefing ?? undefined,
    ...a.orcamento,
  }));
}

/**
 * Devolve o orçamento editado para dentro dos ambientes.
 *
 * A tela do orçamento pode criar e remover ambiente — e agora isso é o mesmo
 * ambiente do projeto, não uma segunda lista que podia discordar.
 */
export function aplicarOrcamento(projetoId: string, novos: OrcamentoAmbiente[]): void {
  atualizarProjeto(projetoId, (p) => {
    const porId = new Map(p.ambientes.map((a) => [a.id, a]));
    return {
      ...p,
      ambientes: novos.map((n, i) => {
        const antigo = porId.get(n.id);
        return {
          id: n.id,
          nome: n.nome,
          detalhe: antigo?.detalhe ?? "",
          etapa: antigo?.etapa ?? 0,
          eta: antigo?.eta ?? "",
          ordem: i,
          origemBriefing: n.origemBriefing ?? antigo?.origemBriefing ?? null,
          orcamento: {
            chapas: n.chapas,
            fita: n.fita,
            acessorios: n.acessorios,
            maoDeObra: n.maoDeObra,
          },
        };
      }),
    };
  });
}

/* ── tradução para a forma que os componentes já esperam ───────────────── */

/** "2026-09-12" → "12 set 2026". Prazo vazio vira "a definir". */
export function prazoLegivel(data: string | null): string {
  if (!data) return "a definir";
  const [ano, mes, dia] = data.split("-");
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${dia} ${meses[Number(mes) - 1] ?? ""} ${ano}`;
}

const SITUACOES: Record<SituacaoDoProjeto, string> = {
  aguardando: "Aguardando aprovação",
  andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const rotuloDaSituacao = (s: SituacaoDoProjeto) => SITUACOES[s] ?? s;

/**
 * A linha do tempo, com o estado de cada etapa.
 *
 * "Realizado" é concluído; a primeira etapa sem realizar é a atual. Derivar
 * em vez de guardar `done|current|todo` evita o retrato que envelhece — no
 * protótipo esse estado era digitado e podia contradizer as datas ao lado.
 */
export function linhaDoTempo(p: ProjetoDoBanco): [string, string, "done" | "current" | "todo"][] {
  let achouAtual = false;
  return MARCOS.map(([tipo, rotulo]) => {
    const m = p.marcos[tipo];
    if (m?.realizado) return [rotulo, prazoLegivel(m.realizado), "done"];
    if (!achouAtual) {
      achouAtual = true;
      return [rotulo, m?.previsto ? prazoLegivel(m.previsto) : "em curso", "current"];
    }
    return [rotulo, m?.previsto ? prazoLegivel(m.previsto) : "a definir", "todo"];
  });
}
