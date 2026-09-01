"use client";

import { useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import type { Briefing } from "@/lib/briefing/tipos";
import type { OrcamentoAmbiente } from "@/lib/orcamento/tipos";
import type { ProjectVM, PriceResult } from "./DashboardArquitetura";
import type { StatusDosProjetos } from "@/lib/dados/projetos";
import BriefingResumo from "./BriefingResumo";
import ContratoPainel from "./ContratoPainel";
import Orcamento from "./Orcamento";
import SecaoDobravel from "./SecaoDobravel";
import { MONO, NUM, colLabel, mono } from "./ui";

type AmbienteVM = {
  name: string;
  detail: string;
  /** Calculado do orçamento do ambiente — não é mais digitável. */
  valueLabel: string;
  eta: string;
  status: string;
  prazos: {
    tipo: string;
    rotulo: string;
    previsto: string;
    feito: boolean;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  }[];
  onName: (e: ChangeEvent<HTMLInputElement>) => void;
  onDetail: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  up: () => void;
  down: () => void;
  steps: { color: string }[];
};

export type DetalheVM = ProjectVM & {
  ambienteCount: number;
  orcamentoTotal: number;
  rawBudget: string;
  ambientesVM: AmbienteVM[];
  stagesVM: {
    label: string;
    date: string;
    /** O estado já derivado pela camada de dados, para o resumo do bloco. */
    estado: "done" | "current" | "todo" | "dispensado";
    previsto: string;
    feito: boolean;
    dispensado: boolean;
    textColor: string;
    dotStyle: CSSProperties;
    lineStyle: CSSProperties;
    onPrevisto: (e: ChangeEvent<HTMLInputElement>) => void;
    onFeito: () => void;
    onDispensar: () => void;
  }[];
  /** Composição por bloco do orçamento; `null` quando o projeto não tem um. */
  composicaoVM:
    | { label: string; custoLabel: string; vendaLabel: string; pct: number; color: string }[]
    | null;
  materialsVM: {
    name: string;
    spec: string;
    category: string;
    qty: string;
    unitLabel: string;
    totalLabel: string;
    doOrcamento: boolean;
  }[];
  materialsCount: number;
  /** ISO do prazo, para o seletor de data. Vazio quando ainda nao ha prazo. */
  prazoISO: string;
  situacao: string;
  /** ART entra no total deste projeto. */
  comArt: boolean;
  /** As situacoes possiveis, ja rotuladas. Vem da camada de dados. */
  situacoes: [string, string][];
};

const MAT_COLS = "2.4fr 1.2fr 0.8fr 1fr 1fr";

/**
 * "3 de 6 etapas · em Produção" — o que a linha do tempo diz sem abrir.
 *
 * Dispensada não conta como pendente nem como feita: sai do total, senão o
 * projeto que chegou pronto pareceria eternamente incompleto.
 */
function resumoDaLinha(
  etapas: { estado: "done" | "current" | "todo" | "dispensado"; label: string }[],
): string {
  const valem = etapas.filter((e) => e.estado !== "dispensado");
  const feitas = valem.filter((e) => e.estado === "done").length;
  const atual = valem.find((e) => e.estado === "current");
  const contagem = feitas + " de " + valem.length + " etapas";
  return atual ? contagem + " · em " + atual.label : contagem + " · concluído";
}

/**
 * O nome do cliente.
 *
 * Estado local, gravado ao sair do campo ou no Enter — não a cada tecla. A
 * gravação renomeia o cliente em todo o histórico e recarrega dois armazéns;
 * por tecla digitada seria uma ida ao banco por letra, com o cursor pulando
 * de volta no meio da palavra.
 *
 * A `key` do projeto descarta o rascunho ao trocar de projeto: sem ela, abrir
 * outro herdaria o nome que ficou digitado no anterior. Esc desiste.
 */
function CampoCliente({
  id,
  nome,
  onSalvar,
}: {
  id: string;
  nome: string;
  onSalvar: (nome: string) => void;
}) {
  const [rascunho, setRascunho] = useState(nome);
  const gravar = () => {
    if (rascunho.trim() && rascunho.trim() !== nome) onSalvar(rascunho);
    // Campo apagado volta ao nome que estava: cliente sem nome some das
    // listas que ordenam por ele.
    else setRascunho(nome);
  };
  return (
    <input
      key={id}
      className="dash-inline"
      value={rascunho}
      onChange={(e) => setRascunho(e.target.value)}
      onBlur={gravar}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") setRascunho(nome);
      }}
      aria-label="Nome do cliente"
      style={{ fontSize: "14px", width: 220 }}
    />
  );
}

