"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Orçamento quantitativo — a planilha da Amanda dentro do dashboard.

   Um painel por projeto: o resumo calculado no topo (o que na planilha era a
   aba "Resumo", digitada à mão) e um ambiente por sanfona, cada um com os
   quatro blocos da aba original.

   Tudo que é número aqui vem de `calcularProjeto`. O componente não soma nada
   por conta própria — se aparecer conta neste arquivo, é bug.
   ═════════════════════════════════════════════════════════════════════════ */

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { brl, calcularProjeto } from "@/lib/orcamento/calculo";
import {
  assinarCatalogo,
  lerCatalogo,
  lerCatalogoNoServidor,
  type Catalogo,
} from "@/lib/orcamento/catalogo";
import { totalFinal } from "@/lib/orcamento/derivar";
import { baixarXlsx } from "@/lib/orcamento/exportar";
import type { Briefing } from "@/lib/briefing/tipos";
import { coresPorFabricante, nomeCor, porOrdemAlfabetica } from "@/lib/orcamento/tabela";
import {
  ESPESSURAS,
  type AmbienteCalculado,
  type BlocoCalculado,
  type Espessura,
  type OrcamentoAmbiente,
} from "@/lib/orcamento/tipos";
import { AlvoDaSecao, useSecaoAberta } from "./SecaoDobravel";
import CampoNumero, { paraTexto } from "./CampoNumero";
import Proposta from "./Proposta";
import SugestaoBriefing from "./SugestaoBriefing";
import { MONO, NUM, colLabel, mono, panel } from "./ui";

/** "3.6" → "3,6×". Multiplicador com vírgula, como ela escreve. */
const vezes = (n: number) => String(n).replace(".", ",") + "×";

