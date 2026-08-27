"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Editor das regras da ponte.

   Cada regra é escrita como frase — "em Cozinha, quando Tipo de abertura tem a
   opção Giro, lançar Dobradiça Blum" — porque quem edita não pensa em campo de
   formulário, pensa na conversa que teve com o cliente.

   Regra órfã (pergunta ou item que sumiu do roteiro ou do catálogo) fica
   marcada em vez de desaparecer: some sozinha do rascunho e ela nunca saberia
   por quê.
   ═════════════════════════════════════════════════════════════════════════ */

import { useState, useSyncExternalStore } from "react";
import {
  assinarRegras,
  assinarRoteiro,
  guardarRegras,
  lerRegras,
  lerRegrasNoServidor,
  lerRoteiro,
  lerRoteiroNoServidor,
  regrasEditadas,
  restaurarRegras,
} from "@/lib/briefing/armazem";
import type {
  BlocoDestino,
  Gatilho,
  Quantidade,
  RegraDeLinha,
  RegraDeObservacao,
  Regras,
} from "@/lib/briefing/regras";
import type { Pergunta, Roteiro } from "@/lib/briefing/tipos";
import {
  assinarCatalogo,
  lerCatalogo,
  lerCatalogoNoServidor,
} from "@/lib/orcamento/catalogo";
import { MONO, cardTitle, mono, panel, pillStyle, sectionTitle } from "./ui";

const GATILHOS: [Gatilho["tipo"], string][] = [
  ["temOpcao", "tem a opção"],
  ["igualA", "é igual a"],
  ["respondida", "foi respondida"],
];

const QUANTIDADES: [Quantidade["tipo"], string][] = [
  ["aDefinir", "a definir no 3D"],
  ["porResposta", "vem de uma resposta"],
  ["fixa", "fixa"],
];

/** Perguntas do roteiro daquele ambiente, achatadas das seções. */
function perguntasDe(roteiro: Roteiro, ambiente: string): Pergunta[] {
  const secoes =
    ambiente === "geral" ? roteiro.geral : (roteiro.ambientes.find((a) => a.id === ambiente)?.secoes ?? []);
  return secoes.flatMap((s) => s.perguntas);
}

