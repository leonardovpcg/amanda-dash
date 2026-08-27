"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   "O briefing sugere" — revisão antes de lançar.

   Nada entra no orçamento sem ela marcar. É a diferença entre uma ferramenta
   que ela usa e uma que apagou o trabalho dela uma vez e nunca mais foi
   clicada.

   O painel mostra três coisas que o rascunho sozinho não diz:
   - o que **já está** no orçamento (não reaplica, mas confirma que foi visto);
   - o que ficou **a definir**, porque a quantidade só existe depois do 3D;
   - o que o briefing pediu e **nenhuma regra cobriu** — sem isso o rascunho
     pareceria completo sem estar.
   ═════════════════════════════════════════════════════════════════════════ */

import { useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  assinarRegras,
  assinarRoteiro,
  lerRegras,
  lerRegrasNoServidor,
  lerRoteiro,
  lerRoteiroNoServidor,
} from "@/lib/briefing/armazem";
import { aplicar, sugerir, type AmbienteSugerido, type LinhaSugerida } from "@/lib/briefing/ponte";
import type { Briefing } from "@/lib/briefing/tipos";
import type { Catalogo } from "@/lib/orcamento/catalogo";
import type { OrcamentoAmbiente } from "@/lib/orcamento/tipos";
import { MONO, NUM, cardTitle, mono } from "./ui";

/* Vai para o <body> por portal, como a proposta impressa — e por um motivo
   concreto: o painel de orçamento usa `backdrop-filter`, que cria bloco de
   contenção e faz `position: fixed` medir a partir do painel em vez da tela.
   Sem o portal o modal nasce a três mil pixels de altura da janela. */
const semOuvintes = () => () => {};
const noCliente = () => true;
const noServidor = () => false;

