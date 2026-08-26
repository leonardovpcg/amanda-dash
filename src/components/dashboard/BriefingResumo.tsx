"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Briefing no detalhe do projeto — só leitura.

   Quando o lead vira projeto, o que o cliente disse na reunião precisa estar
   ao lado do orçamento, não enterrado no funil. Aqui só aparece o que foi
   respondido: uma lista de perguntas em branco não ajuda ninguém a projetar.

   Editar continua sendo pelo modo reunião, que é onde as respostas nascem.
   ═════════════════════════════════════════════════════════════════════════ */

import { useSyncExternalStore } from "react";
import {
  assinarRoteiro,
  lerRoteiro,
  lerRoteiroNoServidor,
  progressoDoBriefing,
} from "@/lib/briefing/armazem";
import type { Briefing, Respostas, Secao, ValorResposta } from "@/lib/briefing/tipos";
import { MONO, NUM, cardTitle, mono, panel } from "./ui";

/** Uma resposta como frase — é assim que ela vai ler em voz alta depois. */
function emTexto(v: ValorResposta, unidade?: string): string {
  if (Array.isArray(v)) return v.join(" · ");
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (typeof v === "number")
    return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + (unidade ? " " + unidade : "");
  return v;
}

export default function BriefingResumo({
  briefing,
  onAbrir,
}: {
  briefing: Briefing | null;
  onAbrir: () => void;
}) {
  const roteiro = useSyncExternalStore(assinarRoteiro, lerRoteiro, lerRoteiroNoServidor);

  if (!briefing) {
    return (
      <div style={{ ...panel, padding: "28px 30px", marginTop: 20 }}>
        <div style={cardTitle}>Briefing do cliente</div>
        <div style={{ fontSize: "13px", color: "#8C887C", marginTop: 8 }}>
          Este projeto não veio de um lead com briefing. O vínculo é feito no funil.
        </div>
      </div>
    );
  }

  const p = progressoDoBriefing(briefing, roteiro);
  const partes = [
    { titulo: "Geral", secoes: roteiro.geral, respostas: briefing.geral, nota: briefing.notaGeral },
    ...briefing.ambientes.map((a) => ({
      titulo: a.apelido,
      secoes: roteiro.ambientes.find((x) => x.id === a.tipo)?.secoes ?? [],
      respostas: a.respostas,
      nota: a.nota,
    })),
  ];

  return (
    <div style={{ ...panel, padding: "28px 30px", marginTop: 20 }}>
      <div
        style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14 }}
      >
        <div>
          <div style={cardTitle}>Briefing do cliente</div>
          <div style={{ fontFamily: MONO, fontSize: "11px", color: "#9A9689", marginTop: 5 }}>
            <span style={NUM}>
              {p.resolvidas}/{p.total}
            </span>{" "}
            respondidas
            {p.essenciaisAbertas > 0 && (
              <span style={{ color: "#9C2B22" }}>
                {" · "}
                {p.essenciaisAbertas} essencia{p.essenciaisAbertas === 1 ? "l" : "is"} em aberto
              </span>
            )}
            {briefing.atualizadoEm && (
              <> · atualizado em {new Date(briefing.atualizadoEm).toLocaleDateString("pt-BR")}</>
            )}
          </div>
        </div>
        <button
          className="dash-btn-outline"
          onClick={onAbrir}
          style={{ borderRadius: 999, padding: "8px 15px", fontSize: "12.5px", flex: "none" }}
        >
          Abrir briefing
        </button>
      </div>

      <div className="dash-brief-resumo">
        {partes.map((parte, i) => (
          <ParteResumo key={i} {...parte} />
        ))}
      </div>
    </div>
  );
}

function ParteResumo({
  titulo,
  secoes,
  respostas,
  nota,
}: {
  titulo: string;
  secoes: Secao[];
  respostas: Respostas;
  nota: string;
}) {
  const itens = secoes.flatMap((s) =>
    s.perguntas.flatMap((q) => {
      const r = respostas[q.id];
      if (!r || r.estado !== "respondida") return [];
      return [{ id: q.id, pergunta: q.texto, valor: emTexto(r.valor, q.unidade) }];
    }),
  );

  if (itens.length === 0 && !nota.trim()) return null;

  return (
    <section>
      <h4
        style={{
          ...mono(10, "#9A9689", { ls: "0.08em", upper: true }),
          margin: 0,
          paddingBottom: 9,
          borderBottom: "1px solid #EDEAE2",
        }}
      >
        {titulo}
      </h4>
      {itens.map((i) => (
        <div key={i.id} style={{ padding: "11px 0", borderBottom: "1px solid #F4F1EA" }}>
          <div style={{ fontSize: "11.5px", color: "#8C887C" }}>{i.pergunta}</div>
          <div style={{ fontSize: "13.5px", marginTop: 3, lineHeight: 1.45 }}>{i.valor}</div>
        </div>
      ))}
      {nota.trim() && (
        <div style={{ padding: "11px 0" }}>
          <div style={{ fontSize: "11.5px", color: "#8C887C" }}>Anotações</div>
          <div style={{ fontSize: "13.5px", marginTop: 3, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
            {nota}
          </div>
        </div>
      )}
    </section>
  );
}