export default function ProjetoDetalhe({
  sel,
  onClose,
  onName,
  onClient,
  onAddress,
  onDeadline,
  onSituacao,
  onComArt,
  onBudget,
  onAddAmbiente,
  query,
  onQuery,
  onSearch,
  result,
  onOrcamento,
  briefing,
  onAbrirBriefing,
  status,
}: {
  sel: DetalheVM;
  onClose: () => void;
  onName: (e: ChangeEvent<HTMLInputElement>) => void;
  onClient: (nome: string) => void;
  onAddress: (e: ChangeEvent<HTMLInputElement>) => void;
  onDeadline: (e: ChangeEvent<HTMLInputElement>) => void;
  onSituacao: (e: ChangeEvent<HTMLSelectElement>) => void;
  onComArt: (v: boolean) => void;
  onBudget: (e: ChangeEvent<HTMLInputElement>) => void;
  onAddAmbiente: () => void;
  query: string;
  onQuery: (e: ChangeEvent<HTMLInputElement>) => void;
  onSearch: () => void;
  result: PriceResult | null;
  onOrcamento: (a: OrcamentoAmbiente[]) => void;
  /** Briefing do lead que originou este projeto, quando existe o vínculo. */
  briefing: Briefing | null;
  onAbrirBriefing: () => void;
  /** Falha de leitura ou gravação do armazém de projetos. */
  status: StatusDosProjetos;
}) {
  return (
    <div className="dash-tabpad" style={{ maxWidth: 1440 }}>
      <button
        className="dash-btn-ghost"
        onClick={onClose}
        style={{ background: "#FFFFFF", borderRadius: 999, padding: "9px 16px", fontSize: "12.5px" }}
      >
        ← Voltar aos projetos
      </button>

      {/* Os controles de prazo e da linha do tempo gravam no banco; se a
          gravação está falhando, ela precisa saber aqui, não só na lista. */}
      {status.erro && (
        <div role="alert" className="dash-recado dash-recado-erro" style={{ marginTop: 16 }}>
          {status.erro}
        </div>
      )}
      {status.aviso && !status.erro && (
        <div role="status" className="dash-recado dash-recado-aviso" style={{ marginTop: 16 }}>
          {status.aviso}
        </div>
      )}

      {/* ── cabeçalho editável ──────────────────────────────────────────── */}
      <div className="dash-proj-head">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              className="dash-inline"
              value={sel.name}
              onChange={onName}
              style={{
                fontSize: "30px",
                fontWeight: 600,
                letterSpacing: "-0.03em",
                width: 420,
              }}
            />
            <span style={sel.badgeStyle}>{sel.status}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
            <CampoCliente id={sel.id} nome={sel.client} onSalvar={onClient} />
            <span style={{ fontSize: "14px", color: "#B4AFA1" }}>·</span>
            <input
              className="dash-inline"
              value={sel.address}
              onChange={onAddress}
              style={{ fontSize: "14px", width: 240 }}
            />
          </div>
        </div>
        <div className="dash-proj-head-nums">
          <div style={{ flex: "none" }}>
            <div style={mono(10, "#9A9689", { ls: "0.07em", upper: true })}>Contrato</div>
            {sel.doOrcamento ? (
              // Com orçamento lançado o contrato deixa de ser digitável: quem
              // manda no número passa a ser o painel de orçamento lá embaixo.
              <>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: 600,
                    marginTop: 6,
                    letterSpacing: "-0.02em",
                    whiteSpace: "nowrap",
                    ...NUM,
                  }}
                >
                  {sel.budgetLabel}
                </div>
                <div style={{ ...mono(10, "#A84B1C"), marginTop: 3 }}>
                  do orçamento · {sel.comArt ? "com ART" : "sem ART"}
                </div>
              </>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 4,
                  marginTop: 6,
                  flexWrap: "nowrap",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ fontSize: "24px", fontWeight: 600, letterSpacing: "-0.02em" }}>
                  R$
                </span>
                <input
                  className="dash-inline dash-inline-apos-rotulo"
                  value={sel.rawBudget}
                  onChange={onBudget}
                  style={{
                    fontSize: "24px",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    width: 118,
                    ...NUM,
                  }}
                />
              </div>
            )}
          </div>
          <div>
            <div style={mono(10, "#9A9689", { ls: "0.07em", upper: true })}>Faturado</div>
            <div
              style={{
                fontSize: "24px",
                fontWeight: 600,
                marginTop: 6,
                letterSpacing: "-0.02em",
                color: "#A84B1C",
                whiteSpace: "nowrap",
                ...NUM,
              }}
            >
              {sel.spentLabel}
            </div>
          </div>
          <div>
            <div style={mono(10, "#9A9689", { ls: "0.07em", upper: true })}>Prazo</div>
            {/* Seletor de data, não texto livre. Antes o campo mostrava
                "18 set 2026" e mandava esse texto cru para uma coluna `date`
                do Postgres, que recusava a gravação inteira. */}
            <input
              className="dash-inline"
              type="date"
              value={sel.prazoISO}
              onChange={onDeadline}
              aria-label="Prazo do projeto"
              style={{
                fontSize: "19px",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                marginTop: 8,
                ...NUM,
              }}
            />
          </div>
          <div>
            <div style={mono(10, "#9A9689", { ls: "0.07em", upper: true })}>Situação</div>
            {/* Faltava desde sempre: todo projeto nascia "Aguardando
                aprovação" e não havia por onde mudar. */}
            <select
              className="dash-select"
              value={sel.situacao}
              onChange={onSituacao}
              aria-label="Situação do projeto"
              style={{ marginTop: 8, fontSize: "13.5px", fontWeight: 600, width: "auto" }}
            >
              {sel.situacoes.map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── ambientes ───────────────────────────────────────────────────── */}
      <SecaoDobravel
        id="ambientes"
        titulo="Ambientes do projeto"
        resumo={sel.ambienteCount + " ambientes · " + sel.budgetLabel}
        acoes={
          <button
            className="dash-btn-outline"
            onClick={onAddAmbiente}
            style={{ borderRadius: 999, padding: "8px 15px", fontSize: "12.5px" }}
          >
            + Ambiente
          </button>
        }
      >
        <div className="dash-amb-grid">
          {sel.ambientesVM.map((a, i) => (
            <div
              key={i}
              style={{
                border: "1px solid rgba(255,255,255,.9)",
                background: "rgba(255,255,255,.5)",
                borderRadius: 20,
                padding: "20px 22px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    className="dash-inline"
                    value={a.name}
                    onChange={a.onName}
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      letterSpacing: "-0.01em",
                      width: "100%",
                    }}
                  />
                  <textarea
                    className="dash-inline"
                    value={a.detail}
                    onChange={a.onDetail}
                    rows={2}
                    style={{
                      fontSize: "12px",
                      lineHeight: 1.45,
                      color: "#8C887C",
                      width: "100%",
                      marginTop: 2,
                      resize: "none",
                      overflow: "hidden",
                    }}
                  />
                </div>
                {/* Sai do orçamento do ambiente. Digitável seria uma segunda
                    fonte para o mesmo número. */}
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    flex: "none",
                    textAlign: "right",
                    ...NUM,
                  }}
                >
                  {a.valueLabel}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 18 }}>
                {a.steps.map((s, k) => (
                  <div
                    key={k}
                    style={{ flex: 1, height: 5, borderRadius: 999, background: s.color }}
                  />
                ))}
              </div>

              {/* ── prazos de fábrica ──────────────────────────────────
                  Produção, entrega e montagem. Ela preenche à mão — não há
                  integração com a fábrica, e foi decisão dela não sincronizar
                  com calendário nenhum.

                  Estas três datas são o que alimenta a coluna "Entregas e
                  montagens" da agenda; a de montagem, quando a etapa chega a
                  "Concluído", é de onde a garantia começa a contar. */}
              <div className="dash-amb-prazos">
                {a.prazos.map((m) => (
                  <label key={m.tipo} style={{ display: "block", minWidth: 0 }}>
                    <span
                      style={{
                        fontFamily: MONO,
                        fontSize: "9.5px",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: m.feito ? "#6B7040" : "#9A9689",
                      }}
                    >
                      {m.rotulo}
                      {m.feito ? " ✓" : ""}
                    </span>
                    <input
                      className="dash-field dash-field-sm"
                      type="date"
                      value={m.previsto}
                      onChange={m.onChange}
                      aria-label={"Previsão de " + m.rotulo.toLowerCase() + " · " + a.name}
                      style={{
                        width: "100%",
                        marginTop: 3,
                        padding: "6px 8px",
                        fontSize: "11.5px",
                        borderRadius: 9,
                        ...NUM,
                      }}
                    />
                  </label>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  marginTop: 11,
                }}
              >
                <div style={{ fontSize: "12.5px", fontWeight: 600, color: "#A84B1C" }}>
                  {a.status}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {/* Vazia quando não há prazo marcado: o nome da etapa já
                      aparece à esquerda, e repetir só parecia defeito. */}
                  {a.eta && (
                    <div style={{ fontFamily: MONO, fontSize: "10.5px", color: "#9A9689" }}>
                      {a.eta}
                    </div>
                  )}
                  <button
                    className="dash-btn-step"
                    onClick={a.down}
                    style={{ borderRadius: 999, width: 24, height: 24, fontSize: "13px", lineHeight: 1 }}
                    aria-label="Etapa anterior"
                  >
                    −
                  </button>
                  <button
                    className="dash-btn-step"
                    onClick={a.up}
                    style={{ borderRadius: 999, width: 24, height: 24, fontSize: "13px", lineHeight: 1 }}
                    aria-label="Próxima etapa"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SecaoDobravel>

      {/* ── briefing do cliente ─────────────────────────────────────────── */}
      <BriefingResumo briefing={briefing} onAbrir={onAbrirBriefing} />

      {/* ── orçamento quantitativo ──────────────────────────────────────── */}
      <Orcamento
        ambientes={sel.orcamento}
        onChange={onOrcamento}
        projeto={{ nome: sel.name, cliente: sel.client, endereco: sel.address }}
        briefing={briefing}
        comArt={sel.comArt}
        onComArt={onComArt}
      />

      {/* ── contrato e recebimentos ───────────────────────── */}
      <ContratoPainel projetoId={sel.id} valorSugerido={sel.orcamentoTotal} />

      {/* ── linha do tempo ──────────────────────────────────────────────── */}
      <SecaoDobravel
        id="linhaDoTempo"
        titulo="Linha do tempo do projeto"
        resumo={resumoDaLinha(sel.stagesVM)}
      >
        <div className="dash-timeline">
          {sel.stagesVM.map((s, i) => (
            <div key={i} className="dash-timeline-passo">
              <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                <div style={s.dotStyle} />
                <div className="dash-timeline-linha" style={s.lineStyle} />
              </div>
              <div
                style={{
                  fontSize: "13.5px",
                  fontWeight: 600,
                  marginTop: 14,
                  letterSpacing: "-0.01em",
                  color: s.textColor,
                  textDecoration: s.dispensado ? "line-through" : undefined,
                }}
              >
                {s.label}
              </div>
              <div style={{ fontFamily: MONO, fontSize: "11px", color: "#9A9689", marginTop: 4 }}>
                {s.date}
              </div>

              {/* Até aqui a linha do tempo só desenhava: não havia como marcar
                  nada. Sem os controles, o projeto que chega pronto ficava
                  preso em "Briefing · em curso" para sempre. */}
              {!s.dispensado && (
                <input
                  className="dash-field dash-field-sm"
                  type="date"
                  value={s.previsto}
                  onChange={s.onPrevisto}
                  aria-label={"Previsão de " + s.label.toLowerCase()}
                  style={{
                    width: "100%",
                    marginTop: 8,
                    padding: "5px 8px",
                    fontSize: "11px",
                    borderRadius: 9,
                    ...NUM,
                  }}
                />
              )}
              <div style={{ display: "flex", gap: 10, marginTop: 7, flexWrap: "wrap" }}>
                {!s.dispensado && (
                  <button
                    className="dash-btn-link"
                    onClick={s.onFeito}
                    style={{ fontSize: "11px", color: s.feito ? "#9A9689" : "#6B7040" }}
                  >
                    {s.feito ? "desfazer" : "feito"}
                  </button>
                )}
                <button
                  className="dash-btn-link"
                  onClick={s.onDispensar}
                  style={{ fontSize: "11px", color: "#9A9689" }}
                >
                  {s.dispensado ? "reativar" : "não se aplica"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </SecaoDobravel>

      {/* ── orçamento por categoria + consulta de preço ─────────────────── */}
      {/* `align-items: start` para um recolhido não esticar até a altura do
          outro — sem isso o bloco fechado deixa um vazio do tamanho do
          aberto, que é o oposto do que se quer aqui. */}
      <div className="dash-grid-2" style={{ marginTop: 0, alignItems: "start" }}>
        <SecaoDobravel
          id="composicao"
          titulo="Composição do orçamento"
          resumo={sel.composicaoVM ? sel.composicaoVM.length + " blocos" : "sem orçamento"}
        >
          <div style={{ fontSize: "12.5px", color: "#8C887C", marginTop: 6 }}>
            {sel.composicaoVM
              ? "custo de compra × preço de venda · a barra é a margem"
              : "aparece quando o orçamento tiver lançamentos"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 24 }}>
            {(sel.composicaoVM ?? []).map((c, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ fontSize: "13.5px", fontWeight: 500 }}>{c.label}</div>
                  <div style={{ fontSize: "13px", color: "#6E6A5F", ...NUM }}>
                    {c.custoLabel} <span style={{ color: "#B4AFA1" }}>/ {c.vendaLabel}</span>
                  </div>
                </div>
                <div
                  style={{
                    height: 8,
                    borderRadius: 999,
                    background: "#F0EDE5",
                    marginTop: 9,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 999,
                      background: c.color,
                      width: c.pct + "%",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SecaoDobravel>

        <SecaoDobravel id="consulta" titulo="Consulta de preço">

          <div style={{ fontSize: "13px", color: "#6E6A5F", marginTop: 6 }}>
            Procura na sua tabela de valores. O preço é o mesmo que entraria no orçamento —
            custo × multiplicador.
          </div>
          <div className="dash-busca">
            <input
              className="dash-field dash-field-search"
              value={query}
              onChange={onQuery}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSearch();
              }}
              placeholder="ex: off white 18, corrediça, montagem"
              style={{ flex: 1, minWidth: 0 }}
            />
            <button
              className="dash-btn-terra"
              onClick={onSearch}
              style={{
                borderRadius: 12,
                padding: "13px 22px",
                fontSize: "13.5px",
                whiteSpace: "nowrap",
              }}
            >
              Buscar
            </button>
          </div>

          {result && result.achados.length === 0 && (
            <div style={{ fontSize: "13px", color: "#6E6A5F", marginTop: 18, lineHeight: 1.5 }}>
              Nada com &quot;{result.termo}&quot; na tabela. Itens novos entram em{" "}
              <strong style={{ fontWeight: 600 }}>Ajustes › Tabela de valores</strong>.
            </div>
          )}

          {result && result.achados.length > 0 && (
            <div
              style={{
                marginTop: 18,
                border: "1px solid rgba(255,255,255,.9)",
                background: "rgba(243,247,246,.85)",
                borderRadius: 20,
                padding: "18px 22px",
              }}
            >
              <div style={mono(10, "#9C7B62", { ls: "0.08em", upper: true })}>
                {result.achados.length === 1
                  ? "1 item na sua tabela"
                  : `${result.achados.length} itens na sua tabela`}
              </div>
              {result.achados.map((a) => (
                <div key={a.id} className="dash-busca-item">
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "13.5px", fontWeight: 600, letterSpacing: "-0.005em" }}>
                      {a.nome}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: "10.5px", color: "#9C8878", marginTop: 3 }}>
                      {a.bloco} · {a.unidade} · custo {a.custoLabel} × {a.markupLabel}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "17px",
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      color: "#A84B1C",
                      flex: "none",
                      ...NUM,
                    }}
                  >
                    {a.vendaLabel}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SecaoDobravel>
      </div>

      {/* ── materiais ───────────────────────────────────────────────────── */}
      <SecaoDobravel
        id="materiais"
        titulo="Itens e materiais do projeto"
        padding="28px 30px 12px"
        resumo={
          sel.materialsCount +
          " itens" +
          (sel.composicaoVM ? " · do orçamento, a preço de custo" : "")
        }
      >
        <div className="dash-scroll-x">
          <div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: MAT_COLS,
            gap: 16,
            padding: "18px 0 12px",
            borderBottom: "1px solid #EDEAE2",
          }}
        >
          <div style={colLabel()}>Item</div>
          <div style={colLabel()}>Categoria</div>
          <div style={colLabel()}>Qtd</div>
          <div style={colLabel("right")}>Unitário</div>
          <div style={colLabel("right")}>Total</div>
        </div>
        {sel.materialsVM.map((m, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: MAT_COLS,
              gap: 16,
              padding: "16px 0",
              borderBottom: "1px solid #F4F1EA",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: "13.5px", fontWeight: 500 }}>{m.name}</div>
              <div style={{ fontSize: "12px", color: "#8C887C", marginTop: 2 }}>{m.spec}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: "13px", color: "#4A473F" }}>{m.category}</span>
              {m.doOrcamento && (
                <span
                  title="veio do orçamento quantitativo"
                  style={{ width: 5, height: 5, borderRadius: 999, background: "#A84B1C", flex: "none" }}
                />
              )}
            </div>
            <div style={{ fontSize: "13px", color: "#4A473F", ...NUM }}>{m.qty}</div>
            <div style={{ fontSize: "13px", textAlign: "right", color: "#4A473F", ...NUM }}>
              {m.unitLabel}
            </div>
            <div style={{ fontSize: "13px", textAlign: "right", fontWeight: 600, ...NUM }}>
              {m.totalLabel}
            </div>
          </div>
        ))}
          </div>
        </div>
      </SecaoDobravel>
    </div>
  );
}