export default function SugestaoBriefing({
  briefing,
  ambientes,
  cat,
  onAplicar,
  onClose,
}: {
  briefing: Briefing;
  ambientes: OrcamentoAmbiente[];
  cat: Catalogo;
  onAplicar: (novos: OrcamentoAmbiente[]) => void;
  onClose: () => void;
}) {
  const roteiro = useSyncExternalStore(assinarRoteiro, lerRoteiro, lerRoteiroNoServidor);
  const regras = useSyncExternalStore(assinarRegras, lerRegras, lerRegrasNoServidor);

  const montado = useSyncExternalStore(semOuvintes, noCliente, noServidor);
  const sugestao = useMemo(
    () => sugerir(briefing, roteiro, ambientes, regras, cat),
    [briefing, roteiro, ambientes, regras, cat],
  );

  // Tudo que ainda não está no orçamento vem marcado: o caminho comum é
  // aceitar o rascunho inteiro e desmarcar as exceções.
  const [marcadas, setMarcadas] = useState<string[]>(() =>
    sugestao.ambientes.flatMap((a) => a.linhas.filter((l) => !l.jaNoOrcamento).map((l) => l.chave)),
  );

  const alternar = (chave: string) =>
    setMarcadas((m) => (m.includes(chave) ? m.filter((x) => x !== chave) : [...m, chave]));

  const alternarAmbiente = (a: AmbienteSugerido) => {
    const disponiveis = a.linhas.filter((l) => !l.jaNoOrcamento).map((l) => l.chave);
    const todasMarcadas = disponiveis.every((c) => marcadas.includes(c));
    setMarcadas((m) =>
      todasMarcadas
        ? m.filter((c) => !disponiveis.includes(c))
        : [...m, ...disponiveis.filter((c) => !m.includes(c))],
    );
  };

  const total = marcadas.length;
  const aDefinir = sugestao.ambientes
    .flatMap((a) => a.linhas)
    .filter((l) => marcadas.includes(l.chave) && l.qnt === 0).length;

  const confirmar = () => {
    onAplicar(aplicar(ambientes, sugestao, marcadas));
    onClose();
  };

  const vazio = sugestao.ambientes.every((a) => a.linhas.length === 0);

  if (!montado) return null;

  return createPortal(
    <div
      className="dash-modal-wrap"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 55,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(38,42,38,.34)",
        backdropFilter: "blur(5px)",
      }}
    >
      <div
        className="dash-modal dash-sug"
        onClick={(e) => e.stopPropagation()}
        style={{
          border: "1px solid rgba(255,255,255,.9)",
          background:
            "linear-gradient(160deg, rgba(252,251,248,.97) 0%, rgba(240,244,240,.97) 100%)",
          boxShadow: "0 40px 90px rgba(38,42,38,.32)",
        }}
      >
        <div className="dash-sug-topo">
          <div>
            <div style={mono(10.5, "#8C887C", { ls: "0.09em", upper: true })}>
              Do briefing para o orçamento
            </div>
            <h2 style={{ fontSize: "24px", fontWeight: 500, letterSpacing: "-0.03em", margin: "10px 0 0" }}>
              O briefing sugere
            </h2>
            <div style={{ fontSize: "13px", color: "#6E6A5F", marginTop: 8, lineHeight: 1.5 }}>
              Chapas e fita de borda ficam de fora — metragem só sai do projeto 3D.
            </div>
          </div>
          <button
            className="dash-btn-ghost"
            onClick={onClose}
            aria-label="Fechar"
            style={{ borderRadius: 999, width: 36, height: 36, fontSize: "15px", flex: "none" }}
          >
            ×
          </button>
        </div>

        <div className="dash-sug-corpo">
          {sugestao.observacoesGerais.length > 0 && (
            <Aviso titulo="Do briefing geral" itens={sugestao.observacoesGerais} />
          )}

          {vazio && (
            <div style={{ fontSize: "13.5px", color: "#8C887C", padding: "22px 0", lineHeight: 1.6 }}>
              O briefing ainda não tem resposta que vire item de orçamento. As perguntas que geram
              ferragem e mão de obra estão nos ambientes — tipo de abertura, puxador, divisão
              interna.
            </div>
          )}

          {sugestao.ambientes.map((a) => (
            <AmbienteBloco
              key={a.briefingAmbienteId}
              a={a}
              marcadas={marcadas}
              onAlternar={alternar}
              onAlternarTodas={() => alternarAmbiente(a)}
            />
          ))}

          {sugestao.semRegra.length > 0 && (
            <Aviso
              titulo="O briefing pediu e nenhuma regra cobriu"
              itens={sugestao.semRegra.map((x) => `${x.ambiente} · ${x.resposta}`)}
              rodape="Lance à mão, ou crie a regra em Ajustes › Regras do briefing."
              alerta
            />
          )}
        </div>

        <div className="dash-sug-pe">
          <div style={{ fontFamily: MONO, fontSize: "11px", color: "#9A9689", lineHeight: 1.6 }}>
            {total === 0 ? (
              "nenhuma linha marcada"
            ) : (
              <>
                <span style={NUM}>{total}</span> linha{total === 1 ? "" : "s"} marcada
                {total === 1 ? "" : "s"}
                {aDefinir > 0 && (
                  <>
                    {" · "}
                    <span style={{ color: "#9C2B22" }}>
                      <span style={NUM}>{aDefinir}</span> entra{aDefinir === 1 ? "" : "m"} sem
                      quantidade
                    </span>
                  </>
                )}
              </>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, flex: "none" }}>
            <button
              className="dash-btn-ghost"
              onClick={onClose}
              style={{ background: "#FFFFFF", borderRadius: 999, padding: "11px 18px", fontSize: "13px" }}
            >
              Cancelar
            </button>
            <button
              className="dash-btn-terra"
              onClick={confirmar}
              disabled={total === 0}
              style={{
                borderRadius: 999,
                padding: "11px 20px",
                fontSize: "13px",
                opacity: total === 0 ? 0.45 : 1,
              }}
            >
              Lançar no orçamento
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ── um ambiente ──────────────────────────────────────────────────────── */