export default function Orcamento({
  ambientes,
  onChange,
  projeto,
  briefing,
  comArt,
  onComArt,
  onDuplicar,
}: {
  ambientes: OrcamentoAmbiente[];
  onChange: (a: OrcamentoAmbiente[]) => void;
  /** Cabeçalho da proposta e do arquivo exportado. */
  projeto: { nome: string; cliente: string; endereco: string };
  /** Briefing do cliente, quando o projeto veio de um lead que tem um. */
  briefing: Briefing | null;
  /** ART entra no total deste projeto. */
  comArt: boolean;
  onComArt: (v: boolean) => void;
  /**
   * Copia o ambiente com estas linhas junto.
   *
   * Vem de fora, e não é feito aqui com `onChange`, porque a regra do que
   * **não** se copia — etapa, prazos de fábrica, vínculo com o briefing — é do
   * projeto, não do orçamento. Duplicada aqui, ela sairia do passo com a de lá
   * na primeira vez que uma das duas mudasse.
   */
  onDuplicar: (ambienteId: string) => void;
}) {
  const aberta = useSecaoAberta("orcamento");
  const [abertos, setAbertos] = useState<string[]>([]);
  const [sugerindo, setSugerindo] = useState(false);
  // A tabela de valores mora fora do React (localStorage), como o perfil.
  const cat = useSyncExternalStore(assinarCatalogo, lerCatalogo, lerCatalogoNoServidor);
  const proj = calcularProjeto(ambientes, cat);
  // O motor calcula os dois; quem escolhe é o projeto. Um lugar só, porque
  // são muitos consumidores e um deles com o número errado é uma proposta
  // enviada 10% fora.
  const total = totalFinal(proj, comArt);
  // Quanto a ART acrescenta, para o interruptor dizer o que está em jogo.
  const valorDaArt = proj.totalComArt - proj.total;
  // Qual modo de impressão a proposta vai usar. Estado local: é escolha do
  // momento de imprimir, não coisa do projeto.
  const [modoImpressao, setModoImpressao] = useState<"cliente" | "interna">("cliente");
  /*
    Imprimir só depois que o modo estiver montado.

    `window.print()` logo após o `setState` imprimiria o modo anterior — e aqui
    isso significa mandar o quantitativo para o cliente, que é exatamente o que
    ela pediu para não acontecer. O efeito roda depois do commit, então o que o
    navegador captura é o que está na tela.
  */
  // Contador em vez de um sinalizador que o efeito desliga: cada clique é um
  // número novo, e o efeito não precisa mexer no estado para se rearmar.
  const [pedidoDeImpressao, setPedidoDeImpressao] = useState(0);
  useEffect(() => {
    if (pedidoDeImpressao === 0) return;
    window.print();
  }, [pedidoDeImpressao]);

  const imprimir = (modo: "cliente" | "interna") => {
    setModoImpressao(modo);
    setPedidoDeImpressao((n) => n + 1);
  };
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
      <div className="dash-orc-cabeca">
        <div style={{ minWidth: 0 }}>
          <AlvoDaSecao id="orcamento" titulo="Orçamento quantitativo" aberta={aberta} />
          <div style={{ fontFamily: MONO, fontSize: "11px", color: "#9A9689", marginTop: 5 }}>
            {aberta ? (
              <>
                chapas {vezes(cat.markups.chapas)} · fita {vezes(cat.markups.fita)} · acessórios{" "}
                {vezes(cat.markups.acessorios)} · ART +{Math.round((cat.markups.art - 1) * 100)}%
              </>
            ) : (
              // Fechado, o que importa é o total — não a régua de markups.
              <>
                {ambientes.length} {ambientes.length === 1 ? "ambiente" : "ambientes"} ·{" "}
                {brl(total)}
              </>
            )}
          </div>
        </div>
        <div className="dash-orc-acoes" hidden={!aberta}>
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
            onClick={() => baixarXlsx(projeto.nome, projeto.cliente, ambientes, cat, comArt)}
            disabled={vazio}
            style={{ borderRadius: 999, padding: "8px 15px", fontSize: "12.5px", opacity: vazio ? 0.45 : 1 }}
          >
            Exportar .xlsx
          </button>
          {/* Duas impressões, não uma. A do cliente não leva quantitativo —
              nas palavras dela, "quando envia para o cliente não se manda com
              quantitativo". A interna leva, que é o que ela confere. */}
          <button
            className="dash-btn-terra"
            onClick={() => imprimir("cliente")}
            disabled={vazio}
            style={{ borderRadius: 999, padding: "9px 16px", fontSize: "12.5px", opacity: vazio ? 0.45 : 1 }}
          >
            Proposta do cliente
          </button>
          <button
            className="dash-btn-outline"
            onClick={() => imprimir("interna")}
            disabled={vazio}
            style={{ borderRadius: 999, padding: "8px 15px", fontSize: "12.5px", opacity: vazio ? 0.45 : 1 }}
          >
            Com quantitativo
          </button>
        </div>
      </div>

      {aberta && (
        <>
      {/* ── ART ───────────────────────────────────────────────────────── */}
      {/* Nem todo trabalho leva ART, e antes ela entrava sempre. É do projeto
          inteiro, não por ambiente: quem assina a responsabilidade técnica
          assina o projeto todo. */}
      <label className="dash-orc-art">
        <input
          type="checkbox"
          checked={comArt}
          onChange={(e) => onComArt(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: "#A84B1C", flex: "none" }}
        />
        <span style={{ fontSize: "13.5px", fontWeight: 600 }}>Cobrar ART neste projeto</span>
        <span style={{ ...mono(11, "#9A9689"), ...NUM }}>
          {comArt ? "+" : ""}
          {brl(valorDaArt)}
          {comArt ? " no total" : " se marcar"}
        </span>
      </label>

      {/* ── totais do projeto ─────────────────────────────────────────── */}
      <div className="dash-orc-kpis">
        <Kpi rotulo="Custo" valor={brl(proj.custoTotal)} />
        <Kpi rotulo="Valor de venda" valor={brl(proj.total)} />
        <Kpi rotulo={comArt ? "Com ART" : "Sem ART"} valor={brl(total)} destaque />
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
              onDuplicar={() => onDuplicar(calc.id)}
              cat={cat}
              comArt={comArt}
            />
          );
        })}
        {!vazio && (
          <Proposta
            projeto={projeto}
            proj={proj}
            ambientes={ambientes}
            comArt={comArt}
            modo={modoImpressao}
          />
        )}
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
        </>
      )}
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
  onDuplicar,
  cat,
  comArt,
}: {
  bruto: OrcamentoAmbiente;
  calc: AmbienteCalculado;
  aberto: boolean;
  onAlternar: () => void;
  onEditar: (fn: (a: OrcamentoAmbiente) => OrcamentoAmbiente) => void;
  onRemover: () => void;
  onDuplicar: () => void;
  cat: Catalogo;
  /** ART do projeto: decide qual dos dois totais o cartão mostra. */
  comArt: boolean;
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
            {brl(totalFinal(calc, comArt))}
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
            grupos={coresPorFabricante(cat.cores).map(([f, cs]) => [
              f,
              cs.map((c) => ({ id: c.id, nome: c.nome })),
            ])}
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
            grupos={coresPorFabricante(cat.cores).map(([f, cs]) => [
              f,
              cs.map((c) => ({ id: c.id, nome: c.nome })),
            ])}
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
            itens={porOrdemAlfabetica(cat.acessorios).map((x) => ({ id: x.id, nome: x.nome }))}
            linhas={bruto.acessorios.map((l) => ({ itemId: l.acessorioId, qnt: l.qnt }))}
            detalhe={(i) => {
              const l = bruto.acessorios[i];
              const item = cat.acessorios.find((x) => x.id === l.acessorioId);
              return (
                <ValorDaLinha
                  custo={l.custo}
                  markup={l.markup}
                  custoPadrao={item?.custo ?? 0}
                  markupPadrao={item?.markup ?? cat.markups.acessorios}
                  onChange={(v) =>
                    onEditar((a) => ({
                      ...a,
                      acessorios: a.acessorios.map((x, k) => (k === i ? { ...x, ...v } : x)),
                    }))
                  }
                />
              );
            }}
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
            itens={porOrdemAlfabetica(cat.maoDeObra).map((x) => ({ id: x.id, nome: x.nome }))}
            linhas={bruto.maoDeObra.map((l) => ({ itemId: l.servicoId, qnt: l.qnt }))}
            detalhe={(i) => {
              const l = bruto.maoDeObra[i];
              const item = cat.maoDeObra.find((x) => x.id === l.servicoId);
              return (
                <ValorDaLinha
                  custo={l.custo}
                  markup={l.markup}
                  custoPadrao={item?.custo ?? 0}
                  markupPadrao={item?.markup ?? 1}
                  onChange={(v) =>
                    onEditar((a) => ({
                      ...a,
                      maoDeObra: a.maoDeObra.map((x, k) => (k === i ? { ...x, ...v } : x)),
                    }))
                  }
                />
              );
            }}
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
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <button
                className="dash-btn-link"
                onClick={onDuplicar}
                title="Cria uma cópia logo abaixo, com estas linhas junto"
                style={{ padding: "6px 0", fontSize: "12px" }}
              >
                Duplicar ambiente
              </button>
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
            </div>
            <div style={{ display: "flex", gap: 26, alignItems: "baseline" }}>
              <Fecho rotulo="Custo" valor={brl(calc.custoTotal)} />
              <Fecho rotulo="Venda" valor={brl(calc.total)} />
              <Fecho
                rotulo={comArt ? "Com ART" : "Total do ambiente"}
                valor={brl(totalFinal(calc, comArt))}
                destaque
              />
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
  grupos,
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
  /** Opções agrupadas, quando o grupo ajuda a achar (chapas por fabricante). */
  grupos?: [string, Opcao[]][];
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
        <div className="dash-orc-tabela">
          <div
            className="dash-orc-row"
            style={{ padding: "12px 0 8px", borderBottom: "1px solid #EDEAE2" }}
          >
            <div style={colLabel()}>Item</div>
            <div style={colLabel()}>Detalhe</div>
            <div style={colLabel()}>Qtd</div>
            <div style={colLabel("right")}>Unitário</div>
            <div style={colLabel("right")}>Custo</div>
            <div style={colLabel("right")}>Venda</div>
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
                  <Select
                    valor={l.itemId}
                    opcoes={itens}
                    grupos={grupos}
                    onChange={(v) => onItem(i, v)}
                  />
                  <div style={{ fontSize: "12px", color: "#8C887C" }}>
                    {detalhe ? detalhe(i) : c?.detalhe || c?.unidade}
                  </div>
                  <CampoNumero
                    valor={l.qnt || null}
                    placeholder="0"
                    onChange={(v) => onQnt(i, v ?? 0)}
                    aria-label="Quantidade"
                    style={{ width: "100%", textAlign: "right", ...NUM }}
                  />
                  <div style={{ fontSize: "12.5px", textAlign: "right", color: "#4A473F", ...NUM }}>
                    {c ? brl(c.custoUnitario) : "—"}
                  </div>
                  <div style={{ fontSize: "12.5px", textAlign: "right", color: "#4A473F", ...NUM }}>
                    {c ? brl(c.custo) : "—"}
                  </div>
                  {/* O resultado do markup, na própria linha. Sem ele o "× 3"
                      do detalhe era uma promessa que a linha nunca cumpria. */}
                  <div
                    style={{
                      fontSize: "12.5px",
                      textAlign: "right",
                      fontWeight: 600,
                      color: "#A84B1C",
                      ...NUM,
                    }}
                  >
                    {c ? brl(c.venda) : "—"}
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

/**
 * Custo e markup que valem só nesta linha, deste projeto.
 *
 * Nas palavras dela, a mão de obra "varia muito" — e o catálogo não consegue
 * ser a verdade de todas as obras. Aqui ela sobrescreve sem mexer na tabela,
 * que continua servindo de ponto de partida para o próximo orçamento.
 *
 * Campo vazio devolve `undefined`, não zero: vazio é "usa o do catálogo" e
 * zero é um custo digitado de propósito. Confundir os dois faria a linha
 * valer nada em vez de valer a tabela.
 */
function ValorDaLinha({
  custo,
  markup,
  custoPadrao,
  markupPadrao,
  onChange,
}: {
  custo?: number;
  markup?: number;
  custoPadrao: number;
  markupPadrao: number;
  onChange: (v: { custo?: number; markup?: number }) => void;
}) {
  const proprio = custo !== undefined || markup !== undefined;
  return (
    <div className="dash-orc-valor">
      <CampoNumero
        valor={custo ?? null}
        placeholder={paraTexto(custoPadrao) || "0"}
        onChange={(v) => onChange({ custo: v ?? undefined, markup })}
        aria-label="Custo desta linha"
        title="Custo só neste projeto. Vazio usa o da tabela de valores."
        style={{ width: 74, padding: "5px 8px", fontSize: "11.5px", borderRadius: 9, ...NUM }}
      />
      <span style={{ ...mono(10, "#B4AFA1") }}>×</span>
      <CampoNumero
        valor={markup ?? null}
        placeholder={paraTexto(markupPadrao) || "1"}
        onChange={(v) => onChange({ custo, markup: v ?? undefined })}
        aria-label="Markup desta linha"
        title="Multiplicador só neste projeto. Vazio usa o da tabela de valores."
        style={{ width: 50, padding: "5px 8px", fontSize: "11.5px", borderRadius: 9, ...NUM }}
      />
      {proprio && (
        <button
          className="dash-btn-link"
          onClick={() => onChange({ custo: undefined, markup: undefined })}
          title="Voltar ao valor da tabela de valores"
          style={{ fontSize: "10.5px", color: "#9A9689" }}
        >
          da tabela
        </button>
      )}
    </div>
  );
}

function Select({
  valor,
  opcoes,
  grupos,
  onChange,
}: {
  valor: string;
  opcoes: Opcao[];
  /**
   * Opções agrupadas, quando o grupo ajuda a achar — as chapas por
   * fabricante, que é como o fornecedor manda a tabela. Sem isto a lista
   * saía na ordem de cadastro, que não é ordem nenhuma para quem procura.
   */
  grupos?: [string, Opcao[]][];
  onChange: (v: string) => void;
}) {
  // Se o id não estiver mais no catálogo, ele vira uma opção própria para a
  // linha não trocar de item sozinha ao renderizar.
  const orfao = !opcoes.some((o) => o.id === valor);
  return (
    <select className="dash-select" value={valor} onChange={(e) => onChange(e.target.value)}>
      {orfao && <option value={valor}>{valor} (fora do catálogo)</option>}
      {grupos
        ? grupos.map(([titulo, itens]) => (
            <optgroup key={titulo} label={titulo}>
              {itens.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </optgroup>
          ))
        : opcoes.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome}
            </option>
          ))}
    </select>
  );
}
