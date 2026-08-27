"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  AMB_STEPS,
  CAT_COLORS,
  PRICES,
  STAGES,
  STATUS_TONE,
  chip,
  money,
  type Ambiente,
  type Lead,
  type Project,
  type StageKey,
} from "@/lib/dashboard/data";
import {
  assinarPerfil,
  guardarPerfil,
  lerPerfil,
  lerPerfilNoServidor,
  primeiroNome,
  type Perfil,
} from "@/lib/dashboard/perfil";
import { brl, calcularProjeto } from "@/lib/orcamento/calculo";
import { assinarCatalogo, lerCatalogo, lerCatalogoNoServidor } from "@/lib/orcamento/catalogo";
import { composicao, materiais, temOrcamento, valorDeContrato } from "@/lib/orcamento/derivar";
import {
  assinarBriefings,
  assinarRoteiro,
  atualizarBriefing,
  briefingInicial,
  guardarBriefing,
  lerBriefings,
  lerBriefingsNoServidor,
  lerRoteiro,
  lerRoteiroNoServidor,
  progressoDoBriefing,
  sincronizarAgora,
} from "@/lib/briefing/armazem";
import type { Briefing as TBriefing } from "@/lib/briefing/tipos";
import {
  assinarContratos,
  assinarMetas,
  lerContratos,
  lerContratosNoServidor,
  lerMetas,
  lerMetasNoServidor,
} from "@/lib/dados/contratos";
import {
  assinarRelogio,
  dataPorExtenso,
  lerRelogio,
  lerRelogioNoServidor,
  mesCorrente,
  nomeDoMes,
  saudacao,
} from "@/lib/dados/relogio";
import {
  assinarFunil,
  criarAtendimento,
  lerFunil,
  lerFunilNoServidor,
  moverEtapa,
} from "@/lib/dados/funil";
import {
  adicionarAmbiente,
  aplicarOrcamento,
  assinarProjetos,
  atualizarProjeto,
  criarProjeto,
  lerProjetos,
  lerProjetosNoServidor,
  linhaDoTempo,
  orcamentoDoProjeto,
  prazoLegivel,
  rotuloDaSituacao,
  sincronizarProjetoAgora,
  type ProjetoDoBanco,
} from "@/lib/dados/projetos";
import { MONO, NUM, tabStyle } from "./ui";
import Avatar from "./Avatar";
import LogoTerracota from "./LogoTerracota";
import PerfilMenu from "./PerfilMenu";
import PerfilModal from "./PerfilModal";
import Funil from "./Funil";
import ProjetosLista, { type KpiDeProjetos } from "./ProjetosLista";
import ProjetoDetalhe from "./ProjetoDetalhe";
import Comissao from "./Comissao";
import Agenda from "./Agenda";
import Financeiro from "./Financeiro";
import PosVenda from "./PosVenda";
import Ajustes from "./Ajustes";
import NovoProjeto from "./NovoProjeto";
import LeadDrawer from "./LeadDrawer";
import Avisos from "./Avisos";
import Briefing from "./Briefing";
import NovoAtendimento from "./NovoAtendimento";
import { useDeslizarAbas } from "./useDeslizarAbas";

export type Tab =
  | "funil"
  | "projetos"
  | "comissao"
  | "agenda"
  | "financeiro"
  | "posvenda"
  | "ajustes";
type Overlay = "projeto" | "novo" | "notif" | null;

export type ProjectVM = Project & {
  /** Valor de contrato em uso: do orçamento quando existe, senão o digitado. */
  contrato: number;
  /** `true` quando `contrato` veio do orçamento e não do campo do cabeçalho. */
  doOrcamento: boolean;
  badgeStyle: React.CSSProperties;
  budgetLabel: string;
  spentLabel: string;
  saldoLabel: string;
  ambienteTags: string[];
  pct: number;
  pctColor: string;
};

export type PriceResult = { term: string; value: string; unit: string; source: string };

/**
 * "R$ 1,84 mi" — o número grande dos cartões de indicador.
 *
 * O cartão tem 52px de fonte e uns 265px de largura no celular; "R$ 1.840.000"
 * não cabe. A unidade vai num `span` menor, como no design.
 */
function moneyCurto(n: number) {
  const [valor, unidade] =
    n >= 1_000_000 ? [n / 1_000_000, "mi"] : n >= 100_000 ? [n / 1000, "mil"] : [n, ""];
  const texto =
    "R$ " +
    valor.toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: unidade ? 2 : 0,
    });
  if (!unidade) return texto;
  return (
    <>
      {texto}{" "}
      <span style={{ fontSize: "clamp(17px, 3.4vw, 26px)", fontWeight: 500, color: "#6E6A5F" }}>
        {unidade}
      </span>
    </>
  );
}

const deaccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

const TABS: [Tab, string][] = [
  ["funil", "Funil"],
  ["projetos", "Projetos"],
  ["comissao", "Comissão"],
  ["agenda", "Agenda"],
  ["financeiro", "Financeiro"],
  ["posvenda", "Pós-venda"],
  ["ajustes", "Ajustes"],
];

export default function DashboardArquitetura({
  projetoLayout = "grade",
}: {
  /** Prop do design: "grade" (cartões) ou "lista" (coluna única). */
  projetoLayout?: "grade" | "lista";
}) {
  const [tab, setTab] = useState<Tab>("funil");
  // A data e a saudação vêm do aparelho dela. No servidor o snapshot é nulo,
  // senão a hidratação quebra ao discordar da hora do navegador.
  const agora = useSyncExternalStore(assinarRelogio, lerRelogio, lerRelogioNoServidor);
  const metas = useSyncExternalStore(assinarMetas, lerMetas, lerMetasNoServidor);
  // Contratos assinados: é deles que sai o "Faturado" de cada projeto.
  const contratos = useSyncExternalStore(assinarContratos, lerContratos, lerContratosNoServidor);
  const [selected, setSelected] = useState<string | null>(null);
  // Projetos, ambientes e orçamento vêm do banco. `ambientes` e o orçamento
  // são a mesma tabela agora: no protótipo eram duas listas que podiam
  // discordar sobre quantos ambientes o projeto tem.
  const doBanco = useSyncExternalStore(assinarProjetos, lerProjetos, lerProjetosNoServidor);
  // O funil vem do banco. `diasParado` é calculado pela view a partir da
  // última interação registrada — no protótipo era um número digitado.
  const funil = useSyncExternalStore(assinarFunil, lerFunil, lerFunilNoServidor);
  const leads: Lead[] = useMemo(
    () =>
      funil.map((l) => ({
        id: l.id,
        name: l.nome,
        value: l.valorEstimado,
        idle: l.diasParado,
        ambientes: l.ambientesTexto || "A definir",
        stage: l.etapa,
        telefone: l.telefone,
        email: l.email,
      })),
    [funil],
  );
  const clienteDoLead = (leadId: string) => funil.find((l) => l.id === leadId)?.clienteId;

  const [overlay, setOverlay] = useState<Overlay>(null);
  const [openLead, setOpenLead] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<StageKey | null>(null);

  const [query, setQuery] = useState("");
  const [result, setResult] = useState<PriceResult | null>(null);

  const [origem, setOrigem] = useState("Loja");
  const [ambPick, setAmbPick] = useState<string[]>(["Cozinha"]);

  // ── perfil ───────────────────────────────────────────────────────────────
  // Mora no localStorage, fora do React, então é lido como store externa.
  const perfil = useSyncExternalStore(assinarPerfil, lerPerfil, lerPerfilNoServidor);
  // A tabela de valores também: preço novo recalcula todo orçamento aberto.
  const catalogo = useSyncExternalStore(assinarCatalogo, lerCatalogo, lerCatalogoNoServidor);
  // Briefing: o roteiro (raro de mudar) e as respostas (mudam a cada reunião).
  const roteiro = useSyncExternalStore(assinarRoteiro, lerRoteiro, lerRoteiroNoServidor);
  const briefings = useSyncExternalStore(assinarBriefings, lerBriefings, lerBriefingsNoServidor);
  const [briefingLead, setBriefingLead] = useState<string | null>(null);
  const [menuPerfil, setMenuPerfil] = useState(false);
  const [perfilAberto, setPerfilAberto] = useState(false);

  const salvarPerfil = (p: Perfil) => {
    guardarPerfil(p);
    setPerfilAberto(false);
  };

  // ── navegação ────────────────────────────────────────────────────────────
  // Um único caminho para trocar de aba, usado pelo clique e pelo deslize, para
  // os dois se comportarem igual. Volta ao topo instantaneamente: rolagem
  // animada aqui só atrasaria a leitura da aba nova.
  const mudarAba = useCallback((t: Tab) => {
    setTab(t);
    setSelected(null);
    window.scrollTo(0, 0);
  }, []);

  const selectProject = (id: string) => {
    setSelected(id);
    setResult(null);
    setQuery("");
    window.scrollTo(0, 0);
  };

  const closeProject = () => {
    // Fechar o projeto descarrega o que a gravação adiada ainda não levou.
    if (selected) void sincronizarProjetoAgora(selected);
    setSelected(null);
    window.scrollTo(0, 0);
  };

  const closeOverlay = () => {
    setOverlay(null);
    setOpenLead(null);
  };

  // ── briefing ─────────────────────────────────────────────────────────────
  /**
   * Abrir já grava.
   *
   * O briefing nasce com os ambientes que dá para adivinhar do texto do lead,
   * e gravar na abertura evita o estado meio-termo de um briefing que existe na
   * tela mas não no armazém.
   */
  const abrirBriefing = (leadId: string) => {
    if (!briefings[leadId]) {
      const lead = leads.find((l) => l.id === leadId);
      guardarBriefing(leadId, briefingInicial(lead?.ambientes ?? "", roteiro));
    }
    setBriefingLead(leadId);
  };

  const salvarBriefing = (fn: (b: TBriefing) => TBriefing) => {
    if (briefingLead) atualizarBriefing(briefingLead, fn);
  };

  const sinaisDeBriefing = useMemo(() => {
    const m: Record<string, { existe: boolean; progresso: ReturnType<typeof progressoDoBriefing> }> = {};
    for (const l of leads) {
      m[l.id] = {
        existe: Boolean(briefings[l.id]),
        progresso: progressoDoBriefing(briefings[l.id], roteiro),
      };
    }
    return m;
  }, [leads, briefings, roteiro]);

  // ── funil ────────────────────────────────────────────────────────────────
  const drop = (stage: StageKey) => {
    const id = dragging;
    setDragOver(null);
    setDragging(null);
    const cliente = id ? clienteDoLead(id) : undefined;
    if (id && cliente) void moverEtapa(id, cliente, stage);
  };

  const advanceLead = () => {
    const cur = leads.find((l) => l.id === openLead);
    const cliente = openLead ? clienteDoLead(openLead) : undefined;
    if (!cur || !openLead || !cliente) return;
    const idx = STAGES.findIndex((st) => st[0] === cur.stage);
    void moverEtapa(openLead, cliente, STAGES[Math.min(idx + 1, STAGES.length - 1)][0]);
  };

  const saveLead = async (nome: string, valor: string) => {
    await criarAtendimento({
      nome,
      origem,
      ambientesTexto: (ambPick.length ? ambPick.join(", ") : "A definir") + " · " + origem,
      valorEstimado: parseInt(String(valor).replace(/[^0-9]/g, ""), 10) || undefined,
    });
    setOverlay(null);
    setTab("funil");
  };

  // ── projeto selecionado ──────────────────────────────────────────────────
  // Toda edição vai para o cache na hora e é gravada com atraso, para digitar
  // nome ou preço não virar uma viagem de rede por tecla.
  const editar = (fn: (p: ProjetoDoBanco) => ProjetoDoBanco) => {
    if (selected) atualizarProjeto(selected, fn);
  };

  const setAmb = (i: number, campo: "nome" | "detalhe", v: string) =>
    editar((p) => ({
      ...p,
      ambientes: p.ambientes.map((a, k) => (k === i ? { ...a, [campo]: v } : a)),
    }));

  const stepAmb = (i: number, dir: number) =>
    editar((p) => ({
      ...p,
      ambientes: p.ambientes.map((a, k) =>
        k === i ? { ...a, etapa: Math.max(0, Math.min(5, a.etapa + dir)) } : a,
      ),
    }));

  const addAmb = () => {
    if (selected) adicionarAmbiente(selected);
  };

  const saveProject = async (fm: {
    name: string;
    client: string;
    address: string;
    budget: string;
    deadline: string;
  }) => {
    await criarProjeto({
      nome: fm.name,
      clienteNome: fm.client,
      endereco: fm.address,
      valorPrevisto: parseInt(String(fm.budget).replace(/[^0-9]/g, ""), 10) || undefined,
      // O prazo é `date` no banco; texto livre do protótipo não converte.
      prazo: null,
      ambientes: ambPick.length ? ambPick : ["Cozinha"],
    });
    setOverlay(null);
    setTab("projetos");
  };


  // ── consulta de preço ────────────────────────────────────────────────────
  const lookup = () => {
    const q = (query || "MDF branco 18mm").toLowerCase();
    const norm = deaccent(q);
    const hit = PRICES.find((p) => norm.includes(deaccent(p[0])));
    const row = hit ?? ["", "R$ 164,50", "por m² · faixa média de mercado", "Estimativa referencial · 6 fornecedores"];
    setResult({ term: query || "MDF branco 18mm", value: row[1], unit: row[2], source: row[3] });
  };

  // ── derivados ────────────────────────────────────────────────────────────
  const decorate = useCallback(
    (p: Project): ProjectVM => {
      // Assinado manda em tudo. Sem contrato, com orçamento lançado vale o
      // total com ART; sem nenhum dos dois, o número digitado no cabeçalho.
      const contrato = p.contratoAssinado ?? valorDeContrato(p.orcamento, p.budget, catalogo);
      // Sem contrato nenhum o denominador é zero e a conta dá NaN.
      const pct = contrato > 0 ? Math.round((p.spent / contrato) * 100) : 0;
      return {
        ...p,
        contrato,
        doOrcamento: temOrcamento(p.orcamento),
        badgeStyle: chip(STATUS_TONE[p.status]),
        budgetLabel: money(contrato),
        spentLabel: money(p.spent),
        saldoLabel: money(contrato - p.spent),
        ambienteTags: p.ambientes.map((a) => a[0]),
        pct,
        pctColor: pct > 92 ? "#9C2B22" : "#A84B1C",
      };
    },
    [catalogo],
  );

  // Um contrato por projeto — o banco garante com `unique` em `projeto_id`.
  const contratoPorProjeto = useMemo(
    () => new Map(contratos.map((c) => [c.projetoId, c])),
    [contratos],
  );

  // Tradução para a forma que os componentes já recebiam.
  const projects: Project[] = useMemo(
    () =>
      doBanco.map((p) => ({
        id: p.id,
        name: p.nome,
        client: p.cliente,
        address: p.endereco,
        status: rotuloDaSituacao(p.situacao),
        stage: p.etapa,
        deadline: prazoLegivel(p.prazo),
        budget: p.valorPrevisto,
        spent: contratoPorProjeto.get(p.id)?.recebido ?? 0,
        imageLabel: "render pendente",
        ambientes: p.ambientes.map(
          (a) =>
            [a.nome, a.detalhe, 0, a.etapa, a.eta || AMB_STEPS[Math.min(a.etapa, 5)]] as Ambiente,
        ),
        stages: linhaDoTempo(p),
        budgetCats: [],
        materials: [],
        orcamento: orcamentoDoProjeto(p),
        contratoAssinado: contratoPorProjeto.get(p.id)?.valor,
      })),
    [doBanco, contratoPorProjeto],
  );

  const decorated = useMemo(() => projects.map(decorate), [projects, decorate]);

  // ── números do topo ──────────────────────────────────────────────────────
  // Contados do que está no banco. Antes eram fixos (18 / 06 / 21), e o
  // dashboard mostrava movimento que não existia.
  const numerosDoTopo = useMemo(() => {
    // "Fechado / Perdido" é o fim da linha nos dois sentidos: quem já assinou
    // virou projeto e quem se perdeu não volta. Nenhum dos dois é atendimento
    // em aberto.
    const noFunil = funil.filter((l) => l.etapa !== "fechado").length;
    const ativos = doBanco.filter(
      (p) => p.situacao === "aguardando" || p.situacao === "andamento",
    );
    // Produção, entrega e montagem — as três etapas em que a fábrica está com
    // o ambiente na mão. Só de projeto ativo: ambiente de projeto cancelado
    // parado no meio do caminho não está em produção nenhuma.
    const emProducao = ativos.reduce(
      (soma, p) => soma + p.ambientes.filter((a) => a.etapa >= 2 && a.etapa <= 4).length,
      0,
    );
    const pad = (n: number) => String(n).padStart(2, "0");
    return [
      [pad(noFunil), "clientes no funil", undefined],
      [pad(ativos.length), "projetos ativos", undefined],
      [pad(emProducao), "ambientes em produção", "#A84B1C"],
    ] as [string, string, string | undefined][];
  }, [funil, doBanco]);

  // ── indicadores da aba de projetos ──────────────────────────────────────
  // Eram fixos no design (06 projetos, R$ 1,84 mi, 03 prazos). Contados do
  // mesmo lugar de onde sai o resto da tela, para não haver dois números.
  const kpisDeProjetos: KpiDeProjetos[] = useMemo(() => {
    const ativos = decorated.filter(
      (p) => p.status !== "Concluído" && p.status !== "Cancelado",
    );
    const ambientes = ativos.reduce(
      (n, p) => n + p.ambientes.filter((a) => a[3] >= 2 && a[3] <= 4).length,
      0,
    );
    // Só projeto com contrato assinado entra em "em execução". Proposta
    // aberta é expectativa, e somá-la aqui inflaria o número da loja.
    const emExecucao = ativos.filter((p) => p.contratoAssinado !== undefined);
    const contratado = emExecucao.reduce((t, p) => t + p.contrato, 0);
    const faturado = emExecucao.reduce((t, p) => t + p.spent, 0);

    // Prazos: contados em dias corridos a partir de hoje. Prazo vencido conta
    // junto — some da tela justo quando ela mais precisa ver.
    const hoje = agora ? new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()) : null;
    const dias = (iso: string | null) => {
      if (!iso || !hoje) return null;
      const [a, m, d] = iso.split("-").map(Number);
      return Math.round((new Date(a, m - 1, d).getTime() - hoje.getTime()) / 86_400_000);
    };
    const prazos = ativos
      .map((p) => dias(doBanco.find((x) => x.id === p.id)?.prazo ?? null))
      .filter((n): n is number => n !== null && n <= 30)
      .sort((x, y) => x - y);
    const maisProximo = prazos[0];

    const pad = (n: number) => String(n).padStart(2, "0");
    return [
      {
        label: "Projetos ativos",
        valor: pad(ativos.length),
        nota: `${ambientes} ${ambientes === 1 ? "ambiente" : "ambientes"} em andamento`,
      },
      {
        label: "Contratos em execução",
        valor: moneyCurto(contratado),
        nota: faturado > 0 ? `${money(faturado)} já faturados` : "nada faturado ainda",
      },
      {
        label: "Prazos nos próximos 30 dias",
        valor: pad(prazos.length),
        nota:
          maisProximo === undefined
            ? "nenhum prazo marcado"
            : maisProximo < 0
              ? `o mais próximo venceu há ${Math.abs(maisProximo)} dias`
              : maisProximo === 0
                ? "há um prazo hoje"
                : `o mais próximo em ${maisProximo} ${maisProximo === 1 ? "dia" : "dias"}`,
        cor: prazos.length > 0 ? "#9C2B22" : undefined,
      },
    ];
  }, [decorated, doBanco, agora]);

  // A meta do mês corrente. Enquanto ela não definir uma em Ajustes, a barra
  // some: 0% de meta nenhuma seria uma cobrança inventada.
  const metaDoMes = useMemo(() => {
    const mes = mesCorrente(agora);
    const m = metas.find((x) => x.mes === mes);
    if (!m || !(m.meta > 0)) return null;
    return { ...m, rotulo: nomeDoMes(mes), pct: Math.min(100, Math.round(m.pct)) };
  }, [metas, agora]);

  // O funil mostra o valor do orçamento quando o lead já virou projeto. Sem
  // vínculo, continua a estimativa que ela digitou ao cadastrar o contato.
  const leadsVM = useMemo(
    () =>
      leads.map((l) => {
        if (!l.projetoId) return l;
        const p = decorated.find((x) => x.id === l.projetoId);
        return p?.doOrcamento ? { ...l, value: Math.round(p.contrato) } : l;
      }),
    [leads, decorated],
  );
  const sel = projects.find((p) => p.id === selected) ?? null;
  // O briefing mora no lead; o projeto chega nele pelo vínculo criado no funil.
  const leadDoProjeto = leads.find((l) => l.projetoId === selected) ?? null;
  // Da lista já decorada, não da crua: senão o cartão do funil mostra o valor
  // do orçamento e a gaveta do mesmo lead mostra a estimativa antiga.
  const leadSel = leadsVM.find((l) => l.id === openLead) ?? null;

  const orcamentoCalculado = useMemo(
    () => (sel ? calcularProjeto(sel.orcamento, catalogo) : null),
    [sel, catalogo],
  );

  const detail = useMemo(() => {
    if (!sel) return null;
    return {
      ...decorate(sel),
      ambienteCount: sel.ambientes.length,
      // O total vivo do orçamento, separado do valor do contrato: com contrato
      // assinado os dois divergem quando a tabela é reajustada depois, e o
      // painel de contrato mostra a diferença em vez de escondê-la.
      orcamentoTotal: orcamentoCalculado?.totalComArt ?? 0,
      rawBudget: sel.budget.toLocaleString("pt-BR"),
      prazoISO: doBanco.find((p) => p.id === sel.id)?.prazo ?? "",
      // O valor do ambiente é calculado do orçamento, não digitado: era a
      // segunda fonte que podia discordar do painel logo abaixo.
      ambientesVM: sel.ambientes.map(([name, dtl, , step, eta], i) => {
        const calc = orcamentoCalculado?.ambientes[i];
        return {
          name,
          detail: dtl,
          valueLabel: calc ? brl(calc.totalComArt) : money(0),
          eta,
          status: AMB_STEPS[Math.min(step, 5)],
          onName: (e: React.ChangeEvent<HTMLInputElement>) => setAmb(i, "nome", e.target.value),
          onDetail: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setAmb(i, "detalhe", e.target.value),
          up: () => stepAmb(i, 1),
          down: () => stepAmb(i, -1),
          steps: AMB_STEPS.map((_, k) => ({
            color: k <= step ? (step >= 5 ? "#6B7040" : "#A84B1C") : "#EDEAE2",
          })),
        };
      }),
      stagesVM: sel.stages.map(([label, date, st], i) => ({
        label,
        date,
        textColor: st === "todo" ? "#9A9689" : "#23231F",
        dotStyle: {
          width: st === "current" ? 15 : 13,
          height: st === "current" ? 15 : 13,
          borderRadius: 999,
          flex: "none",
          ...(st === "done"
            ? { background: "#A84B1C" }
            : st === "current"
              ? { background: "#FFFFFF", border: "3px solid #A84B1C" }
              : { background: "#FFFFFF", border: "2px solid #DDD9CE" }),
        } as React.CSSProperties,
        lineStyle: {
          height: 2,
          flex: 1,
          background: st === "done" ? "#A84B1C" : "#EDEAE2",
          ...(i === 5 ? { display: "none" } : null),
        } as React.CSSProperties,
      })),
      // Com orçamento, o painel de categorias vira composição por bloco: custo
      // contra venda, que é a conta que ela realmente faz. A barra desenha a
      // margem. Sem orçamento, segue orçado × gasto por categoria.
      composicaoVM: temOrcamento(sel.orcamento)
        ? composicao(sel.orcamento, catalogo).map((c, i) => ({
            label: c.label,
            custoLabel: money(c.custo),
            vendaLabel: money(c.venda),
            pct: Math.round(c.margem * 100),
            color: CAT_COLORS[i % CAT_COLORS.length],
          }))
        : null,
      budgetVM: sel.budgetCats.map(([label, planned, spent], i) => ({
        label,
        plannedLabel: money(planned),
        spentLabel: money(spent),
        pct: Math.round((spent / planned) * 100),
        color: CAT_COLORS[i % CAT_COLORS.length],
      })),
      // As linhas do orçamento entram na lista de compras junto com os itens
      // lançados à mão, agrupadas por item e marcadas com a origem.
      materialsVM: [
        ...materiais(sel.orcamento, catalogo).map((m) => ({
          name: m.nome,
          spec: m.spec,
          category: m.categoria,
          qty: m.qtd,
          unitLabel: money(m.unitario),
          totalLabel: money(m.total),
          doOrcamento: true,
        })),
        ...sel.materials.map(([name, spec, category, qty, unit, total]) => ({
          name,
          spec,
          category,
          qty,
          unitLabel: money(unit),
          totalLabel: money(total),
          doOrcamento: false,
        })),
      ],
      materialsCount: materiais(sel.orcamento, catalogo).length + sel.materials.length,
    };
    // setAmb/stepAmb são estáveis o bastante para o escopo do protótipo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, decorate, catalogo]);

  const showDetail = tab === "projetos" && !!sel;
  const showList = tab === "projetos" && !sel;

  const gridStyle: React.CSSProperties =
    projetoLayout === "lista"
      ? { display: "grid", gridTemplateColumns: "1fr", gap: 18 }
      : {
          display: "grid",
          // `min(340px, 100%)` e não `340px`: numa tela de 320 a faixa não
          // conseguiria encolher e o cartão vazaria para fora do viewport.
          gridTemplateColumns: "repeat(auto-fill, minmax(min(340px, 100%), 1fr))",
          gap: 22,
        };

  // ── deslizar entre abas (celular) ────────────────────────────────────────
  const irParaVizinha = useCallback(
    (direcao: 1 | -1) => {
      const i = TABS.findIndex(([k]) => k === tab);
      const j = i + direcao;
      // sem dar a volta: parar na ponta deixa claro onde você está
      if (j < 0 || j >= TABS.length) return;
      mudarAba(TABS[j][0]);
    },
    [tab, mudarAba],
  );

  const refDeslize = useDeslizarAbas({
    aoDeslizar: irParaVizinha,
    ativo: !overlay && !openLead && !perfilAberto && !menuPerfil,
  });

  // mantém a aba ativa visível na faixa que rola
  const refAbas = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const alvo = refAbas.current?.querySelector<HTMLElement>('[data-ativa="true"]');
    if (!alvo) return;
    const reduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    alvo.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: reduzirMovimento ? "auto" : "smooth",
    });
  }, [tab]);

  return (
    <div
      className="dash-root"
      style={{
        fontFamily: "var(--font-manrope), Manrope, Helvetica, sans-serif",
        color: "#23231F",
        minHeight: "100vh",
        background: "linear-gradient(150deg, #D6CEC5 0%, #CDC2B7 50%, #D6C9BD 100%)",
      }}
    >
      <div
        ref={refDeslize}
        className="dash-shell"
        style={{
          background:
            "linear-gradient(155deg, #FAF8F3 0%, #F6F2EA 32%, #F4ECE3 62%, #EEE0D4 82%, #E8D6C7 100%)",
          boxShadow: "0 30px 70px rgba(46,52,48,.22), inset 0 1px 0 rgba(255,255,255,.7)",
        }}
      >
        {/* ── barra superior ─────────────────────────────────────────────── */}
        <div className="dash-topbar">
          <LogoTerracota />

          <div className="dash-tabs" ref={refAbas} role="tablist">
            {TABS.map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                data-ativa={tab === key}
                onClick={() => mudarAba(key)}
                style={tabStyle(tab === key)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="dash-actions">
            <button
              className="dash-btn-notif"
              onClick={() => setOverlay("notif")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                width: 40,
                height: 40,
                background: overlay === "notif" ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.5)",
              }}
              aria-label="Avisos"
            >
              <span
                style={{
                  position: "relative",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 16,
                  height: 16,
                }}
              >
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 999,
                    border: "1.6px solid #4A473F",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    top: -1,
                    right: -2,
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    background: "#9C2B22",
                    border: "1.5px solid #F4F3EE",
                  }}
                />
              </span>
            </button>
            <button
              className="dash-btn-new"
              onClick={() => setOverlay("novo")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                border: "none",
                background: overlay === "novo" ? "#A84B1C" : "#6B7040",
                color: "#F4F3EE",
                borderRadius: 999,
                padding: "12px 22px",
                fontSize: "13px",
                fontWeight: 600,
                transition: "all .18s ease",
                boxShadow: "0 4px 14px rgba(35,35,31,.16)",
              }}
            >
              <span style={{ fontSize: "15px", lineHeight: 1, fontWeight: 400 }}>+</span>
              {/* no celular o rótulo curto libera os ~130px que a marca e a
                  pílula do perfil precisam para caber na mesma linha */}
              <span className="dash-so-desktop">Novo atendimento</span>
              <span className="dash-so-celular">Novo</span>
            </button>

            <div className="dash-brand">
              {/* só avatar e seta: a marca ocupa o canto esquerdo, e o nome
                  já aparece na saudação e no cabeçalho do próprio menu */}
              <button
                className="dash-brand-btn"
                onClick={() => setMenuPerfil((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuPerfil}
                aria-label={`Conta de ${perfil.nome}`}
                title={perfil.nome}
              >
                <Avatar perfil={perfil} />
                <span className="dash-brand-seta" aria-hidden>
                  ▾
                </span>
              </button>
              {menuPerfil && (
                <PerfilMenu
                  perfil={perfil}
                  onClose={() => setMenuPerfil(false)}
                  onEditar={() => {
                    setMenuPerfil(false);
                    setPerfilAberto(true);
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* ── saudação e indicadores ─────────────────────────────────────── */}
        <div className="dash-hero">
          <div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: "11px",
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: "#8C887C",
              }}
            >
              {dataPorExtenso(agora)}
            </div>
            <h1
              style={{
                fontWeight: 500,
                letterSpacing: "-0.04em",
                lineHeight: 1.02,
                margin: "14px 0 0",
              }}
            >
              {saudacao(agora)}, {primeiroNome(perfil.nome)}
            </h1>
            <div className="dash-hero-meta">
              {metaDoMes ? (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      background: "#6B7040",
                      color: "#F4F3EE",
                      borderRadius: 999,
                      padding: "8px 16px",
                      fontSize: "12.5px",
                      fontWeight: 600,
                    }}
                  >
                    Meta de {metaDoMes.rotulo} · {metaDoMes.pct}%
                  </div>
                  <div
                    style={{
                      width: 220,
                      height: 10,
                      borderRadius: 999,
                      background: "rgba(255,255,255,.65)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: metaDoMes.pct + "%",
                        borderRadius: 999,
                        background: metaDoMes.pct >= 100 ? "#6B7040" : "#A84B1C",
                      }}
                    />
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: "11px", color: "#6E6A5F" }}>
                    {metaDoMes.falta > 0 ? "faltam " + money(metaDoMes.falta) : "meta batida"}
                  </div>
                </>
              ) : (
                <button
                  className="dash-btn-link"
                  onClick={() => mudarAba("ajustes")}
                  style={{ fontSize: "12.5px", color: "#6E6A5F" }}
                >
                  Defina a meta do mês em Ajustes →
                </button>
              )}
            </div>
          </div>
          <div className="dash-hero-stats">
            {numerosDoTopo.map(([n, label, color]) => (
              <div key={label}>
                <div
                  style={{
                    fontSize: "44px",
                    fontWeight: 500,
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                    ...NUM,
                    ...(color ? { color } : null),
                  }}
                >
                  {n}
                </div>
                <div style={{ fontSize: "12.5px", color: "#6E6A5F", marginTop: 6 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {tab === "funil" && (
          <Funil
            leads={leadsVM}
            briefings={sinaisDeBriefing}
            dragOver={dragOver}
            dragging={dragging}
            setDragOver={setDragOver}
            setDragging={setDragging}
            onDrop={drop}
            onOpenLead={setOpenLead}
          />
        )}
        {showList && (
          <ProjetosLista
            projects={decorated}
            kpis={kpisDeProjetos}
            gridStyle={gridStyle}
            onOpen={selectProject}
            onNewProject={() => setOverlay("projeto")}
          />
        )}
        {showDetail && detail && (
          <ProjetoDetalhe
            sel={detail}
            onClose={closeProject}
            onName={(e) => {
              const v = e.target.value;
              editar((p) => ({ ...p, nome: v }));
            }}
            onClient={() => {
              // O cliente é entidade própria agora: trocar o nome aqui
              // renomearia a pessoa em todo o histórico. Isso passa a ser
              // edição da ficha do cliente, quando ela existir.
            }}
            onAddress={(e) => {
              const v = e.target.value;
              editar((p) => ({ ...p, endereco: v }));
            }}
            onDeadline={(e) => {
              const v = e.target.value;
              editar((p) => ({ ...p, prazo: v || null }));
            }}
            onBudget={(e) => {
              const v = parseInt(String(e.target.value).replace(/[^0-9]/g, ""), 10) || 0;
              editar((p) => ({ ...p, valorPrevisto: v }));
            }}
            onAddAmbiente={addAmb}
            query={query}
            onQuery={(e) => setQuery(e.target.value)}
            onSearch={lookup}
            result={result}
            onOrcamento={(orcamento) => {
              if (selected) aplicarOrcamento(selected, orcamento);
            }}
            briefing={leadDoProjeto ? (briefings[leadDoProjeto.id] ?? null) : null}
            onAbrirBriefing={() => leadDoProjeto && abrirBriefing(leadDoProjeto.id)}
          />
        )}
        {tab === "comissao" && <Comissao projects={decorated} />}
        {tab === "agenda" && <Agenda />}
        {tab === "financeiro" && <Financeiro projects={decorated} />}
        {tab === "posvenda" && <PosVenda />}
        {tab === "ajustes" && <Ajustes />}
      </div>

      {overlay === "projeto" && (
        <NovoProjeto
          ambPick={ambPick}
          onToggleAmb={(a) =>
            setAmbPick((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]))
          }
          onClose={closeOverlay}
          onSave={saveProject}
        />
      )}
      {leadSel && (
        <LeadDrawer
          lead={leadSel}
          onClose={closeOverlay}
          onAdvance={advanceLead}
          briefing={sinaisDeBriefing[leadSel.id]}
          onBriefing={() => abrirBriefing(leadSel.id)}
        />
      )}
      {briefingLead && (
        <Briefing
          cliente={leads.find((l) => l.id === briefingLead)?.name ?? "Cliente"}
          briefing={briefings[briefingLead] ?? briefingInicial("", roteiro)}
          roteiro={roteiro}
          onChange={salvarBriefing}
          onClose={() => {
            // Sai da tela, mas não sem antes descarregar o que a gravação
            // adiada ainda não levou.
            void sincronizarAgora(briefingLead);
            setBriefingLead(null);
          }}
        />
      )}
      {overlay === "notif" && <Avisos onClose={closeOverlay} />}
      {perfilAberto && (
        <PerfilModal
          perfil={perfil}
          onClose={() => setPerfilAberto(false)}
          onSave={salvarPerfil}
        />
      )}
      {overlay === "novo" && (
        <NovoAtendimento
          origem={origem}
          onOrigem={setOrigem}
          ambPick={ambPick}
          onToggleAmb={(a) =>
            setAmbPick((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]))
          }
          onClose={closeOverlay}
          onSave={saveLead}
        />
      )}
    </div>
  );
}
