"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Orçamento quantitativo — a planilha da Amanda dentro do dashboard.

   Um painel por projeto: o resumo calculado no topo (o que na planilha era a
   aba "Resumo", digitada à mão) e um ambiente por sanfona, cada um com os
   quatro blocos da aba original.

   Tudo que é número aqui vem de `calcularProjeto`. O componente não soma nada
   por conta própria — se aparecer conta neste arquivo, é bug.
   ═════════════════════════════════════════════════════════════════════════ */

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { brl, calcularProjeto } from "@/lib/orcamento/calculo";
import {
  assinarCatalogo,
  lerCatalogo,
  lerCatalogoNoServidor,
  type Catalogo,
} from "@/lib/orcamento/catalogo";
import { baixarXlsx } from "@/lib/orcamento/exportar";
import type { Briefing } from "@/lib/briefing/tipos";
import { nomeCor } from "@/lib/orcamento/tabela";
import {
  ESPESSURAS,
  type AmbienteCalculado,
  type BlocoCalculado,
  type Espessura,
  type OrcamentoAmbiente,
} from "@/lib/orcamento/tipos";
import Proposta from "./Proposta";
import SugestaoBriefing from "./SugestaoBriefing";
import { MONO, NUM, cardTitle, colLabel, mono, panel } from "./ui";

