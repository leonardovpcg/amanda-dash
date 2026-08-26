"use client";

import { useState, type ChangeEvent, type CSSProperties } from "react";
import type { Briefing } from "@/lib/briefing/tipos";
import type { OrcamentoAmbiente } from "@/lib/orcamento/tipos";
import type { ProjectVM, PriceResult } from "./DashboardArquitetura";
import BriefingResumo from "./BriefingResumo";
import Orcamento from "./Orcamento";
import { MONO, NUM, cardTitle, colLabel, mono, panel } from "./ui";

type AmbienteVM = {
  name: string;
  detail: string;
  valueLabel: string;
  eta: string;
  rawValue: string;
  status: string;
  onName: (e: ChangeEvent<HTMLInputElement>) => void;
  onDetail: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onValue: (e: ChangeEvent<HTMLInputElement>) => void;
  up: () => void;
  down: () => void;
  steps: { color: string }[];
};

export type DetalheVM = ProjectVM & {
  ambienteCount: number;
  rawBudget: string;
  ambientesVM: AmbienteVM[];
  stagesVM: { label: string; date: string; textColor: string; dotStyle: CSSProperties; lineStyle: CSSProperties }[];
  budgetVM: { label: string; plannedLabel: string; spentLabel: string; pct: number; color: string }[];
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
};

const MAT_COLS = "2.4fr 1.2fr 0.8fr 1fr 1fr";

