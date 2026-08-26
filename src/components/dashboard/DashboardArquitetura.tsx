"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  AMB_STEPS,
  CAT_COLORS,
  LEADS,
  PRICES,
  PROJECTS,
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
} from "@/lib/briefing/armazem";
import type { Briefing as TBriefing } from "@/lib/briefing/tipos";
import { MONO, NUM, tabStyle } from "./ui";
import Avatar from "./Avatar";
import LogoTerracota from "./LogoTerracota";
import PerfilMenu from "./PerfilMenu";
import PerfilModal from "./PerfilModal";
import Funil from "./Funil";
import ProjetosLista from "./ProjetosLista";
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
  const [selected, setSelected] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>(PROJECTS);
  const [leads, setLeads] = useState<Lead[]>(LEADS);

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
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, stage, idle: 0 } : l)));
  };

  const advanceLead = () => {
    setLeads((ls) => {
      const cur = ls.find((l) => l.id === openLead);
      if (!cur) return ls;
      const idx = STAGES.findIndex((st) => st[0] === cur.stage);
      const next = STAGES[Math.min(idx + 1, STAGES.length - 1)][0];
      return ls.map((l) => (l.id === openLead ? { ...l, stage: next, idle: 0 } : l));
    });
  };

  const saveLead = (nome: string, valor: string) => {
    setLeads((ls) => [
      {
        id: "n" + Date.now(),
        name: nome.trim() || "Cliente sem nome",
        value: parseInt(String(valor).replace(/\D/g, ""), 10) || 45000,
        idle: 0,
        ambientes: (ambPick.length ? ambPick.join(", ") : "A definir") + " · " + origem,
        stage: "lead",
      },
      ...ls,
    ]);
    setOverlay(null);
    setTab("funil");
  };

  // ── projeto selecionado ──────────────────────────────────────────────────
  const updProj = useCallback(
    (fn: (p: Project) => Project) => {
      setProjects((ps) => ps.map((p) => (p.id === selected ? fn({ ...p }) : p)));
    },
    [selected],
  );

  const setField = <K extends keyof Project>(key: K, v: Project[K]) =>
    updProj((p) => {
      p[key] = v;
      return p;
    });

  const setAmb = (i: number, j: number, v: string | number) =>
    updProj((p) => {
      p.ambientes = p.ambientes.map((a, k) =>
        k === i ? (a.map((x, m) => (m === j ? v : x)) as Ambiente) : a,
      );
      return p;
    });

  const stepAmb = (i: number, dir: number) =>
    updProj((p) => {
      p.ambientes = p.ambientes.map((a, k) =>
        k === i
          ? (a.map((x, m) =>
              m === 3 ? Math.max(0, Math.min(5, (x as number) + dir)) : x,
            ) as Ambiente)
          : a,
      );
      return p;
    });

  const addAmb = () =>
    updProj((p) => {
      p.ambientes = [...p.ambientes, ["Novo ambiente", "Descrever marcenaria", 0, 0, "a definir"]];
      return p;
    });

  const addMaterial = (m: { name: string; spec: string; qty: string; unit: string }) => {
    if (!m.name) return;
    const qty = m.qty || "1 un";
    const unit = parseInt(String(m.unit).replace(/\D/g, ""), 10) || 0;
    const n = parseFloat(String(qty).replace(",", ".")) || 1;
    updProj((p) => {
      p.materials = [...p.materials, [m.name, m.spec || "—", "Materiais", qty, unit, Math.round(unit * n)]];
      return p;
    });
  };

  const saveProject = (fm: {
    name: string;
    client: string;
    address: string;
    budget: string;
    deadline: string;
  }) => {
    const budget = parseInt(String(fm.budget).replace(/\D/g, ""), 10) || 0;
    const picked = ambPick.length ? ambPick : ["Cozinha"];
    const each = Math.round(budget / picked.length);
    const id = "np" + Date.now();
    const proj: Project = {
      id,
      name: fm.name.trim() || "Projeto sem nome",
      client: fm.client.trim() || "Cliente a definir",
      address: fm.address.trim() || "Endereço a definir",
      status: "Aguardando aprovação",
      stage: "Medição e projeto",
      deadline: fm.deadline.trim() || "a definir",
      budget: budget || 1,
      spent: 0,
      imageLabel: "render pendente",
      ambientes: picked.map((a) => [a, "Descrever marcenaria", each, 0, "aguardando medição"]),
      stages: [
        ["Briefing", "hoje", "current"],
        ["Projeto", "a definir", "todo"],
        ["Aprovação", "a definir", "todo"],
        ["Produção", "a definir", "todo"],
        ["Entrega", "a definir", "todo"],
        ["Montagem", "a definir", "todo"],
      ],
      budgetCats: [
        ["Materiais", Math.round(budget * 0.35), 0],
        ["Mão de obra", Math.round(budget * 0.25), 0],
        ["Mobiliário", Math.round(budget * 0.25), 0],
        ["Iluminação", Math.round(budget * 0.1), 0],
        ["Decoração", Math.round(budget * 0.05), 0],
      ],
      materials: [],
      // Um ambiente vazio por cômodo escolhido — a mesma ideia de duplicar a
      // aba "Modelo", só que já sem as fórmulas quebradas dela.
      orcamento: picked.map((a, i) => ({
        id: id + "-a" + i,
        nome: a,
        chapas: [],
        fita: [],
        acessorios: [],
        maoDeObra: [],
      })),
    };
    setProjects((ps) => [proj, ...ps]);
    setOverlay(null);
    setTab("projetos");
    setSelected(id);
    window.scrollTo(0, 0);
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
      // Com orçamento lançado, o contrato é o total com ART; sem ele, continua
      // valendo o número digitado no cabeçalho do projeto.
      const contrato = valorDeContrato(p.orcamento, p.budget, catalogo);
      const pct = Math.round((p.spent / contrato) * 100);
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

  const decorated = useMemo(() => projects.map(decorate), [projects, decorate]);

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

  const detail = useMemo(() => {
    if (!sel) return null;
    return {
      ...decorate(sel),
      ambienteCount: sel.ambientes.length,
      rawBudget: sel.budget.toLocaleString("pt-BR"),
      ambientesVM: sel.ambientes.map(([name, dtl, value, step, eta], i) => ({
        name,
        detail: dtl,
        valueLabel: money(value),
        eta,
        rawValue: value.toLocaleString("pt-BR"),
        status: AMB_STEPS[Math.min(step, 5)],
        onName: (e: React.ChangeEvent<HTMLInputElement>) => setAmb(i, 0, e.target.value),
        onDetail: (e: React.ChangeEvent<HTMLTextAreaElement>) => setAmb(i, 1, e.target.value),
        onValue: (e: React.ChangeEvent<HTMLInputElement>) =>
          setAmb(i, 2, parseInt(String(e.target.value).replace(/\D/g, ""), 10) || 0),
        up: () => stepAmb(i, 1),
        down: () => stepAmb(i, -1),
        steps: AMB_STEPS.map((_, k) => ({
          color: k <= step ? (step >= 5 ? "#6B7040" : "#A84B1C") : "#EDEAE2",
        })),
      })),
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
      : { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 22 };

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
              Segunda, 24 de agosto de 2026
            </div>
            <h1
              style={{
                fontWeight: 500,
                letterSpacing: "-0.04em",
                lineHeight: 1.02,
                margin: "14px 0 0",
              }}
            >
              Bom dia, {primeiroNome(perfil.nome)}
            </h1>
            <div className="dash-hero-meta">
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
                Meta de agosto · 84%
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
                <div style={{ height: "100%", width: "84%", borderRadius: 999, background: "#A84B1C" }} />
              </div>
              <div style={{ fontFamily: MONO, fontSize: "11px", color: "#6E6A5F" }}>
                faltam R$ 51.600
              </div>
            </div>
          </div>
          <div className="dash-hero-stats">
            {[
              ["18", "clientes no funil", undefined],
              ["06", "projetos ativos", undefined],
              ["21", "ambientes em produção", "#A84B1C"],
            ].map(([n, label, color]) => (
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
            gridStyle={gridStyle}
            onOpen={selectProject}
            onNewProject={() => setOverlay("projeto")}
          />
        )}
        {showDetail && detail && (
          <ProjetoDetalhe
            sel={detail}
            onClose={closeProject}
            onName={(e) => setField("name", e.target.value)}
            onClient={(e) => setField("client", e.target.value)}
            onAddress={(e) => setField("address", e.target.value)}
            onDeadline={(e) => setField("deadline", e.target.value)}
            onBudget={(e) =>
              setField("budget", parseInt(String(e.target.value).replace(/\D/g, ""), 10) || 0)
            }
            onAddAmbiente={addAmb}
            query={query}
            onQuery={(e) => setQuery(e.target.value)}
            onSearch={lookup}
            result={result}
            onAddMaterial={addMaterial}
            onOrcamento={(orcamento) => setField("orcamento", orcamento)}
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
          onClose={() => setBriefingLead(null)}
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
