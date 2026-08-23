"use client";

import { COMMISSIONS, MONTHLY, chip, money } from "@/lib/dashboard/data";
import { MONO, NUM, cardTitle, colLabel, mono, panel } from "./ui";

const COM_COLS = "2fr 1fr 1fr 1.1fr";

export default function Comissao() {
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
    color: short === "Ago" ? "#1F5560" : "#D9D5C8",
  }));

  return (
    <div className="dash-tabpad" style={{ maxWidth: 1440 }}>
      {/* ── destaque do mês ─────────────────────────────────────────────── */}
      <div
        style={{
          background: "linear-gradient(140deg, #23231F 0%, #1F5560 70%)",
          borderRadius: 30,
          padding: "40px 42px",
          boxShadow: "0 14px 40px rgba(31,85,96,.22)",
          color: "#F1F5F4",
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
            <div style={mono(10.5, "#9EBDBE", { ls: "0.09em", upper: true })}>
              Vendido em agosto de 2026
            </div>
            <div
              style={{
                fontSize: "64px",
                fontWeight: 600,
                letterSpacing: "-0.045em",
                lineHeight: 1.02,
                marginTop: 12,
                ...NUM,
              }}
            >
              R$ 268.400
            </div>
            <div style={{ fontSize: "14px", color: "#BBD3D2", marginTop: 8 }}>
              6 contratos fechados · ticket médio R$ 44.733
            </div>
          </div>
          <div style={{ display: "flex", gap: 44 }}>
            {[
              ["Comissão prevista", "R$ 10.736", "4% sobre o vendido"],
              ["Comissão recebida", "R$ 6.180", "R$ 4.556 a liberar"],
            ].map(([label, value, note]) => (
              <div key={label}>
                <div style={mono(10.5, "#9EBDBE", { ls: "0.09em", upper: true })}>{label}</div>
                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: 600,
                    letterSpacing: "-0.03em",
                    marginTop: 10,
                    ...NUM,
                  }}
                >
                  {value}
                </div>
                <div style={{ fontSize: "12.5px", color: "#BBD3D2", marginTop: 4 }}>{note}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 34 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div style={{ fontSize: "13.5px", fontWeight: 600 }}>Meta do mês · R$ 320.000</div>
            <div style={{ fontSize: "13.5px", color: "#BBD3D2", ...NUM }}>
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
          <div style={{ fontFamily: MONO, fontSize: "11px", color: "#9EBDBE", marginTop: 10 }}>
            9 dias úteis restantes · 2 propostas em negociação cobrem a diferença
          </div>
        </div>
      </div>

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
