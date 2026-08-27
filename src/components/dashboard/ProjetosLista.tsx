"use client";

import type { ProjectVM } from "./DashboardArquitetura";
import { MONO, NUM, mono, panel, sectionTitle } from "./ui";

/**
 * Os três indicadores do topo, contados do banco.
 *
 * Eram fixos no design (06 / R$ 1,84 mi / 03). O cálculo mora em
 * `DashboardArquitetura`, onde estão os projetos crus com o prazo em data —
 * aqui só chega o resultado pronto.
 */
export type KpiDeProjetos = {
  label: string;
  valor: React.ReactNode;
  nota: string;
  cor?: string;
};

export default function ProjetosLista({
  projects,
  kpis,
  gridStyle,
  onOpen,
  onNewProject,
}: {
  projects: ProjectVM[];
  kpis: KpiDeProjetos[];
  gridStyle: React.CSSProperties;
  onOpen: (id: string) => void;
  onNewProject: () => void;
}) {
  return (
    <div className="dash-tabpad" style={{ maxWidth: 1440 }}>
      <div className="dash-grid-3">
        {kpis.map(({ label, valor: value, nota: note, cor: color }, i) => (
          <div key={i} style={{ ...panel, padding: "26px 28px 24px" }}>
            <div style={mono(11, "#8C887C", { ls: "0.08em", upper: true })}>{label}</div>
            <div
              className="dash-kpi-num-lg"
              style={{
                // O 52px do design não cabe nos ~265px de cartão do celular.
                fontSize: "clamp(34px, 7vw, 52px)",
                fontWeight: 600,
                letterSpacing: "-0.04em",
                lineHeight: 1.05,
                marginTop: 14,
                ...NUM,
                ...(color ? { color } : null),
              }}
            >
              {value}
            </div>
            <div style={{ fontSize: "13px", color: "#6E6A5F", marginTop: 8 }}>{note}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          margin: "44px 0 18px",
        }}
      >
        <h2 style={sectionTitle}>Projetos</h2>
        {/* A dica "clique em um cartão" saiu: o cartão inteiro é clicável e
            tem cursor de mão, então ela se explicava sozinha — e no celular
            ainda espremia o botão de novo projeto. */}
        <button
          className="dash-btn-dark"
          onClick={onNewProject}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            borderRadius: 999,
            padding: "11px 20px",
            fontSize: "13px",
            boxShadow: "0 4px 14px rgba(35,35,31,.16)",
            flex: "none",
          }}
        >
          <span style={{ fontSize: "15px", lineHeight: 1, fontWeight: 400 }}>+</span>
          <span>Novo projeto</span>
        </button>
      </div>

      <div style={gridStyle}>
        {projects.map((p) => (
          <div
            key={p.id}
            className="dash-proj-card"
            onClick={() => onOpen(p.id)}
            style={{ ...panel, overflow: "hidden", cursor: "pointer" }}
          >
            <div
              style={{
                height: 168,
                backgroundImage:
                  "repeating-linear-gradient(135deg, #EDEAE2 0 8px, #F4F2EC 8px 16px)",
                borderBottom: "1px solid #EAE7DF",
                display: "flex",
                alignItems: "flex-end",
                padding: "14px 16px",
              }}
            >
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: "10.5px",
                  color: "#8C887C",
                  background: "rgba(252,251,249,.86)",
                  borderRadius: 6,
                  padding: "5px 8px",
                }}
              >
                render · {p.imageLabel}
              </span>
            </div>
            <div style={{ padding: "20px 22px 22px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ fontSize: "16.5px", fontWeight: 600, letterSpacing: "-0.015em" }}>
                  {p.name}
                </div>
                <span style={p.badgeStyle}>{p.status}</span>
              </div>
              <div style={{ fontSize: "13px", color: "#6E6A5F", marginTop: 4 }}>{p.client}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
                {p.ambienteTags.map((t, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: "11.5px",
                      color: "#4A473F",
                      background: "#F4F2EC",
                      border: "1px solid #EAE7DF",
                      borderRadius: 7,
                      padding: "4px 9px",
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 26,
                  marginTop: 18,
                  paddingTop: 16,
                  borderTop: "1px solid #F0EDE5",
                }}
              >
                <div>
                  <div style={mono(10, "#9A9689", { ls: "0.07em", upper: true })}>Etapa atual</div>
                  <div style={{ fontSize: "13.5px", fontWeight: 500, marginTop: 4 }}>{p.stage}</div>
                </div>
                <div>
                  <div style={mono(10, "#9A9689", { ls: "0.07em", upper: true })}>Prazo</div>
                  <div style={{ fontSize: "13.5px", fontWeight: 500, marginTop: 4, ...NUM }}>
                    {p.deadline}
                  </div>
                </div>
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <div style={mono(10, "#9A9689", { ls: "0.07em", upper: true })}>Contrato</div>
                  <div style={{ fontSize: "13.5px", fontWeight: 600, marginTop: 4, ...NUM }}>
                    {p.budgetLabel}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