export default function RegrasEditor() {
  const roteiro = useSyncExternalStore(assinarRoteiro, lerRoteiro, lerRoteiroNoServidor);
  const regras = useSyncExternalStore(assinarRegras, lerRegras, lerRegrasNoServidor);
  const cat = useSyncExternalStore(assinarCatalogo, lerCatalogo, lerCatalogoNoServidor);
  const [parte, setParte] = useState("cozinha");
  const editadas = regrasEditadas(regras);

  const salvar = (fn: (r: Regras) => Regras) => guardarRegras(fn(regras));

  const partes = [{ id: "geral", nome: "Geral" }, ...roteiro.ambientes];
  const perguntas = perguntasDe(roteiro, parte);
  const linhas = regras.linhas.filter((r) => r.ambiente === parte);
  const observacoes = regras.observacoes.filter((r) => r.ambiente === parte);

  const itensDoBloco = (bloco: BlocoDestino) =>
    bloco === "acessorios"
      ? cat.acessorios.map((a) => ({ id: a.id, nome: a.nome }))
      : cat.maoDeObra.map((s) => ({ id: s.id, nome: s.nome }));

  const trocarLinha = (id: string, fn: (r: RegraDeLinha) => RegraDeLinha) =>
    salvar((rs) => ({ ...rs, linhas: rs.linhas.map((r) => (r.id === id ? fn(r) : r)) }));

  const trocarObs = (id: string, fn: (r: RegraDeObservacao) => RegraDeObservacao) =>
    salvar((rs) => ({ ...rs, observacoes: rs.observacoes.map((r) => (r.id === id ? fn(r) : r)) }));

  return (
    <>
      <div className="dash-ajustes-cabeca">
        <div>
          <h2 style={sectionTitle}>Regras do briefing</h2>
          <div style={{ fontSize: "13px", color: "#6E6A5F", marginTop: 6, maxWidth: 620, lineHeight: 1.5 }}>
            O que cada resposta lança no orçamento. Chapas e fita não entram aqui — metragem só sai
            do projeto 3D.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontFamily: MONO, fontSize: "11px", color: editadas ? "#A84B1C" : "#9A9689" }}>
            {editadas ? "editadas nesta máquina" : "regras padrão"}
          </div>
          <button
            className="dash-btn-outline"
            onClick={restaurarRegras}
            disabled={!editadas}
            style={{ borderRadius: 999, padding: "9px 16px", fontSize: "12.5px", opacity: editadas ? 1 : 0.45 }}
          >
            Restaurar padrão
          </button>
        </div>
      </div>

      <div className="dash-brief-abas" style={{ padding: "18px 0" }}>
        {partes.map((p) => {
          const n =
            regras.linhas.filter((r) => r.ambiente === p.id).length +
            regras.observacoes.filter((r) => r.ambiente === p.id).length;
          return (
            <button
              key={p.id}
              onClick={() => setParte(p.id)}
              style={{ ...pillStyle(p.id === parte), flex: "none" }}
            >
              {p.nome} <span style={{ fontFamily: MONO, fontSize: "10px" }}>{n}</span>
            </button>
          );
        })}
      </div>

      {/* ── regras que lançam linha ──────────────────────────────────── */}
      <div style={{ ...panel, padding: "24px 26px 12px" }}>
        <div style={cardTitle}>Lançamentos</div>
        {linhas.length === 0 && (
          <div style={{ fontSize: "12.5px", color: "#8C887C", marginTop: 10 }}>
            Nenhuma regra de lançamento neste ambiente.
          </div>
        )}
        {linhas.map((r) => {
          const pergunta = perguntas.find((p) => p.id === r.perguntaId);
          const itens = itensDoBloco(r.bloco);
          const itemExiste = itens.some((i) => i.id === r.itemId);
          return (
            <div key={r.id} className="dash-regra">
              {(!pergunta || !itemExiste) && (
                <div style={{ ...mono(10.5, "#9C2B22"), marginBottom: 8 }}>
                  {!pergunta ? "pergunta não existe mais no roteiro" : "item não existe mais no catálogo"}{" "}
                  — esta regra não dispara
                </div>
              )}

              <div className="dash-regra-frase">
                <span>quando</span>
                <Sel
                  valor={r.perguntaId}
                  opcoes={perguntas.map((p) => ({ id: p.id, nome: p.texto }))}
                  onChange={(v) => trocarLinha(r.id, (x) => ({ ...x, perguntaId: v }))}
                  larga
                />
                <Sel
                  valor={r.quando.tipo}
                  opcoes={GATILHOS.map(([id, nome]) => ({ id, nome }))}
                  onChange={(v) =>
                    trocarLinha(r.id, (x) => ({ ...x, quando: novoGatilho(v as Gatilho["tipo"], pergunta) }))
                  }
                />
                <ValorGatilho
                  g={r.quando}
                  pergunta={pergunta}
                  onChange={(g) => trocarLinha(r.id, (x) => ({ ...x, quando: g }))}
                />
              </div>

              <div className="dash-regra-frase">
                <span>lançar em</span>
                <Sel
                  valor={r.bloco}
                  opcoes={[
                    { id: "acessorios", nome: "Acessórios" },
                    { id: "maoDeObra", nome: "Mão de obra" },
                  ]}
                  onChange={(v) => {
                    const bloco = v as BlocoDestino;
                    const primeiros = itensDoBloco(bloco);
                    trocarLinha(r.id, (x) => ({ ...x, bloco, itemId: primeiros[0]?.id ?? x.itemId }));
                  }}
                />
                <Sel
                  valor={r.itemId}
                  opcoes={itens}
                  onChange={(v) => trocarLinha(r.id, (x) => ({ ...x, itemId: v }))}
                  larga
                />
                <span>quantidade</span>
                <Sel
                  valor={r.quantidade.tipo}
                  opcoes={QUANTIDADES.map(([id, nome]) => ({ id, nome }))}
                  onChange={(v) =>
                    trocarLinha(r.id, (x) => ({
                      ...x,
                      quantidade: novaQuantidade(v as Quantidade["tipo"], perguntas),
                    }))
                  }
                />
                <ValorQuantidade
                  q={r.quantidade}
                  perguntas={perguntas}
                  onChange={(q) => trocarLinha(r.id, (x) => ({ ...x, quantidade: q }))}
                />
                <button
                  className="dash-btn-step"
                  onClick={() => salvar((rs) => ({ ...rs, linhas: rs.linhas.filter((x) => x.id !== r.id) }))}
                  aria-label="Remover regra"
                  style={{ borderRadius: 999, width: 26, height: 26, fontSize: "12px", lineHeight: 1, marginLeft: "auto" }}
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
        <button
          className="dash-btn-link"
          onClick={() =>
            salvar((rs) => ({
              ...rs,
              linhas: [
                ...rs.linhas,
                {
                  id: "r" + Date.now(),
                  ambiente: parte,
                  perguntaId: perguntas[0]?.id ?? "",
                  quando: novoGatilho("temOpcao", perguntas[0]),
                  bloco: "acessorios",
                  itemId: cat.acessorios[0]?.id ?? "",
                  quantidade: { tipo: "aDefinir" },
                },
              ],
            }))
          }
          style={{ padding: "12px 0", fontSize: "12.5px", color: "#A84B1C" }}
        >
          + regra
        </button>
      </div>

      {/* ── observações ──────────────────────────────────────────────── */}
      <div style={{ ...panel, padding: "24px 26px 12px", marginTop: 16 }}>
        <div style={cardTitle}>Observações</div>
        <div style={{ fontSize: "12.5px", color: "#8C887C", marginTop: 6 }}>
          Avisos que não viram linha, mas mudam o projeto — MDF hidrófugo, área descoberta,
          conferir vão na medição.
        </div>
        {observacoes.map((r) => {
          const pergunta = perguntas.find((p) => p.id === r.perguntaId);
          return (
            <div key={r.id} className="dash-regra">
              {!pergunta && (
                <div style={{ ...mono(10.5, "#9C2B22"), marginBottom: 8 }}>
                  pergunta não existe mais no roteiro — esta observação não aparece
                </div>
              )}
              <div className="dash-regra-frase">
                <span>quando</span>
                <Sel
                  valor={r.perguntaId}
                  opcoes={perguntas.map((p) => ({ id: p.id, nome: p.texto }))}
                  onChange={(v) => trocarObs(r.id, (x) => ({ ...x, perguntaId: v }))}
                  larga
                />
                <Sel
                  valor={r.quando.tipo}
                  opcoes={GATILHOS.map(([id, nome]) => ({ id, nome }))}
                  onChange={(v) =>
                    trocarObs(r.id, (x) => ({ ...x, quando: novoGatilho(v as Gatilho["tipo"], pergunta) }))
                  }
                />
                <ValorGatilho
                  g={r.quando}
                  pergunta={pergunta}
                  onChange={(g) => trocarObs(r.id, (x) => ({ ...x, quando: g }))}
                />
                <button
                  className="dash-btn-step"
                  onClick={() =>
                    salvar((rs) => ({ ...rs, observacoes: rs.observacoes.filter((x) => x.id !== r.id) }))
                  }
                  aria-label="Remover observação"
                  style={{ borderRadius: 999, width: 26, height: 26, fontSize: "12px", lineHeight: 1, marginLeft: "auto" }}
                >
                  ×
                </button>
              </div>
              <textarea
                className="dash-field dash-field-sm"
                value={r.texto}
                onChange={(e) => trocarObs(r.id, (x) => ({ ...x, texto: e.target.value }))}
                rows={2}
                placeholder="O aviso, como ela vai ler no rascunho"
                style={{ width: "100%", marginTop: 8, resize: "vertical", lineHeight: 1.5 }}
              />
            </div>
          );
        })}
        <button
          className="dash-btn-link"
          onClick={() =>
            salvar((rs) => ({
              ...rs,
              observacoes: [
                ...rs.observacoes,
                {
                  id: "o" + Date.now(),
                  ambiente: parte,
                  perguntaId: perguntas[0]?.id ?? "",
                  quando: novoGatilho("respondida", perguntas[0]),
                  texto: "",
                },
              ],
            }))
          }
          style={{ padding: "12px 0", fontSize: "12.5px", color: "#A84B1C" }}
        >
          + observação
        </button>
      </div>
    </>
  );
}

/* ── ajuda ────────────────────────────────────────────────────────────── */

/** Gatilho novo já com um valor plausível para o tipo da pergunta. */
function novoGatilho(tipo: Gatilho["tipo"], p: Pergunta | undefined): Gatilho {
  if (tipo === "respondida") return { tipo: "respondida" };
  if (tipo === "temOpcao") return { tipo: "temOpcao", opcao: p?.opcoes?.[0] ?? "" };
  return { tipo: "igualA", valor: p?.tipo === "simNao" ? true : (p?.opcoes?.[0] ?? "") };
}

function novaQuantidade(tipo: Quantidade["tipo"], perguntas: Pergunta[]): Quantidade {
  if (tipo === "fixa") return { tipo: "fixa", n: 1 };
  if (tipo === "porResposta") {
    const numerica = perguntas.find((p) => p.tipo === "numero");
    return { tipo: "porResposta", perguntaId: numerica?.id ?? "", fator: 1 };
  }
  return { tipo: "aDefinir" };
}

function ValorGatilho({
  g,
  pergunta,
  onChange,
}: {
  g: Gatilho;
  pergunta: Pergunta | undefined;
  onChange: (g: Gatilho) => void;
}) {
  if (g.tipo === "respondida") return null;

  if (g.tipo === "temOpcao") {
    const opcoes = (pergunta?.opcoes ?? []).map((o) => ({ id: o, nome: o }));
    return (
      <Sel
        valor={g.opcao}
        opcoes={opcoes}
        onChange={(v) => onChange({ tipo: "temOpcao", opcao: v })}
        larga
      />
    );
  }

  if (pergunta?.tipo === "simNao") {
    return (
      <Sel
        valor={g.valor === true ? "sim" : "nao"}
        opcoes={[
          { id: "sim", nome: "Sim" },
          { id: "nao", nome: "Não" },
        ]}
        onChange={(v) => onChange({ tipo: "igualA", valor: v === "sim" })}
      />
    );
  }

  const opcoes = (pergunta?.opcoes ?? []).map((o) => ({ id: o, nome: o }));
  return (
    <Sel
      valor={String(g.valor)}
      opcoes={opcoes}
      onChange={(v) => onChange({ tipo: "igualA", valor: v })}
      larga
    />
  );
}

function ValorQuantidade({
  q,
  perguntas,
  onChange,
}: {
  q: Quantidade;
  perguntas: Pergunta[];
  onChange: (q: Quantidade) => void;
}) {
  if (q.tipo === "aDefinir") return null;

  if (q.tipo === "fixa") {
    return (
      <input
        className="dash-field dash-field-sm"
        inputMode="decimal"
        value={String(q.n).replace(".", ",")}
        onChange={(e) => {
          const n = parseFloat(e.target.value.replace(",", "."));
          onChange({ tipo: "fixa", n: Number.isFinite(n) && n >= 0 ? n : 0 });
        }}
        style={{ width: 70, textAlign: "right" }}
      />
    );
  }

  const numericas = perguntas.filter((p) => p.tipo === "numero").map((p) => ({ id: p.id, nome: p.texto }));
  return (
    <>
      <Sel
        valor={q.perguntaId}
        opcoes={numericas}
        onChange={(v) => onChange({ ...q, perguntaId: v })}
        larga
      />
      <span>×</span>
      <input
        className="dash-field dash-field-sm"
        inputMode="decimal"
        value={String(q.fator).replace(".", ",")}
        onChange={(e) => {
          const n = parseFloat(e.target.value.replace(",", "."));
          onChange({ ...q, fator: Number.isFinite(n) && n >= 0 ? n : 0 });
        }}
        style={{ width: 62, textAlign: "right" }}
      />
    </>
  );
}

function Sel({
  valor,
  opcoes,
  onChange,
  larga,
}: {
  valor: string;
  opcoes: { id: string; nome: string }[];
  onChange: (v: string) => void;
  larga?: boolean;
}) {
  const orfao = valor !== "" && !opcoes.some((o) => o.id === valor);
  return (
    <select
      className="dash-select"
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: "auto", maxWidth: larga ? 260 : 170, fontSize: "12.5px", padding: "8px 28px 8px 11px" }}
    >
      {opcoes.length === 0 && <option value="">— sem opção —</option>}
      {orfao && <option value={valor}>{valor} (não existe mais)</option>}
      {opcoes.map((o) => (
        <option key={o.id} value={o.id}>
          {o.nome}
        </option>
      ))}
    </select>
  );
}
