"use client";

import { COMMISSIONS, MONTHLY, TAXA_COMISSAO, chip, money } from "@/lib/dashboard/data";
import type { ProjectVM } from "./DashboardArquitetura";
import { MONO, NUM, cardTitle, colLabel, mono, panel } from "./ui";

const COM_COLS = "2fr 1fr 1fr 1.1fr";
const ORC_COLS = "2fr 1fr 1fr";

export default function Comissao({ projects }: { projects: ProjectVM[] }) {
  // Os contratos da lista abaixo são histórico fechado e ficam como estão. O
  // que o orçamento acrescenta é a projeção: projeto com orçamento lançado já
  // sabe quanto vai gerar de comissão, mesmo antes de virar contrato assinado.
  const orcados = projects
    .filter((p) => p.doOrcamento)
    .map((p) => ({
      id: p.id,
      nome: p.name,
      cliente: p.client,
      status: p.status,
      badgeStyle: p.badgeStyle,
      valor: p.contrato,
      valorLabel: money(p.contrato),
      comissaoLabel: money(p.contrato * TAXA_COMISSAO),
    }));
  const totalOrcado = orcados.reduce((a, o) => a + o.valor, 0);
  const commissions = COMMISSIONS.map(([client, detail, value, com, status, tone]) => ({
    client,
    detail,
    valueLabel: money(value),
    comLabel: money(com),
    status,
    badgeStyle: chip(tone),
  }));

  const maxMonth = Math.max(...MONTHLY.map((m) => m[1]));
  const monthly = MONTHLY.map(([short, v]) => ({
    short,
    label: "R$ " + Math.round(v / 1000) + "k",
    pct: Math.round((v / maxMonth) * 100),
    color: short === "Ago" ? "#A84B1C" : "#D9D5C8",
  }));

  return (
    <div className="dash-tabpad" style={{ maxWidth: 1440 }}>
      {/* ── destaque do mês ─────────────────────────────────────────────── */}
      <div
        style={{
          background: "linear-gradient(140deg, #23231F 0%, #8E3A12 72%)",
          borderRadius: 30,
          padding: "40px 42px",
          boxShadow: "0 14px 40px rgba(168,75,28,.22)",
          color: "#FBF2EC",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 48,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={mono(10.5, "#D6A488", { ls: "0.09em", upper: true })}>
              Vendido em agosto de 2026
            </div>
            <div
              style={{
                // Escala fluida em vez de 64px fixo: em 375px o número media
                // 236px numa caixa de 239 e qualquer valor maior quebraria.
                fontSize: "clamp(36px, 8vw, 64px)",
                fontWeight: 600,
                letterSpacing: "-0.045em",
                lineHeight: 1.02,
                marginTop: 12,
                ...NUM,
              }}
            >
              R$ 268.400
            </div>
            <div style={{ fontSize: "14px", color: "#E9C9B6", marginTop: 8 }}>
              6 contratos fechados · ticket médio R$ 44.733
            </div>
          </div>
          <div className="dash-com-stats">
            {[
              ["Comissão prevista", "R$ 10.736", "4% sobre o vendido"],
              ["Comissão recebida", "R$ 6.180", "R$ 4.556 a liberar"],
            ].map(([label, value, note]) => (
              <div key={label}>
                <div style={mono(10.5, "#D6A488", { ls: "0.09em", upper: true })}>{label}</div>
                <div
                  style={{
                    fontSize: "clamp(17px, 5vw, 32px)",
                    fontWeight: 600,
                    letterSpacing: "-0.03em",
                    marginTop: 10,
                    ...NUM,
                  }}
                >
                  {value}
                </div>
                <div style={{ fontSize: "12.5px", color: "#E9C9B6", marginTop: 4 }}>{note}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 34 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div style={{ fontSize: "13.5px", fontWeight: 600 }}>Meta do mês · R$ 320.000</div>
            <div style={{ fontSize: "13.5px", color: "#E9C9B6", ...NUM }}>
              84% da meta · faltam R$ 51.600
            </div>
          </div>
          <div
            style={{
              height: 16,
              borderRadius: 999,
              background: "rgba(241,245,244,.18)",
              marginTop: 12,
              overflow: "hidden",
            }}
          >
            <div style={{ height: "100%", width: "84%", borderRadius: 999, background: "#E8E3D6" }} />
          </div>
          <div style={{ fontFamily: MONO, fontSize: "11px", color: "#D6A488", marginTop: 10 }}>
            9 dias úteis restantes · 2 propostas em negociação cobrem a diferença
          </div>
        </div>
      </div>

      {/* ── projeção vinda dos orçamentos ─────────────────────────────── */}
      {orcados.length > 0 && (
        <div style={{ ...panel, padding: "28px 30px 14px", marginTop: 20 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14 }}>
            <div>
              <div style={cardTitle}>Comissão projetada dos orçamentos</div>
              <div style={{ fontSize: "12.5px", color: "#8C887C", marginTop: 6 }}>
                {Math.round(TAXA_COMISSAO * 100)}% sobre o valor com ART, antes de assinar
              </div>
            </div>
            <div style={{ textAlign: "right", flex: "none" }}>
              <div style={mono(10, "#9A9689", { ls: "0.07em", upper: true })}>Se todos fecharem</div>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: "#A84B1C",
                  marginTop: 5,
                  ...NUM,
                }}
              >
                {money(totalOrcado * TAXA_COMISSAO)}
              </div>
            </div>
          </div>
          <div className="dash-scroll-x">
            <div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: ORC_COLS,
                  gap: 14,
                  padding: "18px 0 12px",
                  borderBottom: "1px solid #EDEAE2",
                }}
              >
                <div style={colLabel()}>Projeto</div>
                <div style={colLabel("right")}>Orçado com ART</div>
                <div style={colLabel("right")}>Comissão</div>
              </div>
              {orcados.map((o) => (
                <div
                  key={o.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: ORC_COLS,
                    gap: 14,
                    padding: "15px 0",
                    borderBottom: "1px solid #F4F1EA",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <span style={{ fontSize: "13.5px", fontWeight: 500 }}>{o.nome}</span>
                      <span style={o.badgeStyle}>{o.status}</span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#8C887C", marginTop: 2 }}>{o.cliente}</div>
                  </div>
                  <div style={{ fontSize: "13px", textAlign: "right", color: "#4A473F", ...NUM }}>
                    {o.valorLabel}
                  </div>
                  <div style={{ fontSize: "13px", textAlign: "right", fontWeight: 600, ...NUM }}>
                    {o.comissaoLabel}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="dash-grid-com" style={{ marginTop: 20 }}>
        {/* ── comissão por contrato ─────────────────────────────────────── */}
        <div style={{ ...panel, padding: "28px 30px 14px" }}>
          <div style={cardTitle}>Comissão por contrato</div>
          <div className="dash-scroll-x">
            <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: COM_COLS,
              gap: 14,
              padding: "18px 0 12px",
              borderBottom: "1px solid #EDEAE2",
            }}
          >
            <div style={colLabel()}>Cliente</div>
            <div style={colLabel("right")}>Contrato</div>
            <div style={colLabel("right")}>Comissão</div>
            <div style={colLabel("right")}>Situação</div>
          </div>
          {commissions.map((c, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: COM_COLS,
                gap: 14,
                padding: "15px 0",
                borderBottom: "1px solid #F4F1EA",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: "13.5px", fontWeight: 500 }}>{c.client}</div>
                <div style={{ fontSize: "12px", color: "#8C887C", marginTop: 2 }}>{c.detail}</div>
              </div>
              <div style={{ fontSize: "13px", textAlign: "right", color: "#4A473F", ...NUM }}>
                {c.valueLabel}
              </div>
              <div style={{ fontSize: "13px", textAlign: "right", fontWeight: 600, ...NUM }}>
                {c.comLabel}
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={c.badgeStyle}>{c.status}</span>
              </div>
            </div>
          ))}
            </div>
          </div>
        </div>

        {/* ── últimos seis meses ────────────────────────────────────────── */}
        <div style={{ ...panel, padding: "28px 30px" }}>
          <div style={cardTitle}>Últimos seis meses</div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 14,
              height: 200,
              marginTop: 26,
            }}
          >
            {monthly.map((m) => (
              <div
                key={m.short}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  height: "100%",
                  justifyContent: "flex-end",
                }}
              >
                <div style={{ fontSize: "11.5px", fontWeight: 600, color: "#4A473F", ...NUM }}>
                  {m.short}
                </div>
                <div
                  style={{
                    width: "100%",
                    borderRadius: "8px 8px 4px 4px",
                    background: m.color,
                    height: m.pct + "%",
                  }}
                />
                <div style={{ fontFamily: MONO, fontSize: "10.5px", color: "#9A9689" }}>
                  {m.label}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: MONO, fontSize: "10.5px", color: "#A8A498", marginTop: 18 }}>
            valor vendido por mês · meta R$ 320 mil
          </div>
        </div>
      </div>
    </div>
  );
}
