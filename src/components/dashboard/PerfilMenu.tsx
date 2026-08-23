"use client";

import { useEffect } from "react";
import type { Perfil } from "@/lib/dashboard/perfil";
import Avatar from "./Avatar";
import { MONO, mono } from "./ui";

type Item = {
  label: string;
  detalhe: string;
  onClick?: () => void;
  /** Ações que dependem do login, que ainda não existe. */
  pendente?: boolean;
  tom?: "normal" | "sair";
};

export default function PerfilMenu({
  perfil,
  onClose,
  onEditar,
}: {
  perfil: Perfil;
  onClose: () => void;
  onEditar: () => void;
}) {
  // Esc fecha, como qualquer menu
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const itens: Item[] = [
    { label: "Editar perfil", detalhe: "foto e nome", onClick: onEditar },
    { label: "Alterar senha", detalhe: "requer login", pendente: true },
    { label: "Sair da conta", detalhe: "requer login", pendente: true, tom: "sair" },
  ];

  return (
    <>
      {/* captura o clique fora */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 60 }}
        aria-hidden
      />
      <div className="dash-perfil-menu" role="menu" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 4px 14px" }}>
          <Avatar perfil={perfil} size={44} fontSize={16} />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: "15px",
                fontWeight: 600,
                letterSpacing: "-0.015em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {perfil.nome}
            </div>
            <div style={{ ...mono(10.5, "#9A9689"), marginTop: 3 }}>
              perfil salvo neste navegador
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid #EDEAE2" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 8 }}>
          {itens.map((it) => (
            <button
              key={it.label}
              role="menuitem"
              className="dash-perfil-item"
              onClick={it.onClick}
              disabled={it.pendente}
              style={{
                color: it.tom === "sair" ? "#A85C3C" : "#23231F",
              }}
            >
              <span style={{ fontSize: "13.5px", fontWeight: 600, letterSpacing: "-0.01em" }}>
                {it.label}
              </span>
              <span style={{ fontFamily: MONO, fontSize: "10.5px", color: "#9A9689" }}>
                {it.detalhe}
              </span>
            </button>
          ))}
        </div>

        <div
          style={{
            ...mono(10.5, "#A8A498"),
            lineHeight: 1.55,
            marginTop: 10,
            paddingTop: 10,
            borderTop: "1px solid #F0EDE5",
          }}
        >
          senha e sair passam a funcionar quando o login entrar
        </div>
      </div>
    </>
  );
}
