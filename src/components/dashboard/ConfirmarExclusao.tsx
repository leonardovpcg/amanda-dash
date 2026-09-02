"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Excluir em dois toques.

   Um clique só, num painel onde todo o resto também é um clique, é fácil
   demais de acertar sem querer — e do lado do banco não há desfazer. O
   primeiro toque arma e mostra o que se perde; o segundo apaga.

   Fica num componente só porque os dois lugares que apagam ambiente (o cartão
   do projeto e o do orçamento) apagam a mesma coisa: um guardado e o outro
   não seria incoerente, e a incoerência é o que ensina a clicar sem ler.
   ═════════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { mono } from "./ui";

export default function ConfirmarExclusao({
  rotulo,
  aviso,
  onExcluir,
  compacto,
}: {
  /** O texto do botão em repouso — "Excluir", "Remover ambiente". */
  rotulo: string;
  /** O que se perde. Só aparece depois de armado, que é quando importa. */
  aviso: string;
  onExcluir: () => void;
  /** Sem o aviso embaixo, para caber numa fileira de botões apertada. */
  compacto?: boolean;
}) {
  const [armado, setArmado] = useState(false);

  if (!armado) {
    return (
      <button
        className="dash-btn-link"
        onClick={() => setArmado(true)}
        style={{ fontSize: compacto ? "11.5px" : "12px", color: "#9C2B22" }}
      >
        {rotulo}
      </button>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <button
        className="dash-btn"
        onClick={onExcluir}
        style={{
          borderRadius: 999,
          padding: compacto ? "5px 12px" : "8px 15px",
          fontSize: compacto ? "11.5px" : "12px",
          background: "#9C2B22",
          borderColor: "#9C2B22",
          color: "#FFFFFF",
        }}
      >
        Excluir mesmo
      </button>
      <button
        className="dash-btn-link"
        onClick={() => setArmado(false)}
        style={{ fontSize: compacto ? "11.5px" : "12px" }}
      >
        Cancelar
      </button>
      <span style={mono(compacto ? 10.5 : 11, "#B4AFA1")}>{aviso}</span>
    </span>
  );
}