export default function ProjetoDetalhe({
  sel,
  onClose,
  onName,
  onClient,
  onAddress,
  onDeadline,
  onBudget,
  onAddAmbiente,
  query,
  onQuery,
  onSearch,
  result,
  onAddMaterial,
  onOrcamento,
  briefing,
  onAbrirBriefing,
}: {
  sel: DetalheVM;
  onClose: () => void;
  onName: (e: ChangeEvent<HTMLInputElement>) => void;
  onClient: (e: ChangeEvent<HTMLInputElement>) => void;
  onAddress: (e: ChangeEvent<HTMLInputElement>) => void;
  onDeadline: (e: ChangeEvent<HTMLInputElement>) => void;
  onBudget: (e: ChangeEvent<HTMLInputElement>) => void;
  onAddAmbiente: () => void;
  query: string;
  onQuery: (e: ChangeEvent<HTMLInputElement>) => void;
  onSearch: () => void;
  result: PriceResult | null;
  onAddMaterial: (m: { name: string; spec: string; qty: string; unit: string }) => void;
  onOrcamento: (a: OrcamentoAmbiente[]) => void;
  /** Briefing do lead que originou este projeto, quando existe o vínculo. */
  briefing: Briefing | null;
  onAbrirBriefing: () => void;
}) {
  const [mf, setMf] = useState({ name: "", spec: "", qty: "", unit: "" });

  const addMaterial = () => {
    onAddMaterial(mf);
    setMf({ name: "", spec: "", qty: "", unit: "" });
  };

  return (
    <div className="dash-tabpad" style={{ maxWidth: 1440 }}>
      <button
        className="dash-btn-ghost"
        onClick={onClose}
        style={{ background: "#FFFFFF", borderRadius: 999, padding: "9px 16px", fontSize: "12.5px" }}
      >
        ← Voltar aos projetos
      </button>

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
            <input
              className="dash-inline"
              value={sel.client}
              onChange={onClient}
              style={{ fontSize: "14px", width: 220 }}
            />
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
                <div style={{ ...mono(10, "#A84B1C"), marginTop: 3 }}>do orçamento · com ART</div>
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
                  className="dash-inline"
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
            <input
              className="dash-inline"
              value={sel.deadline}
              onChange={onDeadline}
              style={{
                fontSize: "24px",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                width: 160,
                marginTop: 6,
                ...NUM,
              }}
            />
          </div>
        </div>
      </div>

      {/* ── ambientes ───────────────────────────────────────────────────── */}
      <div style={{ ...panel, padding: "28px 30px", marginTop: 28 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div style={cardTitle}>Ambientes do projeto</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontFamily: MONO, fontSize: "11px", color: "#9A9689" }}>
              {sel.ambienteCount} ambientes · {sel.budgetLabel}
            </div>
            <button
              className="dash-btn-outline"
              onClick={onAddAmbiente}
              style={{ borderRadius: 999, padding: "8px 15px", fontSize: "12.5px" }}
            >
              + Ambiente
            </button>
          </div>
        </div>
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
                <div style={{ display: "flex", alignItems: "baseline", gap: 2, flex: "none" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#6E6A5F" }}>R$</span>
                  <input
                    className="dash-inline"
                    value={a.rawValue}
                    onChange={a.onValue}
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      width: 82,
                      textAlign: "right",
                      ...NUM,
                    }}
                  />
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
                  <div style={{ fontFamily: MONO, fontSize: "10.5px", color: "#9A9689" }}>
                    {a.eta}
                  </div>
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
      </div>

      {/* ── briefing do cliente ─────────────────────────────────────────── */}
      <BriefingResumo briefing={briefing} onAbrir={onAbrirBriefing} />

      {/* ── orçamento quantitativo ──────────────────────────────────────── */}
      <Orcamento
        ambientes={sel.orcamento}
        onChange={onOrcamento}
        projeto={{ nome: sel.name, cliente: sel.client, endereco: sel.address }}
        briefing={briefing}
      />

      {/* ── linha do tempo ──────────────────────────────────────────────── */}
      <div style={{ ...panel, padding: "28px 30px", marginTop: 20 }}>
        <div style={cardTitle}>Linha do tempo do projeto</div>
        <div
          style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 0, marginTop: 28 }}
        >
          {sel.stagesVM.map((s, i) => (
            <div key={i} style={{ paddingRight: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                <div style={s.dotStyle} />
                <div style={s.lineStyle} />
              </div>
              <div
                style={{
                  fontSize: "13.5px",
                  fontWeight: 600,
                  marginTop: 14,
                  letterSpacing: "-0.01em",
                  color: s.textColor,
                }}
              >
                {s.label}
              </div>
              <div style={{ fontFamily: MONO, fontSize: "11px", color: "#9A9689", marginTop: 4 }}>
                {s.date}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── orçamento por categoria + consulta de preço ─────────────────── */}
      <div className="dash-grid-2" style={{ marginTop: 20 }}>
        <div style={{ ...panel, padding: "28px 30px" }}>
          <div style={cardTitle}>
            {sel.composicaoVM ? "Composição do orçamento" : "Orçamento por categoria"}
          </div>
          {sel.composicaoVM && (
            <div style={{ fontSize: "12.5px", color: "#8C887C", marginTop: 6 }}>
              custo de compra × preço de venda · a barra é a margem
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 24 }}>
            {(sel.composicaoVM ??
              sel.budgetVM.map((c) => ({
                label: c.label,
                custoLabel: c.spentLabel,
                vendaLabel: c.plannedLabel,
                pct: c.pct,
                color: c.color,
              }))).map((c, i) => (
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
        </div>

        <div style={{ ...panel, padding: "28px 30px" }}>
          <div style={cardTitle}>Consulta de preço de material</div>
          <div style={{ fontSize: "13px", color: "#6E6A5F", marginTop: 6 }}>
            Digite o material e busque um valor de referência de mercado.
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <input
              className="dash-field dash-field-search"
              value={query}
              onChange={onQuery}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSearch();
              }}
              placeholder="ex: MDF branco 18mm, porcelanato 90x90"
              style={{ flex: 1 }}
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
              Buscar preço
            </button>
          </div>
          {result && (
            <div
              style={{
                marginTop: 18,
                border: "1px solid rgba(255,255,255,.9)",
                background: "rgba(243,247,246,.85)",
                borderRadius: 20,
                padding: "20px 22px",
              }}
            >
              <div style={mono(10, "#9C7B62", { ls: "0.08em", upper: true })}>
                Valor de referência
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 8 }}>
                <div
                  style={{
                    fontSize: "30px",
                    fontWeight: 600,
                    letterSpacing: "-0.03em",
                    color: "#A84B1C",
                    ...NUM,
                  }}
                >
                  {result.value}
                </div>
                <div style={{ fontSize: "13px", color: "#4A473F" }}>{result.unit}</div>
              </div>
              <div style={{ fontSize: "13px", color: "#23231F", marginTop: 10, fontWeight: 500 }}>
                {result.term}
              </div>
              <div style={{ fontFamily: MONO, fontSize: "11px", color: "#9C8878", marginTop: 4 }}>
                {result.source}
              </div>
              <button
                className="dash-btn-soft"
                style={{
                  marginTop: 16,
                  background: "#FFFFFF",
                  padding: "9px 16px",
                  fontSize: "12.5px",
                }}
              >
                Adicionar à lista do projeto
              </button>
            </div>
          )}
          <div
            style={{
              fontFamily: MONO,
              fontSize: "10.5px",
              color: "#A8A498",
              marginTop: 16,
              lineHeight: 1.6,
            }}
          >
            protótipo · valores simulados, sem integração com fornecedores
          </div>
        </div>
      </div>

      {/* ── materiais ───────────────────────────────────────────────────── */}
      <div style={{ ...panel, padding: "28px 30px 12px", marginTop: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div style={cardTitle}>Itens e materiais do projeto</div>
          <div style={{ fontFamily: MONO, fontSize: "11px", color: "#9A9689" }}>
            {sel.materialsCount} itens{sel.composicaoVM ? " · • do orçamento, a preço de custo" : ""}
          </div>
        </div>
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
        <div className="dash-mat-add">
          <input
            className="dash-field dash-field-sm"
            value={mf.name}
            onChange={(e) => setMf({ ...mf, name: e.target.value })}
            placeholder="Novo item"
          />
          <input
            className="dash-field dash-field-sm"
            value={mf.spec}
            onChange={(e) => setMf({ ...mf, spec: e.target.value })}
            placeholder="Especificação"
          />
          <input
            className="dash-field dash-field-sm"
            value={mf.qty}
            onChange={(e) => setMf({ ...mf, qty: e.target.value })}
            placeholder="12 m²"
          />
          <input
            className="dash-field dash-field-sm"
            value={mf.unit}
            onChange={(e) => setMf({ ...mf, unit: e.target.value })}
            placeholder="R$ 289"
            style={{ textAlign: "right" }}
          />
          <button
            className="dash-btn-dark"
            onClick={addMaterial}
            style={{ borderRadius: 12, padding: "11px 14px", fontSize: "12.5px" }}
          >
            Adicionar item
          </button>
        </div>
      </div>
    </div>
  );
}
