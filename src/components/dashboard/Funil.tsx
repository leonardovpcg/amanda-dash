"use client";

import { MONO, NUM, mono, panel, sectionTitle } from "./ui";
import { STAGES, money, type Lead, type StageKey } from "@/lib/dashboard/data";

/** Os quatro indicadores do topo são fixos no design original (protótipo). */
const KPIS: [string, React.ReactNode, string | undefined][] = [
  ["Clientes no funil", "18", undefined],
  [
    "Valor em negociação",
    <>
      R$ 986 <span style={{ fontSize: "22px", fontWeight: 500, color: "#6E6A5F" }}>mil</span>
    </>,
    undefined,
  ],
  [
    "Ticket médio",
    <>
      R$ 54,8 <span style={{ fontSize: "22px", fontWeight: 500, color: "#6E6A5F" }}>mil</span>
    </>,
    undefined,
  ],
  ["Parados há + de 7 dias", "05", "#9C2B22"],
];

export default function Funil({
  leads,
  dragOver,
  dragging,
  setDragOver,
  setDragging,
  onDrop,
  onOpenLead,
}: {
  leads: Lead[];
  dragOver: StageKey | null;
  dragging: string | null;
  setDragOver: (s: StageKey | null) => void;
  setDragging: (id: string | null) => void;
  onDrop: (stage: StageKey) => void;
  onOpenLead: (id: string) => void;
}) {
  return (
    <div className="dash-tabpad">
      <div className="dash-grid-4">
        {KPIS.map(([label, value, color], i) => (
          <div key={i} className="dash-kpi" style={{ ...panel, padding: "24px 26px" }}>
            <div style={mono(10.5, "#8C887C", { ls: "0.08em", upper: true })}>{label}</div>
            <div
              className="dash-kpi-num"
              style={{
                fontSize: "44px",
                fontWeight: 600,
                letterSpacing: "-0.04em",
                lineHeight: 1.05,
                marginTop: 12,
                ...NUM,
                ...(color ? { color } : null),
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          margin: "40px 0 16px",
        }}
      >
        <h2 style={sectionTitle}>Pipeline comercial</h2>
        {/* Arrastar usa eventos HTML5 de drag, que não existem em toque —
            no celular o caminho é abrir o cartão e usar "Avançar para". */}
        <div style={{ fontFamily: MONO, fontSize: "11px", color: "#8C887C" }}>
          <span className="dash-so-desktop">arraste os cartões entre as etapas</span>
          <span className="dash-so-celular">toque no cartão para avançar a etapa</span>
        </div>
      </div>

      <div className="dash-kanban">
        {STAGES.map(([key, label]) => {
          const cards = leads.filter((l) => l.stage === key);
          const total = cards.reduce((a, b) => a + b.value, 0);
          const active = dragOver === key;
          return (
            <div
              key={key}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOver !== key) setDragOver(key);
              }}
              onDragLeave={() => {
                if (dragOver === key) setDragOver(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                onDrop(key);
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                borderRadius: 24,
                padding: "14px 12px",
                minHeight: 280,
                transition: "background .15s ease, border-color .15s ease",
                border: "1px solid " + (active ? "rgba(168,75,28,.35)" : "rgba(255,255,255,.8)"),
                background: active ? "rgba(168,75,28,.10)" : "rgba(255,255,255,.38)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "2px 4px 0",
                }}
              >
                <div
                  style={{
                    fontSize: "12.5px",
                    fontWeight: 600,
                    letterSpacing: "-0.005em",
                    color: key === "fechado" ? "#6B7040" : "#23231F",
                  }}
                >
                  {label}
                </div>
                <div style={{ fontFamily: MONO, fontSize: "10.5px", color: "#9A9689" }}>
                  {cards.length}
                </div>
              </div>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: "10.5px",
                  color: "#9A9689",
                  padding: "0 4px 4px",
                }}
              >
                {money(total)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {cards.map((c) => (
                  <div
                    key={c.id}
                    draggable
                    onClick={() => onOpenLead(c.id)}
                    onDragStart={() => setDragging(c.id)}
                    onDragEnd={() => {
                      setDragging(null);
                      setDragOver(null);
                    }}
                    style={{
                      background: "rgba(255,255,255,.92)",
                      border: "1px solid rgba(255,255,255,.95)",
                      borderRadius: 18,
                      padding: "14px 15px",
                      cursor: "grab",
                      boxShadow: "0 3px 12px rgba(52,56,50,.07)",
                      ...(dragging === c.id ? { opacity: 0.4 } : null),
                    }}
                  >
                    <div style={{ fontSize: "13.5px", fontWeight: 600, letterSpacing: "-0.01em" }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: "11.5px", color: "#8C887C", marginTop: 2 }}>
                      {c.ambientes}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: 12,
                      }}
                    >
                      <div style={{ fontSize: "13px", fontWeight: 600, ...NUM }}>
                        {money(c.value)}
                      </div>
                      <div
                        style={{
                          fontFamily: MONO,
                          fontSize: "10px",
                          padding: "3px 7px",
                          borderRadius: 6,
                          ...(c.idle >= 7
                            ? { background: "#FAEAE7", color: "#9C2B22" }
                            : { background: "#F2F0EA", color: "#8C887C" }),
                        }}
                      >
                        {c.idle === 0 ? "hoje" : c.idle + "d"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