/** Aceita "12", "1,5" e "1.250,5" — o teclado brasileiro de quem preenche. */
const lerNumero = (s: string) => {
  const n = parseFloat(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const paraCampo = (n: number) => (n ? String(n).replace(".", ",") : "");

/** "3.6" → "3,6×". Multiplicador com vírgula, como ela escreve. */
const vezes = (n: number) => String(n).replace(".", ",") + "×";

export default function Orcamento({
  ambientes,
  onChange,
  projeto,
  briefing,
}: {
  ambientes: OrcamentoAmbiente[];
  onChange: (a: OrcamentoAmbiente[]) => void;
  /** Cabeçalho da proposta e do arquivo exportado. */
  projeto: { nome: string; cliente: string; endereco: string };
  /** Briefing do cliente, quando o projeto veio de um lead que tem um. */
  briefing: Briefing | null;
}) {
  const [abertos, setAbertos] = useState<string[]>([]);
  const [sugerindo, setSugerindo] = useState(false);
  // A tabela de valores mora fora do React (localStorage), como o perfil.
  const cat = useSyncExternalStore(assinarCatalogo, lerCatalogo, lerCatalogoNoServidor);
  const proj = calcularProjeto(ambientes, cat);
  // Sem nenhuma linha lançada não há o que exportar nem o que propor.
  const vazio = proj.total === 0;

  const alternar = (id: string) =>
    setAbertos((as) => (as.includes(id) ? as.filter((x) => x !== id) : [...as, id]));

  /** Troca um ambiente pelo resultado de `fn`, preservando o resto da lista. */
  const editar = (id: string, fn: (a: OrcamentoAmbiente) => OrcamentoAmbiente) =>
    onChange(ambientes.map((a) => (a.id === id ? fn(a) : a)));

  const addAmbiente = () => {
    const id = "amb" + Date.now();
    onChange([
      ...ambientes,
      { id, nome: "Novo ambiente", chapas: [], fita: [], acessorios: [], maoDeObra: [] },
    ]);
    setAbertos((as) => [...as, id]);
  };

  return (
    <div style={{ ...panel, padding: "28px 30px", marginTop: 20 }}>
      {/* ── cabeçalho ─────────────────────────────────────────────────── */}
      <div
        style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14 }}
      >
        <div>
          <div style={cardTitle}>Orçamento quantitativo</div>
          <div style={{ fontFamily: MONO, fontSize: "11px", color: "#9A9689", marginTop: 5 }}>
            chapas {vezes(cat.markups.chapas)} · fita {vezes(cat.markups.fita)} · acessórios{" "}
            {vezes(cat.markups.acessorios)} · ART +{Math.round((cat.markups.art - 1) * 100)}%
          </div>
        </div>
        <div className="dash-orc-acoes">
          <button
            className="dash-btn-outline"
            onClick={addAmbiente}
            style={{ borderRadius: 999, padding: "8px 15px", fontSize: "12.5px" }}
          >
            + Ambiente
          </button>
          {briefing && (
            <button
              className="dash-btn-outline"
              onClick={() => setSugerindo(true)}
              style={{ borderRadius: 999, padding: "8px 15px", fontSize: "12.5px" }}
            >
              Sugerir do briefing
            </button>
          )}
          <button
            className="dash-btn-outline"
            onClick={() => baixarXlsx(projeto.nome, projeto.cliente, ambientes, cat)}
            disabled={vazio}
            style={{ borderRadius: 999, padding: "8px 15px", fontSize: "12.5px", opacity: vazio ? 0.45 : 1 }}
          >
            Exportar .xlsx
          </button>
          <button
            className="dash-btn-terra"
            onClick={() => window.print()}
            disabled={vazio}
            style={{ borderRadius: 999, padding: "9px 16px", fontSize: "12.5px", opacity: vazio ? 0.45 : 1 }}
          >
            Imprimir proposta
          </button>
        </div>
      </div>

      {/* ── totais do projeto ─────────────────────────────────────────── */}
      <div className="dash-orc-kpis">
        <Kpi rotulo="Custo" valor={brl(proj.custoTotal)} />
        <Kpi rotulo="Valor de venda" valor={brl(proj.total)} />
        <Kpi rotulo="Com ART" valor={brl(proj.totalComArt)} destaque />
        <Kpi
          rotulo="Pendências"
          valor={proj.alertas === 0 ? "nenhuma" : String(proj.alertas)}
          cor={proj.alertas ? "#9C2B22" : "#6B7040"}
        />
      </div>

      {/* ── um ambiente por sanfona ───────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 22 }}>
        {proj.ambientes.map((calc) => {
          const bruto = ambientes.find((a) => a.id === calc.id);
          if (!bruto) return null;
          return (
            <AmbienteCartao
              key={calc.id}
              bruto={bruto}
              calc={calc}
              aberto={abertos.includes(calc.id)}
              onAlternar={() => alternar(calc.id)}
              onEditar={(fn) => editar(calc.id, fn)}
              onRemover={() => onChange(ambientes.filter((a) => a.id !== calc.id))}
              cat={cat}
            />
          );
        })}
        {!vazio && <Proposta projeto={projeto} proj={proj} />}
        {sugerindo && briefing && (
          <SugestaoBriefing
            briefing={briefing}
            ambientes={ambientes}
            cat={cat}
            onAplicar={onChange}
            onClose={() => setSugerindo(false)}
          />
        )}
        {ambientes.length === 0 && (
          <div
            style={{
              border: "1px dashed #DDD9CE",
              borderRadius: 18,
              padding: "26px 22px",
              textAlign: "center",
              fontSize: "13px",
              color: "#8C887C",
            }}
          >
            Nenhum ambiente orçado ainda. Comece adicionando um.
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({
  rotulo,
  valor,
  destaque,
  cor,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
  cor?: string;
}) {
  return (
    <div>
      <div style={mono(10, "#9A9689", { ls: "0.07em", upper: true })}>{rotulo}</div>
      <div
        style={{
          fontSize: destaque ? "22px" : "18px",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          marginTop: 6,
          color: cor ?? (destaque ? "#A84B1C" : "#23231F"),
          ...NUM,
        }}
      >
        {valor}
      </div>
    </div>
  );
}

/* ── um ambiente ──────────────────────────────────────────────────────── */

function AmbienteCartao({
  bruto,
  calc,
  aberto,
  onAlternar,
  onEditar,
  onRemover,
  cat,
}: {
  bruto: OrcamentoAmbiente;
  calc: AmbienteCalculado;
  aberto: boolean;
  onAlternar: () => void;
  onEditar: (fn: (a: OrcamentoAmbiente) => OrcamentoAmbiente) => void;
  onRemover: () => void;
  cat: Catalogo;
}) {
  const alertas = calc.alertas.length;

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,.9)",
        background: "rgba(255,255,255,.5)",
        borderRadius: 20,
        overflow: "hidden",
      }}
    >
      {/* linha-resumo, sempre visível */}
      <div className="dash-orc-head">
        <button
          className="dash-btn-step"
          onClick={onAlternar}
          aria-expanded={aberto}
          aria-label={aberto ? "Recolher ambiente" : "Abrir ambiente"}
          style={{
            borderRadius: 999,
            width: 26,
            height: 26,
            fontSize: "12px",
            lineHeight: 1,
            flex: "none",
          }}
        >
          {aberto ? "−" : "+"}
        </button>
        <input
          className="dash-inline"
          value={bruto.nome}
          onChange={(e) => onEditar((a) => ({ ...a, nome: e.target.value }))}
          style={{
            fontSize: "14.5px",
            fontWeight: 600,
            letterSpacing: "-0.01em",
            flex: 1,
            minWidth: 0,
          }}
        />
        {alertas > 0 && (
          <span
            style={{
              fontFamily: MONO,
              fontSize: "10.5px",
              color: "#9C2B22",
              background: "#FAEAE7",
              border: "1px solid #F1D6D1",
              borderRadius: 999,
              padding: "3px 9px",
              flex: "none",
            }}
          >
            {alertas} {alertas === 1 ? "pendência" : "pendências"}
          </span>
        )}
        <div style={{ textAlign: "right", flex: "none" }}>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#A84B1C", ...NUM }}>
            {brl(calc.totalComArt)}
          </div>
          <div style={{ fontFamily: MONO, fontSize: "10px", color: "#9A9689", ...NUM }}>
            {brl(calc.total)} sem ART
          </div>
        </div>
      </div>

      {aberto && (
        <div style={{ padding: "4px 20px 20px" }}>
          <Bloco
            calc={calc.blocos.chapas}
            itens={cat.cores.map((c) => ({ id: c.id, nome: nomeCor(c) }))}
            linhas={bruto.chapas.map((l) => ({ itemId: l.corId, qnt: l.qnt }))}
            detalhe={(i) => (
              <Select
                valor={String(bruto.chapas[i].espessura)}
                opcoes={ESPESSURAS.map((e) => ({ id: String(e), nome: e + " mm" }))}
                onChange={(v) =>
                  onEditar((a) => ({
                    ...a,
                    chapas: a.chapas.map((l, k) =>
                      k === i ? { ...l, espessura: Number(v) as Espessura } : l,
                    ),
                  }))
                }
              />
            )}
            onItem={(i, v) =>
              onEditar((a) => ({
                ...a,
                chapas: a.chapas.map((l, k) => (k === i ? { ...l, corId: v } : l)),
              }))
            }
            onQnt={(i, v) =>
              onEditar((a) => ({
                ...a,
                chapas: a.chapas.map((l, k) => (k === i ? { ...l, qnt: v } : l)),
              }))
            }
            onRemover={(i) =>
              onEditar((a) => ({ ...a, chapas: a.chapas.filter((_, k) => k !== i) }))
            }
            onAdicionar={() =>
              onEditar((a) => ({
                ...a,
                chapas: [...a.chapas, { corId: cat.cores[0].id, espessura: 18, qnt: 0 }],
              }))
            }
            alertas={calc.alertas.filter((x) => x.bloco === "chapas")}
          />

          <Bloco
            calc={calc.blocos.fita}
            itens={cat.cores.map((c) => ({ id: c.id, nome: nomeCor(c) }))}
            linhas={bruto.fita.map((l) => ({ itemId: l.corId, qnt: l.metros }))}
            onItem={(i, v) =>
              onEditar((a) => ({
                ...a,
                fita: a.fita.map((l, k) => (k === i ? { ...l, corId: v } : l)),
              }))
            }
            onQnt={(i, v) =>
              onEditar((a) => ({
                ...a,
                fita: a.fita.map((l, k) => (k === i ? { ...l, metros: v } : l)),
              }))
            }
            onRemover={(i) => onEditar((a) => ({ ...a, fita: a.fita.filter((_, k) => k !== i) }))}
            onAdicionar={() =>
              onEditar((a) => ({ ...a, fita: [...a.fita, { corId: cat.cores[0].id, metros: 0 }] }))
            }
            alertas={calc.alertas.filter((x) => x.bloco === "fita")}
          />

          <Bloco
            calc={calc.blocos.acessorios}
            itens={cat.acessorios.map((x) => ({ id: x.id, nome: x.nome }))}
            linhas={bruto.acessorios.map((l) => ({ itemId: l.acessorioId, qnt: l.qnt }))}
            onItem={(i, v) =>
              onEditar((a) => ({
                ...a,
                acessorios: a.acessorios.map((l, k) => (k === i ? { ...l, acessorioId: v } : l)),
              }))
            }
            onQnt={(i, v) =>
              onEditar((a) => ({
                ...a,
                acessorios: a.acessorios.map((l, k) => (k === i ? { ...l, qnt: v } : l)),
              }))
            }
            onRemover={(i) =>
              onEditar((a) => ({ ...a, acessorios: a.acessorios.filter((_, k) => k !== i) }))
            }
            onAdicionar={() =>
              onEditar((a) => ({
                ...a,
                acessorios: [...a.acessorios, { acessorioId: cat.acessorios[0].id, qnt: 0 }],
              }))
            }
            alertas={calc.alertas.filter((x) => x.bloco === "acessorios")}
          />

          <Bloco
            calc={calc.blocos.maoDeObra}
            itens={cat.maoDeObra.map((x) => ({ id: x.id, nome: x.nome }))}
            linhas={bruto.maoDeObra.map((l) => ({ itemId: l.servicoId, qnt: l.qnt }))}
            onItem={(i, v) =>
              onEditar((a) => ({
                ...a,
                maoDeObra: a.maoDeObra.map((l, k) => (k === i ? { ...l, servicoId: v } : l)),
              }))
            }
            onQnt={(i, v) =>
              onEditar((a) => ({
                ...a,
                maoDeObra: a.maoDeObra.map((l, k) => (k === i ? { ...l, qnt: v } : l)),
              }))
            }
            onRemover={(i) =>
              onEditar((a) => ({ ...a, maoDeObra: a.maoDeObra.filter((_, k) => k !== i) }))
            }
            onAdicionar={() =>
              onEditar((a) => ({
                ...a,
                maoDeObra: [...a.maoDeObra, { servicoId: cat.maoDeObra[0].id, qnt: 0 }],
              }))
            }
            alertas={calc.alertas.filter((x) => x.bloco === "maoDeObra")}
          />

          {/* fecho do ambiente */}
          <div className="dash-orc-fecho">
            <button
              className="dash-btn-link"
              onClick={onRemover}
              style={{
                padding: "6px 0",
                fontSize: "12px",
                color: "#9C2B22",
              }}
            >
              Remover ambiente
            </button>
            <div style={{ display: "flex", gap: 26, alignItems: "baseline" }}>
              <Fecho rotulo="Custo" valor={brl(calc.custoTotal)} />
              <Fecho rotulo="Venda" valor={brl(calc.total)} />
              <Fecho rotulo="Com ART" valor={brl(calc.totalComArt)} destaque />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Fecho({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div style={{ textAlign: "right" }}>
      <div style={mono(9.5, "#9A9689", { ls: "0.07em", upper: true })}>{rotulo}</div>
      <div
        style={{
          fontSize: destaque ? "17px" : "14px",
          fontWeight: 600,
          marginTop: 4,
          color: destaque ? "#A84B1C" : "#23231F",
          ...NUM,
        }}
      >
        {valor}
      </div>
    </div>
  );
}

/* ── um bloco (chapas, fita, acessórios ou mão de obra) ───────────────── */

type Opcao = { id: string; nome: string };

function Bloco({
  calc,
  itens,
  linhas,
  detalhe,
  onItem,
  onQnt,
  onRemover,
  onAdicionar,
  alertas,
}: {
  calc: BlocoCalculado;
  itens: Opcao[];
  linhas: { itemId: string; qnt: number }[];
  detalhe?: (i: number) => ReactNode;
  onItem: (i: number, v: string) => void;
  onQnt: (i: number, v: number) => void;
  onRemover: (i: number) => void;
  onAdicionar: () => void;
  alertas: { linha: number; texto: string }[];
}) {
  const porLinha = new Map(alertas.map((a) => [a.linha, a.texto]));

  return (
    <div style={{ marginTop: 20 }}>
      <div
        style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}
      >
        <div style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "-0.01em" }}>
          {calc.titulo}
        </div>
        <div style={{ fontFamily: MONO, fontSize: "10.5px", color: "#9A9689", ...NUM }}>
          custo {brl(calc.custo)} → venda {brl(calc.venda)}{" "}
          <span style={{ color: "#B4AFA1" }}>
            ({calc.markup ? vezes(calc.markup) : "markup por item"})
          </span>
        </div>
      </div>

      <div className="dash-scroll-x">
        <div>
          <div
            className="dash-orc-row"
            style={{ padding: "12px 0 8px", borderBottom: "1px solid #EDEAE2" }}
          >
            <div style={colLabel()}>Item</div>
            <div style={colLabel()}>Detalhe</div>
            <div style={colLabel()}>Qtd</div>
            <div style={colLabel("right")}>Unitário</div>
            <div style={colLabel("right")}>Custo</div>
            <div />
          </div>

          {linhas.map((l, i) => {
            const c = calc.linhas[i];
            const alerta = porLinha.get(i);
            return (
              <div key={i}>
                <div
                  className="dash-orc-row"
                  style={{ padding: "9px 0", borderBottom: alerta ? "none" : "1px solid #F4F1EA" }}
                >
                  <Select valor={l.itemId} opcoes={itens} onChange={(v) => onItem(i, v)} />
                  <div style={{ fontSize: "12px", color: "#8C887C" }}>
                    {detalhe ? detalhe(i) : c?.detalhe || c?.unidade}
                  </div>
                  <input
                    className="dash-field dash-field-sm"
                    inputMode="decimal"
                    value={paraCampo(l.qnt)}
                    placeholder="0"
                    onChange={(e) => onQnt(i, lerNumero(e.target.value))}
                    style={{ width: "100%", textAlign: "right", ...NUM }}
                  />
                  <div style={{ fontSize: "12.5px", textAlign: "right", color: "#4A473F", ...NUM }}>
                    {c ? brl(c.custoUnitario) : "—"}
                  </div>
                  <div style={{ fontSize: "12.5px", textAlign: "right", fontWeight: 600, ...NUM }}>
                    {c ? brl(c.custo) : "—"}
                  </div>
                  <button
                    className="dash-btn-step"
                    onClick={() => onRemover(i)}
                    aria-label={"Remover " + (c?.nome ?? "linha")}
                    style={{
                      borderRadius: 999,
                      width: 24,
                      height: 24,
                      fontSize: "12px",
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
                {alerta && (
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: "10.5px",
                      color: "#9C2B22",
                      padding: "0 0 9px",
                      borderBottom: "1px solid #F4F1EA",
                    }}
                  >
                    {alerta}
                  </div>
                )}
              </div>
            );
          })}

          {linhas.length === 0 && (
            <div
              style={{
                fontSize: "12px",
                color: "#A8A498",
                padding: "12px 0",
                borderBottom: "1px solid #F4F1EA",
              }}
            >
              sem lançamentos
            </div>
          )}
        </div>
      </div>

      <button
        className="dash-btn-link"
        onClick={onAdicionar}
        style={{ padding: "9px 0", fontSize: "12.5px", color: "#A84B1C" }}
      >
        + linha
      </button>
    </div>
  );
}

function Select({
  valor,
  opcoes,
  onChange,
}: {
  valor: string;
  opcoes: Opcao[];
  onChange: (v: string) => void;
}) {
  // Se o id não estiver mais no catálogo, ele vira uma opção própria para a
  // linha não trocar de item sozinha ao renderizar.
  const orfao = !opcoes.some((o) => o.id === valor);
  return (
    <select className="dash-select" value={valor} onChange={(e) => onChange(e.target.value)}>
      {orfao && <option value={valor}>{valor} (fora do catálogo)</option>}
      {opcoes.map((o) => (
        <option key={o.id} value={o.id}>
          {o.nome}
        </option>
      ))}
    </select>
  );
}
