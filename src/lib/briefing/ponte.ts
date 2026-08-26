/* ═══════════════════════════════════════════════════════════════════════════
   Ponte briefing → orçamento.

   Função pura: recebe o briefing, o roteiro, as regras, o orçamento atual e o
   catálogo; devolve o que *poderia* ser lançado. Não altera nada — quem aplica
   é `aplicar`, e só o que ela marcar.

   Essa separação não é preciosismo. Um botão que reescreve o orçamento sozinho
   apaga trabalho dela uma vez e nunca mais é clicado; a sugestão revisável
   erra sem custo.
   ═════════════════════════════════════════════════════════════════════════ */

import { CATALOGO_PADRAO, type Catalogo } from "@/lib/orcamento/catalogo";
import type { OrcamentoAmbiente } from "@/lib/orcamento/tipos";
import { REGRAS_PADRAO, type BlocoDestino, type Gatilho, type Quantidade, type Regras } from "./regras";
import type { Briefing, Pergunta, Resposta, Respostas, Roteiro, Secao } from "./tipos";

/* ── saída ───────────────────────────────────────────────────────────────── */

export type LinhaSugerida = {
  /** Identifica a linha na seleção da tela: ambiente + bloco + item. */
  chave: string;
  bloco: BlocoDestino;
  itemId: string;
  nome: string;
  unidade: string;
  /** Zero significa "a definir depois do 3D" — vira pendência no orçamento. */
  qnt: number;
  /** Que respostas pediram esta linha. Mais de uma quando consolidam. */
  motivos: string[];
  /** Já existe no orçamento: aparece marcada como pronta, não é reaplicada. */
  jaNoOrcamento: boolean;
};

export type AmbienteSugerido = {
  briefingAmbienteId: string;
  nome: string;
  /** `null` quando o ambiente ainda não existe no orçamento. */
  orcamentoAmbienteId: string | null;
  linhas: LinhaSugerida[];
  observacoes: string[];
};

/** Resposta marcada pelo cliente que nenhuma regra cobriu. */
export type SemRegra = { ambiente: string; pergunta: string; resposta: string };

export type Sugestao = {
  ambientes: AmbienteSugerido[];
  observacoesGerais: string[];
  semRegra: SemRegra[];
  /** Linhas que ainda não estão no orçamento. */
  novasLinhas: number;
  novosAmbientes: number;
};

/* ── avaliação ───────────────────────────────────────────────────────────── */

function dispara(g: Gatilho, r: Resposta | undefined): boolean {
  if (!r || r.estado !== "respondida") return false;
  if (g.tipo === "respondida") return true;
  if (g.tipo === "temOpcao") return Array.isArray(r.valor) && r.valor.includes(g.opcao);
  return r.valor === g.valor;
}

/**
 * Quantidade da linha.
 *
 * `porResposta` arredonda para cima: quatro portas de correr dão dois kits,
 * três dão dois também. Sobrar uma ferragem custa barato; faltar para a
 * montagem para a obra.
 */
function quantidade(q: Quantidade, respostas: Respostas): number {
  if (q.tipo === "fixa") return q.n;
  if (q.tipo === "aDefinir") return 0;
  const r = respostas[q.perguntaId];
  if (!r || r.estado !== "respondida" || typeof r.valor !== "number") return 0;
  return Math.ceil(r.valor * q.fator);
}

const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const acharPergunta = (secoes: Secao[], id: string): Pergunta | undefined => {
  for (const s of secoes) {
    const p = s.perguntas.find((x) => x.id === id);
    if (p) return p;
  }
  return undefined;
};

/** "Tipo de abertura das portas → Giro" — por que a linha foi sugerida. */
function motivo(pergunta: Pergunta | undefined, g: Gatilho, r: Resposta | undefined): string {
  const titulo = pergunta?.texto ?? "resposta";
  if (g.tipo === "temOpcao") return `${titulo} → ${g.opcao}`;
  if (g.tipo === "igualA") return `${titulo} → ${g.valor === true ? "Sim" : g.valor === false ? "Não" : g.valor}`;
  if (r?.estado === "respondida") {
    const v = Array.isArray(r.valor) ? r.valor.join(", ") : String(r.valor);
    return `${titulo} → ${v}`;
  }
  return titulo;
}

/* ── sugestão ────────────────────────────────────────────────────────────── */

