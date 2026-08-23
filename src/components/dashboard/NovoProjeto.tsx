"use client";

import { useState } from "react";
import { AMB_OPTS } from "@/lib/dashboard/data";
import { MONO, NUM, mono, pillStyle } from "./ui";

export type ProjetoForm = {
  name: string;
  client: string;
  address: string;
  budget: string;
  deadline: string;
};

export default function NovoProjeto({
  ambPick,
  onToggleAmb,
  onClose,
  onSave,
}: {
  ambPick: string[];
  onToggleAmb: (a: string) => void;
  onClose: () => void;
  onSave: (f: ProjetoForm) => void;
}) {
  const [f, setF] = useState<ProjetoForm>({
    name: "",
    client: "",
    address: "",
    budget: "",
    deadline: "",
  });

  const field = (
    label: string,
    key: keyof ProjetoForm,
    placeholder: string,
    opts?: { span2?: boolean; num?: boolean },
  ) => (
    <div className={opts?.span2 ? "dash-span2" : undefined}>
      <div style={mono(10, "#9A9689", { ls: "0.08em", upper: true })}>{label}</div>
      <input
        className="dash-field"
        value={f[key]}
        onChange={(e) => setF({ ...f, [key]: e.target.value })}
        placeholder={placeholder}
        style={{ width: "100%", marginTop: 8, ...(opts?.num ? NUM : null) }}
      />
    </div>
  );

  return (
    <div
      className="dash-modal-wrap"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(38,42,38,.34)",
        backdropFilter: "blur(5px)",
      }}
    >
      <div
        className="dash-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          border: "1px solid rgba(255,255,255,.9)",
          background:
            "linear-gradient(160deg, rgba(252,251,248,.97) 0%, rgba(240,244,240,.97) 100%)",
          boxShadow: "0 40px 90px rgba(38,42,38,.32)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 20,
            padding: "32px 34px 0",
          }}
        >
          <div>
            <div style={mono(10.5, "#8C887C", { ls: "0.09em", upper: true })}>
              Sem passar pelo funil
            </div>
            <h2
              style={{
                fontSize: "27px",
                fontWeight: 500,
                letterSpacing: "-0.03em",
                margin: "12px 0 0",
              }}
            >
              Novo projeto
            </h2>
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

        <div className="dash-form-grid" style={{ padding: "26px 34px 0" }}>
          {field("Nome do projeto", "name", "Residência Alvorada", { span2: true })}
          {field("Cliente", "client", "Família Moretti")}
          {field("Endereço", "address", "Jardins, São Paulo")}
          {field("Valor do contrato", "budget", "R$ 180.000", { num: true })}
          {field("Prazo de entrega", "deadline", "12 dez 2026", { num: true })}
        </div>

        <div style={{ padding: "22px 34px 0" }}>
          <div style={mono(10, "#9A9689", { ls: "0.08em", upper: true })}>Ambientes do projeto</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {AMB_OPTS.map((a) => (
              <button key={a} onClick={() => onToggleAmb(a)} style={pillStyle(ambPick.includes(a))}>
                {a}
              </button>
            ))}
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: "10.5px",
              color: "#A8A498",
              marginTop: 12,
              lineHeight: 1.6,
            }}
          >
            o valor do contrato é dividido entre os ambientes escolhidos e pode ser ajustado depois
            na view do projeto
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            marginTop: 26,
            padding: "22px 34px 28px",
            borderTop: "1px solid #EAE7DF",
            background: "rgba(255,255,255,.45)",
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: "10.5px", color: "#A8A498" }}>
            entra como aguardando aprovação
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="dash-btn-ghost"
              onClick={onClose}
              style={{ borderRadius: 999, padding: "12px 20px", fontSize: "13px" }}
            >
              Cancelar
            </button>
            <button
              className="dash-btn-dark"
              onClick={() => onSave(f)}
              style={{ borderRadius: 999, padding: "12px 24px", fontSize: "13px" }}
            >
              Criar projeto
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
