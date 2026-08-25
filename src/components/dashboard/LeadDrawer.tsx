"use client";

import { NEXT_STEPS, STAGES, chip, money, type Lead } from "@/lib/dashboard/data";
import { MONO, NUM, mono } from "./ui";

const box: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,.9)",
  background: "rgba(255,255,255,.6)",
  borderRadius: 20,
};

export default function LeadDrawer({
  lead,
  onClose,
  onAdvance,
}: {
  lead: Lead;
  onClose: () => void;
  onAdvance: () => void;
}) {
  const stageIdx = STAGES.findIndex((s) => s[0] === lead.stage);
  const first = lead.name
    .split(" ")[0]
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z]/g, "");
  const parts = lead.ambientes.split(" · ");

  const vm = {
    ambientes: parts[0],
    origem: parts[1] || "Loja",
    stageLabel: STAGES[stageIdx][1],
    badgeStyle: chip(lead.stage === "fechado" ? "olive" : lead.idle >= 7 ? "clay" : "terracota"),
    valueLabel: money(lead.value),
    idleText: lead.idle === 0 ? "hoje" : lead.idle + (lead.idle === 1 ? " dia" : " dias"),
    idleColor: lead.idle >= 7 ? "#9C2B22" : "#23231F",
    phone: "(11) 9" + (7000 + stageIdx * 111) + "-" + (1000 + (lead.value % 9000)),
    email: first + "@email.com",
    next: NEXT_STEPS[stageIdx][0],
    nextDate: NEXT_STEPS[stageIdx][1],
    advanceLabel:
      stageIdx >= STAGES.length - 1
        ? "Converter em projeto"
        : "Avançar para " + STAGES[stageIdx + 1][1],
    history: STAGES.slice(0, stageIdx + 1)
      .reverse()
      .map((s, i) => ({
        title: (i === 0 ? "Etapa atual · " : "Concluído · ") + s[1],
        date:
          i === 0
            ? lead.idle === 0
              ? "atualizado hoje"
              : "há " + lead.idle + " dias"
            : "há " + (lead.idle + i * 6) + " dias",
        color: i === 0 ? "#A84B1C" : "#C9C4B6",
      })),
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 45,
        display: "flex",
        justifyContent: "flex-end",
        background: "rgba(38,42,38,.32)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        className="dash-drawer"
        onClick={(e) => e.stopPropagation()}
        style={{
          background:
            "linear-gradient(170deg, rgba(252,251,248,.97) 0%, rgba(238,243,240,.97) 100%)",
          borderLeft: "1px solid rgba(255,255,255,.9)",
          boxShadow: "-30px 0 80px rgba(38,42,38,.28)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <span style={vm.badgeStyle}>{vm.stageLabel}</span>
            <h2
              style={{
                fontSize: "27px",
                fontWeight: 500,
                letterSpacing: "-0.03em",
                margin: "14px 0 0",
              }}
            >
              {lead.name}
            </h2>
            <div style={{ fontSize: "13px", color: "#6E6A5F", marginTop: 5 }}>{vm.ambientes}</div>
          </div>
          <button
            className="dash-btn-ghost"
            onClick={onClose}
            style={{
              borderRadius: 999,
              width: 36,
              height: 36,
              fontSize: "15px",
              color: "#6E6A5F",
              flex: "none",
            }}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 26 }}>
          <div style={{ ...box, padding: "18px 20px" }}>
            <div style={mono(10, "#9A9689", { ls: "0.08em", upper: true })}>Valor estimado</div>
            <div
              style={{
                fontSize: "26px",
                fontWeight: 600,
                letterSpacing: "-0.03em",
                marginTop: 8,
                ...NUM,
              }}
            >
              {vm.valueLabel}
            </div>
          </div>
          <div style={{ ...box, padding: "18px 20px" }}>
            <div style={mono(10, "#9A9689", { ls: "0.08em", upper: true })}>Parado nesta etapa</div>
            <div
              style={{
                fontSize: "26px",
                fontWeight: 600,
                letterSpacing: "-0.03em",
                marginTop: 8,
                color: vm.idleColor,
                ...NUM,
              }}
            >
              {vm.idleText}
            </div>
          </div>
        </div>

        <div style={{ ...box, padding: "20px 22px", marginTop: 12 }}>
          <div style={{ fontSize: "14px", fontWeight: 600, letterSpacing: "-0.01em" }}>Contato</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span style={{ color: "#8C887C" }}>Telefone</span>
              <span style={NUM}>{vm.phone}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span style={{ color: "#8C887C" }}>E-mail</span>
              <span>{vm.email}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span style={{ color: "#8C887C" }}>Origem</span>
              <span>{vm.origem}</span>
            </div>
          </div>
        </div>

        <div style={{ ...box, padding: "20px 22px", marginTop: 12 }}>
          <div style={{ fontSize: "14px", fontWeight: 600, letterSpacing: "-0.01em" }}>
            Histórico do atendimento
          </div>
          <div style={{ marginTop: 6 }}>
            {vm.history.map((h, i) => (
              <div
                key={i}
                style={{ display: "flex", gap: 13, padding: "13px 0", borderTop: "1px solid #F0EDE5" }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    flex: "none",
                    marginTop: 6,
                    background: h.color,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: 600 }}>{h.title}</div>
                  <div style={{ fontFamily: MONO, fontSize: "10.5px", color: "#9A9689", marginTop: 3 }}>
                    {h.date}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            border: "1px solid rgba(168,75,28,.2)",
            background: "rgba(168,75,28,.07)",
            borderRadius: 20,
            padding: "20px 22px",
            marginTop: 12,
          }}
        >
          <div style={mono(10, "#9C7B62", { ls: "0.08em", upper: true })}>Próximo passo</div>
          <div
            style={{
              fontSize: "14.5px",
              fontWeight: 600,
              marginTop: 8,
              letterSpacing: "-0.01em",
            }}
          >
            {vm.next}
          </div>
          <div style={{ fontSize: "12.5px", color: "#4A473F", marginTop: 4 }}>{vm.nextDate}</div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button
            className="dash-btn-dark"
            onClick={onAdvance}
            style={{ flex: 1, borderRadius: 999, padding: "13px 20px", fontSize: "13px" }}
          >
            {vm.advanceLabel}
          </button>
          <button
            className="dash-btn-ghost"
            style={{ borderRadius: 999, padding: "13px 20px", fontSize: "13px" }}
          >
            Registrar contato
          </button>
        </div>
      </div>
    </div>
  );
}
