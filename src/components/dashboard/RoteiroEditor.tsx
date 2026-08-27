"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Editor do roteiro de briefing.

   O roteiro é dado, não código: depois da primeira semana usando, ela vai
   querer trocar uma pergunta que ninguém entendeu e acrescentar a que faltou.
   Esperar um deploy para isso mataria a ferramenta.

   Salva a cada tecla, como a tabela de valores, e "Restaurar" volta ao roteiro
   de fábrica. Briefings já preenchidos não se mexem: a resposta fica guardada
   pelo id da pergunta, então remover uma pergunta some com ela da tela mas não
   apaga o que o cliente disse.
   ═════════════════════════════════════════════════════════════════════════ */

import { useState, useSyncExternalStore } from "react";
import {
  assinarRoteiro,
  assinarStatusRoteiro,
  guardarRoteiro,
  lerRoteiro,
  lerRoteiroNoServidor,
  lerStatusRoteiro,
  lerStatusRoteiroNoServidor,
  restaurarRoteiro,
  roteiroEditado,
} from "@/lib/briefing/armazem";
import type { Pergunta, Roteiro, Secao, TipoResposta } from "@/lib/briefing/tipos";
import SinalDeArmazem from "./StatusDoArmazem";
import { MONO, cardTitle, mono, panel, pillStyle, sectionTitle } from "./ui";

const TIPOS: [TipoResposta, string][] = [
  ["multipla", "Várias opções"],
  ["escolha", "Uma opção"],
  ["simNao", "Sim / Não"],
  ["texto", "Texto livre"],
  ["numero", "Número"],
];

