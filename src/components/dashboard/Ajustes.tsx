"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Ajustes — o que ela configura uma vez e depois só ajusta.

   Quatro telas grandes demais para caber juntas numa rolagem só, e usadas em
   momentos diferentes: a tabela de valores mexe quando o fornecedor reajusta,
   o roteiro mexe quando uma pergunta se mostra mal formulada na reunião, as
   regras mexem quando o rascunho do orçamento erra ou deixa passar, e a meta
   mexe uma vez por mês.
   ═════════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import MetaEditor from "./MetaEditor";
import RegrasEditor from "./RegrasEditor";
import RoteiroEditor from "./RoteiroEditor";
import TabelaValores from "./TabelaValores";
import { pillStyle } from "./ui";

type Secao = "valores" | "meta" | "roteiro" | "regras";

const SECOES: [Secao, string][] = [
  ["valores", "Tabela de valores"],
  ["meta", "Meta do mês"],
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
      {secao === "meta" && <MetaEditor />}
      {secao === "roteiro" && <RoteiroEditor />}
      {secao === "regras" && <RegrasEditor />}
    </div>
  );
}
