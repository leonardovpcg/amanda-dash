"use client";

import { money } from "@/lib/dashboard/data";
import type { ProjectVM } from "./DashboardArquitetura";
import { MONO, NUM, cardTitle, mono, panel } from "./ui";

export default function Financeiro({ projects }: { projects: ProjectVM[] }) {
  /*
    Os três totais.

    Só entra projeto com contrato assinado. Somar proposta aberta aqui daria
    um "total contratado" que a loja não tem — e era exatamente o que os
    R$ 1,84 mi fixos do design faziam.
  */
  const comContrato = projects.filter((p) => p.contratoAssinado !== undefined);
  const contratado = comContrato.reduce((t, p) => t + p.contrato, 0);
  const faturado = comContrato.reduce((t, p) => t + p.spent, 0);
  const totais: [string, string, string | undefined][] = [
    ["Total contratado", money(contratado), undefined],
    ["Total faturado", money(faturado), "#A84B1C"],
    ["A faturar", money(contratado - faturado), undefined],
  ];

  return (
    <div className="dash-tabpad" style={{ maxWidth: 1440 }}>
      <div className="dash-grid-3">
        {totais.map(([label, value, color]) => (
          <div key={label} style={{ ...panel, padding: "26px 28px" }}>
            <div style={mono(11, "#8C887C", { ls: "0.08em", upper: true })}>{label}</div>
            <div
              style={{
                fontSize: "clamp(28px, 6.5vw, 40px)",
                fontWeight: 600,
                letterSpacing: "-0.035em",
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

      <div style={{ ...panel, padding: "30px 32px", marginTop: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div style={cardTitle}>Contratado vs. recebido por projeto</div>
          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
            {[
              ["#A84B1C", "Recebido"],
              ["#F0EDE5", "Contratado"],
            ].map(([c, label]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: c }} />
                <span style={{ fontSize: "12px", color: "#6E6A5F" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 26, marginTop: 30 }}>
          {comContrato.length === 0 && (
            <div style={{ fontSize: "13px", color: "#6E6A5F" }}>
              Nenhum contrato assinado ainda. A barra aparece quando o contrato do projeto for
              registrado.
            </div>
          )}
          {comContrato.map((p) => (
            <div key={p.id}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 20,
                }}
              >
                <div style={{ fontSize: "14px", fontWeight: 600, letterSpacing: "-0.01em" }}>
                  {p.name}
                </div>
                <div style={{ fontSize: "13px", color: "#6E6A5F", ...NUM }}>
                  {p.spentLabel} de {p.budgetLabel} ·{" "}
                  <span style={{ color: p.pctColor, fontWeight: 600 }}>{p.pct}%</span>
                </div>
              </div>
              <div
                style={{
                  height: 14,
                  borderRadius: 999,
                  background: "#F0EDE5",
                  marginTop: 10,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: 999,
                    background: p.pctColor,
                    width: p.pct + "%",
                  }}
                />
              </div>
              <div style={{ fontFamily: MONO, fontSize: "11px", color: "#9A9689", marginTop: 7 }}>
                {p.client} · saldo {p.saldoLabel}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