export default function RoteiroEditor() {
  const roteiro = useSyncExternalStore(assinarRoteiro, lerRoteiro, lerRoteiroNoServidor);
  const [parte, setParte] = useState("geral");
  const editado = roteiroEditado(roteiro);

  const salvar = (fn: (r: Roteiro) => Roteiro) => guardarRoteiro(fn(roteiro));

  const geral = parte === "geral";
  const ambiente = roteiro.ambientes.find((a) => a.id === parte);
  const secoes: Secao[] = geral ? roteiro.geral : (ambiente?.secoes ?? []);

  /** Troca as seções da parte aberta, seja o geral ou um ambiente. */
  const trocarSecoes = (fn: (s: Secao[]) => Secao[]) =>
    salvar((r) =>
      geral
        ? { ...r, geral: fn(r.geral) }
        : {
            ...r,
            ambientes: r.ambientes.map((a) =>
              a.id === parte ? { ...a, secoes: fn(a.secoes) } : a,
            ),
          },
    );

  const trocarPergunta = (si: number, pi: number, fn: (p: Pergunta) => Pergunta) =>
    trocarSecoes((ss) =>
      ss.map((s, i) =>
        i === si ? { ...s, perguntas: s.perguntas.map((p, k) => (k === pi ? fn(p) : p)) } : s,
      ),
    );

  const contar = (ss: Secao[]) => ss.reduce((n, s) => n + s.perguntas.length, 0);

  return (
    <>
      <div className="dash-ajustes-cabeca">
        <div>
          <h2 style={sectionTitle}>Roteiro de briefing</h2>
          <div style={{ fontSize: "13px", color: "#6E6A5F", marginTop: 6 }}>
            As perguntas da primeira reunião. Escreva como você pergunta em voz alta.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <SinalDeArmazem
            assinar={assinarStatusRoteiro}
            ler={lerStatusRoteiro}
            lerNoServidor={lerStatusRoteiroNoServidor}
            rotuloPadrao="roteiro padrão"
            rotuloEditado="editado"
            editado={editado}
          />
          <button
            className="dash-btn-outline"
            onClick={restaurarRoteiro}
            disabled={!editado}
            style={{
              borderRadius: 999,
              padding: "9px 16px",
              fontSize: "12.5px",
              opacity: editado ? 1 : 0.45,
            }}
          >
            Restaurar padrão
          </button>
        </div>
      </div>

      {/* ── partes ──────────────────────────────────────────────────── */}
      <div className="dash-brief-abas" style={{ padding: "18px 0" }}>
        <button onClick={() => setParte("geral")} style={{ ...pillStyle(geral), flex: "none" }}>
          Geral <span style={{ fontFamily: MONO, fontSize: "10px" }}>{contar(roteiro.geral)}</span>
        </button>
        {roteiro.ambientes.map((a) => (
          <button
            key={a.id}
            onClick={() => setParte(a.id)}
            style={{ ...pillStyle(a.id === parte), flex: "none" }}
          >
            {a.nome} <span style={{ fontFamily: MONO, fontSize: "10px" }}>{contar(a.secoes)}</span>
          </button>
        ))}
        <button
          className="dash-btn-outline"
          onClick={() => {
            const id = "amb" + Date.now();
            salvar((r) => ({
              ...r,
              ambientes: [
                ...r.ambientes,
                { id, nome: "Novo ambiente", secoes: [{ id: "s1", titulo: "Perguntas", perguntas: [] }] },
              ],
            }));
            setParte(id);
          }}
          style={{ borderRadius: 999, padding: "9px 15px", fontSize: "12.5px", flex: "none" }}
        >
          + Tipo de ambiente
        </button>
      </div>

      {/* nome do tipo de ambiente */}
      {!geral && ambiente && (
        <div style={{ ...panel, padding: "20px 24px", display: "flex", alignItems: "flex-end", gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={mono(10, "#9A9689", { ls: "0.07em", upper: true })}>Tipo de ambiente</div>
            <input
              className="dash-inline"
              value={ambiente.nome}
              onChange={(e) =>
                salvar((r) => ({
                  ...r,
                  ambientes: r.ambientes.map((a) =>
                    a.id === parte ? { ...a, nome: e.target.value } : a,
                  ),
                }))
              }
              style={{ fontSize: "17px", fontWeight: 600, width: "100%", marginTop: 2 }}
            />
          </div>
          <button
            className="dash-btn-link"
            onClick={() => {
              salvar((r) => ({ ...r, ambientes: r.ambientes.filter((a) => a.id !== parte) }));
              setParte("geral");
            }}
            style={{ padding: "6px 0", fontSize: "12px", color: "#9C2B22", flex: "none" }}
          >
            Remover tipo
          </button>
        </div>
      )}

      {/* ── seções ──────────────────────────────────────────────────── */}
      {secoes.map((s, si) => (
        <div key={s.id} style={{ ...panel, padding: "24px 26px 12px", marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <input
              className="dash-inline"
              value={s.titulo}
              onChange={(e) =>
                trocarSecoes((ss) =>
                  ss.map((x, i) => (i === si ? { ...x, titulo: e.target.value } : x)),
                )
              }
              style={{ ...cardTitle, flex: 1, minWidth: 0 }}
            />
            <button
              className="dash-btn-link"
              onClick={() => trocarSecoes((ss) => ss.filter((_, i) => i !== si))}
              style={{ padding: "6px 0", fontSize: "12px", color: "#9C2B22", flex: "none" }}
            >
              Remover seção
            </button>
          </div>

          {s.perguntas.map((p, pi) => (
            <div key={p.id} className="dash-rot-perg">
              <div className="dash-rot-linha">
                <input
                  className="dash-field dash-field-sm"
                  value={p.texto}
                  onChange={(e) => trocarPergunta(si, pi, (x) => ({ ...x, texto: e.target.value }))}
                  placeholder="Como você pergunta em voz alta"
                  style={{ width: "100%" }}
                />
                <select
                  className="dash-select"
                  value={p.tipo}
                  onChange={(e) =>
                    trocarPergunta(si, pi, (x) => ({ ...x, tipo: e.target.value as TipoResposta }))
                  }
                >
                  {TIPOS.map(([v, r]) => (
                    <option key={v} value={v}>
                      {r}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => trocarPergunta(si, pi, (x) => ({ ...x, essencial: !x.essencial }))}
                  title="Sem isto respondido não dá para orçar"
                  style={{ ...pillStyle(!!p.essencial), padding: "9px 13px", whiteSpace: "nowrap" }}
                >
                  essencial
                </button>
                <button
                  className="dash-btn-step"
                  onClick={() =>
                    trocarSecoes((ss) =>
                      ss.map((x, i) =>
                        i === si ? { ...x, perguntas: x.perguntas.filter((_, k) => k !== pi) } : x,
                      ),
                    )
                  }
                  aria-label={"Remover pergunta " + p.texto}
                  style={{ borderRadius: 999, width: 26, height: 26, fontSize: "12px", lineHeight: 1 }}
                >
                  ×
                </button>
              </div>

              <input
                className="dash-field dash-field-sm"
                value={p.ajuda ?? ""}
                onChange={(e) =>
                  trocarPergunta(si, pi, (x) => ({ ...x, ajuda: e.target.value || undefined }))
                }
                placeholder="Por que a pergunta existe (aparece pequeno embaixo)"
                style={{ width: "100%", marginTop: 8 }}
              />

              {(p.tipo === "escolha" || p.tipo === "multipla") && (
                <div style={{ marginTop: 8 }}>
                  <div style={mono(10, "#9A9689", { ls: "0.07em", upper: true })}>
                    Opções · uma por linha
                  </div>
                  <textarea
                    className="dash-field dash-field-sm"
                    value={(p.opcoes ?? []).join("\n")}
                    onChange={(e) =>
                      trocarPergunta(si, pi, (x) => ({
                        ...x,
                        opcoes: e.target.value.split("\n").map((o) => o.trim()).filter(Boolean),
                      }))
                    }
                    rows={Math.max(3, (p.opcoes ?? []).length + 1)}
                    style={{ width: "100%", marginTop: 6, resize: "vertical", lineHeight: 1.5 }}
                  />
                </div>
              )}

              {p.tipo === "numero" && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <span style={{ fontSize: "12.5px", color: "#6E6A5F" }}>Unidade</span>
                  <input
                    className="dash-field dash-field-sm"
                    value={p.unidade ?? ""}
                    onChange={(e) =>
                      trocarPergunta(si, pi, (x) => ({ ...x, unidade: e.target.value || undefined }))
                    }
                    placeholder="gavetas, m, pessoas"
                    style={{ width: 180 }}
                  />
                </div>
              )}
            </div>
          ))}

          <button
            className="dash-btn-link"
            onClick={() =>
              trocarSecoes((ss) =>
                ss.map((x, i) =>
                  i === si
                    ? {
                        ...x,
                        perguntas: [
                          ...x.perguntas,
                          { id: "p" + Date.now(), texto: "Nova pergunta", tipo: "texto" },
                        ],
                      }
                    : x,
                ),
              )
            }
            style={{ padding: "12px 0", fontSize: "12.5px", color: "#A84B1C" }}
          >
            + pergunta
          </button>
        </div>
      ))}

      <button
        className="dash-btn-outline"
        onClick={() =>
          trocarSecoes((ss) => [
            ...ss,
            { id: "s" + Date.now(), titulo: "Nova seção", perguntas: [] },
          ])
        }
        style={{ borderRadius: 999, padding: "10px 18px", fontSize: "12.5px", marginTop: 18 }}
      >
        + Seção
      </button>
    </>
  );
}