export function sugerir(
  briefing: Briefing,
  roteiro: Roteiro,
  orcamento: OrcamentoAmbiente[],
  regras: Regras = REGRAS_PADRAO,
  cat: Catalogo = CATALOGO_PADRAO,
): Sugestao {
  const acessorios = new Map(cat.acessorios.map((a) => [a.id, a]));
  const servicos = new Map(cat.maoDeObra.map((s) => [s.id, s]));
  const semRegra: SemRegra[] = [];

  const observacoesGerais = regras.observacoes
    .filter((o) => o.ambiente === "geral" && dispara(o.quando, briefing.geral[o.perguntaId]))
    .map((o) => o.texto);

  const ambientes: AmbienteSugerido[] = briefing.ambientes.map((amb) => {
    const rot = roteiro.ambientes.find((x) => x.id === amb.tipo);
    const secoes = rot?.secoes ?? [];

    // Casa primeiro pelo vínculo explícito; só depois pelo nome, que os dois
    // lados podem ter editado.
    const alvo =
      orcamento.find((o) => o.origemBriefing === amb.id) ??
      orcamento.find((o) => semAcento(o.nome) === semAcento(amb.apelido)) ??
      null;

    const jaTem = (bloco: BlocoDestino, itemId: string) =>
      !alvo
        ? false
        : bloco === "acessorios"
          ? alvo.acessorios.some((l) => l.acessorioId === itemId)
          : alvo.maoDeObra.some((l) => l.servicoId === itemId);

    // Consolida por item: sem isso, o banheiro com gabinete, espelheira e
    // torre de toalhas geraria três linhas de dobradiça com zero cada uma.
    const porItem = new Map<string, LinhaSugerida>();

    for (const regra of regras.linhas) {
      if (regra.ambiente !== amb.tipo) continue;
      const resp = amb.respostas[regra.perguntaId];
      if (!dispara(regra.quando, resp)) continue;

      const item =
        regra.bloco === "acessorios" ? acessorios.get(regra.itemId) : servicos.get(regra.itemId);
      // Item removido do catálogo: a regra fica órfã e é ignorada em silêncio
      // aqui — quem avisa é o editor de regras.
      if (!item) continue;

      const chave = `${amb.id}|${regra.bloco}|${regra.itemId}`;
      const texto = motivo(acharPergunta(secoes, regra.perguntaId), regra.quando, resp);
      const qnt = quantidade(regra.quantidade, amb.respostas);
      const atual = porItem.get(chave);

      if (atual) {
        atual.qnt += qnt;
        if (!atual.motivos.includes(texto)) atual.motivos.push(texto);
      } else {
        porItem.set(chave, {
          chave,
          bloco: regra.bloco,
          itemId: regra.itemId,
          nome: item.nome,
          unidade: item.unidade,
          qnt,
          motivos: [texto],
          jaNoOrcamento: jaTem(regra.bloco, regra.itemId),
        });
      }
    }

    // Opções marcadas que nenhuma regra cobriu — só nas perguntas que já
    // geram item, senão viraria ruído com pergunta de perfil do cliente.
    const comRegra = new Set(
      regras.linhas.filter((r) => r.ambiente === amb.tipo).map((r) => r.perguntaId),
    );
    for (const perguntaId of comRegra) {
      const resp = amb.respostas[perguntaId];
      if (!resp || resp.estado !== "respondida" || !Array.isArray(resp.valor)) continue;
      const pergunta = acharPergunta(secoes, perguntaId);
      for (const op of resp.valor) {
        const coberta = regras.linhas.some(
          (r) =>
            r.ambiente === amb.tipo &&
            r.perguntaId === perguntaId &&
            r.quando.tipo === "temOpcao" &&
            r.quando.opcao === op,
        );
        if (!coberta) {
          semRegra.push({
            ambiente: amb.apelido,
            pergunta: pergunta?.texto ?? perguntaId,
            resposta: op,
          });
        }
      }
    }

    const observacoes = regras.observacoes
      .filter((o) => o.ambiente === amb.tipo && dispara(o.quando, amb.respostas[o.perguntaId]))
      .map((o) => o.texto);

    return {
      briefingAmbienteId: amb.id,
      nome: amb.apelido,
      orcamentoAmbienteId: alvo?.id ?? null,
      linhas: [...porItem.values()],
      observacoes,
    };
  });

  return {
    ambientes,
    observacoesGerais,
    semRegra,
    novasLinhas: ambientes.reduce(
      (n, a) => n + a.linhas.filter((l) => !l.jaNoOrcamento).length,
      0,
    ),
    novosAmbientes: ambientes.filter((a) => !a.orcamentoAmbienteId && a.linhas.length > 0).length,
  };
}

/* ── aplicação ───────────────────────────────────────────────────────────── */

/**
 * Lança no orçamento só as linhas marcadas.
 *
 * Sempre aditivo: cria ambiente que falta, acrescenta linha que falta, e não
 * encosta em quantidade que ela já digitou. Reaplicar depois de mexer no
 * briefing é seguro por construção.
 */
export function aplicar(
  orcamento: OrcamentoAmbiente[],
  sugestao: Sugestao,
  escolhidas: string[],
): OrcamentoAmbiente[] {
  const marcadas = new Set(escolhidas);
  let resultado = [...orcamento];

  for (const amb of sugestao.ambientes) {
    const linhas = amb.linhas.filter((l) => marcadas.has(l.chave) && !l.jaNoOrcamento);
    if (linhas.length === 0) continue;

    let alvoId = amb.orcamentoAmbienteId;

    if (!alvoId) {
      // Id derivado do ambiente do briefing: estável entre sessões, e o
      // `origemBriefing` deixa o vínculo explícito para a próxima aplicação.
      alvoId = "orc-" + amb.briefingAmbienteId;
      resultado = [
        ...resultado,
        {
          id: alvoId,
          nome: amb.nome,
          origemBriefing: amb.briefingAmbienteId,
          chapas: [],
          fita: [],
          acessorios: [],
          maoDeObra: [],
        },
      ];
    }

    resultado = resultado.map((o) => {
      if (o.id !== alvoId) return o;
      const novosAcessorios = linhas
        .filter((l) => l.bloco === "acessorios")
        .map((l) => ({ acessorioId: l.itemId, qnt: l.qnt }));
      const novosServicos = linhas
        .filter((l) => l.bloco === "maoDeObra")
        .map((l) => ({ servicoId: l.itemId, qnt: l.qnt }));
      return {
        ...o,
        // Casado por nome numa aplicação anterior? Grava o vínculo agora.
        origemBriefing: o.origemBriefing ?? amb.briefingAmbienteId,
        acessorios: [...o.acessorios, ...novosAcessorios],
        maoDeObra: [...o.maoDeObra, ...novosServicos],
      };
    });
  }

  return resultado;
}
