"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Ajustes — o que ela configura uma vez e depois só ajusta.

   Três telas grandes demais para caber juntas numa rolagem só, e usadas em
   momentos diferentes: a tabela de valores mexe quando o fornecedor reajusta,
   o roteiro mexe quando uma pergunta se mostra mal formulada na reunião, e as
   regras mexem quando o rascunho do orçamento erra ou deixa passar.
   ═════════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import RegrasEditor from "./RegrasEditor";
import RoteiroEditor from "./RoteiroEditor";
import TabelaValores from "./TabelaValores";
import { pillStyle } from "./ui";

type Secao = "valores" | "roteiro" | "regras";

const SECOES: [Secao, string][] = [
  ["valores", "Tabela de valores"],
  ["roteiro", "Roteiro de briefing"],
  ["regras", "Regras do briefing"],
];

export default function Ajustes() {
  const [secao, setSecao] = useState<Secao>("valores");

  return (
    <div className="dash-tabpad" style={{ maxWidth: 1440 }}>
      <div style={{ display: "flex", gap: 8, marginTop: 4, marginBottom: 22, flexWrap: "wrap" }}>
        {SECOES.map(([id, rotulo]) => (
          <button key={id} onClick={() => setSecao(id)} style={pillStyle(secao === id)}>
            {rotulo}
          </button>
        ))}
      </div>
      {secao === "valores" && <TabelaValores />}
      {secao === "roteiro" && <RoteiroEditor />}
      {secao === "regras" && <RegrasEditor />}
    </div>
  );
}
