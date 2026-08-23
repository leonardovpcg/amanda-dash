"use client";

import { useState } from "react";
import { AMB_OPTS, ORIGENS } from "@/lib/dashboard/data";
import { MONO, NUM, mono, pillStyle } from "./ui";

export default function NovoAtendimento({
  origem,
  onOrigem,
  ambPick,
  onToggleAmb,
  onClose,
  onSave,
}: {
  origem: string;
  onOrigem: (o: string) => void;
  ambPick: string[];
  onToggleAmb: (a: string) => void;
  onClose: () => void;
  onSave: (nome: string, valor: string) => void;
}) {
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");

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
              Funil · nova entrada
            </div>
            <h2
              style={{
                fontSize: "27px",
                fontWeight: 500,
                letterSpacing: "-0.03em",
                margin: "12px 0 0",
              }}
            >
              Novo atendimento
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
          <div className="dash-span2">
            <div style={mono(10, "#9A9689", { ls: "0.08em", upper: true })}>Cliente</div>
            <input
              className="dash-field"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome completo"
              style={{ width: "100%", marginTop: 8 }}
            />
          </div>
          <div>
            <div style={mono(10, "#9A9689", { ls: "0.08em", upper: true })}>Telefone</div>
            <input
              className="dash-field"
              placeholder="(11) 90000-0000"
              style={{ width: "100%", marginTop: 8 }}
            />
          </div>
          <div>
            <div style={mono(10, "#9A9689", { ls: "0.08em", upper: true })}>Valor estimado</div>
            <input
              className="dash-field"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="R$ 45.000"
              style={{ width: "100%", marginTop: 8, ...NUM }}
            />
          </div>
        </div>

        <div style={{ padding: "22px 34px 0" }}>
          <div style={mono(10, "#9A9689", { ls: "0.08em", upper: true })}>Origem do contato</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {ORIGENS.map((o) => (
              <button key={o} onClick={() => onOrigem(o)} style={pillStyle(origem === o)}>
                {o}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: "22px 34px 0" }}>
          <div style={mono(10, "#9A9689", { ls: "0.08em", upper: true })}>Ambientes de interesse</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {AMB_OPTS.map((a) => (
              <button key={a} onClick={() => onToggleAmb(a)} style={pillStyle(ambPick.includes(a))}>
                {a}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: "22px 34px 0" }}>
          <div style={mono(10, "#9A9689", { ls: "0.08em", upper: true })}>Próximo passo</div>
          <div className="dash-form-grid" style={{ marginTop: 10 }}>
            <input className="dash-field" placeholder="Agendar visita técnica" />
            <input className="dash-field" placeholder="27 ago 2026 · 14:30" style={NUM} />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            marginTop: 28,
            padding: "22px 34px 28px",
            borderTop: "1px solid #EAE7DF",
            background: "rgba(255,255,255,.45)",
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: "10.5px", color: "#A8A498" }}>
            entra no funil como Lead
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
              onClick={() => onSave(nome, valor)}
              style={{ borderRadius: 999, padding: "12px 24px", fontSize: "13px" }}
            >
              Salvar no funil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
