"use client";

import { ASSIST, REFERRALS, WARRANTIES, chip } from "@/lib/dashboard/data";
import { MONO, NUM, cardTitle, mono, panel } from "./ui";

/** Indicadores fixos no design original (protótipo). */
const KPIS: [string, string, string, string | undefined][] = [
  ["Assistências abertas", "04", "1 com prazo vencido", "#A85C3C"],
  ["Garantias em vigência", "11", "2 vencem em 60 dias", undefined],
  ["Indicação e recompra", "07", "clientes prontos para contato", undefined],
];

export default function PosVenda() {
  return (
    <div className="dash-tabpad" style={{ maxWidth: 1440 }}>
      <div className="dash-grid-3">
        {KPIS.map(([label, value, note, color]) => (
          <div key={label} style={{ ...panel, padding: "24px 26px" }}>
            <div style={mono(10.5, "#8C887C", { ls: "0.08em", upper: true })}>{label}</div>
            <div
              style={{
                fontSize: "44px",
                fontWeight: 600,
                letterSpacing: "-0.04em",
                marginTop: 12,
                ...NUM,
                ...(color ? { color } : null),
              }}
            >
              {value}
            </div>
            <div style={{ fontSize: "13px", color: "#6E6A5F", marginTop: 6 }}>{note}</div>
          </div>
        ))}
      </div>

      {/* ── assistências técnicas ───────────────────────────────────────── */}
      <div style={{ ...panel, padding: "28px 30px 14px", marginTop: 20 }}>
        <div style={cardTitle}>Assistências técnicas</div>
        <div className="dash-scroll-x">
          <div>
        {ASSIST.map(([client, ambiente, issue, opened, status, tone], i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 2fr 1fr 1fr",
              gap: 16,
              padding: "17px 0",
              borderTop: "1px solid #F4F1EA",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: "13.5px", fontWeight: 600 }}>{client}</div>
              <div style={{ fontSize: "12px", color: "#8C887C", marginTop: 2 }}>{ambiente}</div>
            </div>
            <div style={{ fontSize: "13px", color: "#4A473F" }}>{issue}</div>
            <div style={{ fontFamily: MONO, fontSize: "11.5px", color: "#6E6A5F" }}>
              aberto {opened}
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={chip(tone)}>{status}</span>
            </div>
          </div>
        ))}
          </div>
        </div>
      </div>

      <div className="dash-grid-2" style={{ marginTop: 20 }}>
        {/* ── garantias ─────────────────────────────────────────────────── */}
        <div style={{ ...panel, padding: "28px 30px 14px" }}>
          <div style={cardTitle}>Garantias em vigência</div>
          {WARRANTIES.map(([client, scope, until, remaining, color], i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                padding: "16px 0",
                borderTop: "1px solid #F4F1EA",
              }}
            >
              <div>
                <div style={{ fontSize: "13.5px", fontWeight: 600 }}>{client}</div>
                <div style={{ fontSize: "12px", color: "#8C887C", marginTop: 2 }}>{scope}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color, ...NUM }}>{until}</div>
                <div style={{ fontFamily: MONO, fontSize: "10.5px", color: "#9A9689", marginTop: 2 }}>
                  {remaining}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── indicação e recompra ──────────────────────────────────────── */}
        <div style={{ ...panel, padding: "28px 30px 14px" }}>
          <div style={cardTitle}>Indicação e recompra</div>
          <div style={{ fontSize: "12.5px", color: "#8C887C", marginTop: 4 }}>
            Clientes entregues sem contato recente
          </div>
          {REFERRALS.map(([client, note, action], i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                padding: "16px 0",
                borderTop: "1px solid #F4F1EA",
              }}
            >
              <div>
                <div style={{ fontSize: "13.5px", fontWeight: 600 }}>{client}</div>
                <div style={{ fontSize: "12px", color: "#8C887C", marginTop: 2 }}>{note}</div>
              </div>
              <button
                className="dash-btn-soft"
                style={{
                  background: "#F3F7F6",
                  padding: "8px 14px",
                  fontSize: "12px",
                  whiteSpace: "nowrap",
                }}
              >
                {action}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