function AmbienteBloco({
  a,
  marcadas,
  onAlternar,
  onAlternarTodas,
}: {
  a: AmbienteSugerido;
  marcadas: string[];
  onAlternar: (chave: string) => void;
  onAlternarTodas: () => void;
}) {
  if (a.linhas.length === 0 && a.observacoes.length === 0) return null;
  const disponiveis = a.linhas.filter((l) => !l.jaNoOrcamento);

  return (
    <section style={{ marginTop: 24 }}>
      <div className="dash-sug-amb-topo">
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={cardTitle}>{a.nome}</div>
          <span
            style={{
              fontFamily: MONO,
              fontSize: "10px",
              padding: "3px 8px",
              borderRadius: 6,
              ...(a.orcamentoAmbienteId
                ? { background: "#F1F0EA", color: "#6E6A5F" }
                : { background: "#F8EDE5", color: "#A84B1C" }),
            }}
          >
            {a.orcamentoAmbienteId ? "já no orçamento" : "ambiente novo"}
          </span>
        </div>
        {disponiveis.length > 0 && (
          <button
            className="dash-btn-link"
            onClick={onAlternarTodas}
            style={{ padding: "5px 0", fontSize: "12px", color: "#A84B1C", flex: "none" }}
          >
            marcar tudo
          </button>
        )}
      </div>

      {a.linhas.map((l) => (
        <Linha key={l.chave} l={l} marcada={marcadas.includes(l.chave)} onAlternar={() => onAlternar(l.chave)} />
      ))}

      {a.observacoes.length > 0 && (
        <ul className="dash-sug-obs">
          {a.observacoes.map((o, i) => (
            <li key={i}>{o}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Linha({
  l,
  marcada,
  onAlternar,
}: {
  l: LinhaSugerida;
  marcada: boolean;
  onAlternar: () => void;
}) {
  const desativada = l.jaNoOrcamento;
  return (
    <label className="dash-sug-linha" style={{ opacity: desativada ? 0.5 : 1 }}>
      <input
        type="checkbox"
        checked={desativada ? true : marcada}
        disabled={desativada}
        onChange={onAlternar}
        style={{ width: 18, height: 18, accentColor: "#A84B1C", flex: "none", marginTop: 2 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: "13.5px", fontWeight: 500 }}>{l.nome}</span>
          <span
            style={{
              fontFamily: MONO,
              fontSize: "10.5px",
              padding: "2px 7px",
              borderRadius: 6,
              ...NUM,
              ...(l.qnt
                ? { background: "#F1F2E8", color: "#6B7040" }
                : { background: "#FAEAE7", color: "#9C2B22" }),
            }}
          >
            {l.qnt ? `${l.qnt} ${l.unidade}` : "a definir no 3D"}
          </span>
          {desativada && (
            <span style={{ fontFamily: MONO, fontSize: "10px", color: "#9A9689" }}>
              já está no orçamento
            </span>
          )}
        </div>
        <div style={{ ...mono(10.5, "#9A9689"), marginTop: 3, lineHeight: 1.5 }}>
          {l.motivos.join(" · ")}
        </div>
      </div>
    </label>
  );
}

function Aviso({
  titulo,
  itens,
  rodape,
  alerta,
}: {
  titulo: string;
  itens: string[];
  rodape?: string;
  alerta?: boolean;
}) {
  return (
    <div
      style={{
        marginTop: 22,
        padding: "16px 18px",
        borderRadius: 16,
        background: alerta ? "#FAEAE7" : "rgba(255,255,255,.6)",
        border: "1px solid " + (alerta ? "#F1D6D1" : "rgba(255,255,255,.9)"),
      }}
    >
      <div style={mono(10, alerta ? "#9C2B22" : "#9A9689", { ls: "0.08em", upper: true })}>
        {titulo}
      </div>
      <ul className="dash-sug-obs" style={{ marginTop: 8 }}>
        {itens.map((o, i) => (
          <li key={i}>{o}</li>
        ))}
      </ul>
      {rodape && <div style={{ ...mono(10.5, "#9A9689"), marginTop: 8 }}>{rodape}</div>}
    </div>
  );
}
