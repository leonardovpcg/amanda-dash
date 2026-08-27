"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Contrato e recebimentos do projeto.

   É o evento que separa proposta de venda. Enquanto não existia, "Faturado"
   mostrava R$ 0 em todo projeto e a meta do mês não tinha o que contar.

   O valor é congelado na assinatura de propósito. Reajustar a tabela de
   valores depois muda o orçamento aberto — não pode mudar o que já foi
   assinado. Por isso o painel mostra os dois quando eles discordam, em vez de
   escolher um: a diferença é informação, não erro.

   Cada entrada cria a parcela junto. Ela recebe um sinal e depois o resto,
   sem plano de parcelamento montado antes; exigir a parcela cadastrada
   primeiro seria burocracia que ninguém cumpre.
   ═════════════════════════════════════════════════════════════════════════ */

import { useState, useSyncExternalStore } from "react";
import {
  apagarContrato,
  apagarRecebimento,
  assinarContrato,
  assinarContratos,
  assinarRecebimentos,
  lerContratos,
  lerContratosNoServidor,
  lerRecebimentos,
  lerRecebimentosNoServidor,
  registrarRecebimento,
  type Contrato,
} from "@/lib/dados/contratos";
import { lerRelogio } from "@/lib/dados/relogio";
import { brl } from "@/lib/orcamento/calculo";
import { MONO, NUM, cardTitle, colLabel, mono, panel } from "./ui";

/** Aceita "84000", "84.000" e "84.000,00". */
function lerValor(s: string): number | null {
  const n = parseFloat(s.replace(/[^0-9,.]/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** "2026-08-27" → "27 ago 2026". */
const MES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
function dataCurta(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d} ${MES_CURTO[Number(m) - 1] ?? ""} ${a}`;
}

/** Hoje no formato do `<input type="date">`, para o campo já vir preenchido. */
function hojeISO(): string {
  const d = lerRelogio() ?? new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default function ContratoPainel({
  projetoId,
  /** Total do orçamento com ART, quando há orçamento lançado. */
  valorSugerido,
}: {
  projetoId: string;
  valorSugerido: number;
}) {
  const contratos = useSyncExternalStore(assinarContratos, lerContratos, lerContratosNoServidor);
  const recebimentos = useSyncExternalStore(
    assinarRecebimentos,
    lerRecebimentos,
    lerRecebimentosNoServidor,
  );

  const contrato = contratos.find((c) => c.projetoId === projetoId) ?? null;
  const entradas = contrato ? recebimentos.filter((r) => r.contratoId === contrato.id) : [];

  return (
    <div style={{ ...panel, padding: "28px 30px", marginTop: 20 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div style={cardTitle}>Contrato e recebimentos</div>
        {contrato && (
          <div style={{ fontFamily: MONO, fontSize: "11px", color: "#9A9689" }}>
            assinado em {dataCurta(contrato.assinadoEm)}
          </div>
        )}
      </div>

      {contrato ? (
        <Assinado contrato={contrato} entradas={entradas} valorSugerido={valorSugerido} />
      ) : (
        <PorAssinar projetoId={projetoId} valorSugerido={valorSugerido} />
      )}
    </div>
  );
}

/* ── ainda não assinado ──────────────────────────────────────────────────── */

function PorAssinar({
  projetoId,
  valorSugerido,
}: {
  projetoId: string;
  valorSugerido: number;
}) {
  const [aberto, setAberto] = useState(false);
  // O valor do orçamento vem preenchido, mas editável: desconto fechado na
  // mesa é a regra, não a exceção.
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hojeISO());
  const [condicoes, setCondicoes] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);

  const campo = valor || (valorSugerido > 0 ? String(Math.round(valorSugerido)) : "");

  const fechar = async () => {
    const v = lerValor(campo);
    if (v === null) {
      setFalha("Informe o valor fechado com o cliente.");
      return;
    }
    setSalvando(true);
    const erro = await assinarContrato({
      projetoId,
      valor: v,
      assinadoEm: data,
      condicoes,
    });
    setSalvando(false);
    setFalha(erro);
    if (!erro) setAberto(false);
  };

  if (!aberto) {
    return (
      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: "13px", color: "#6E6A5F" }}>
          {valorSugerido > 0
            ? `Sem contrato registrado. O orçamento fechou em ${brl(valorSugerido)} com ART.`
            : "Sem contrato registrado. Lance o orçamento acima ou informe o valor fechado."}
        </div>
        <button
          className="dash-btn-dark"
          onClick={() => setAberto(true)}
          style={{ marginTop: 16, borderRadius: 999, padding: "11px 20px", fontSize: "12.5px" }}
        >
          Registrar contrato assinado
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div className="dash-contrato-form">
        <label style={{ display: "block", minWidth: 0 }}>
          <span style={colLabel()}>Valor fechado</span>
          <input
            className="dash-field"
            inputMode="numeric"
            autoFocus
            value={campo}
            onChange={(e) => setValor(e.target.value)}
            style={{ width: "100%", marginTop: 6, ...NUM }}
          />
        </label>
        <label style={{ display: "block", minWidth: 0 }}>
          <span style={colLabel()}>Assinado em</span>
          <input
            className="dash-field"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            style={{ width: "100%", marginTop: 6, ...NUM }}
          />
        </label>
        <label style={{ display: "block", minWidth: 0, gridColumn: "1 / -1" }}>
          <span style={colLabel()}>Condições (opcional)</span>
          <input
            className="dash-field"
            placeholder="30% de entrada, saldo em 4× na entrega"
            value={condicoes}
            onChange={(e) => setCondicoes(e.target.value)}
            style={{ width: "100%", marginTop: 6 }}
          />
        </label>
      </div>

      <div style={{ fontSize: "12.5px", color: "#8C887C", marginTop: 14 }}>
        Este valor fica congelado. Reajuste de tabela depois não muda contrato assinado.
      </div>

      {falha && (
        <div role="alert" style={{ ...mono(11, "#9C2B22"), marginTop: 12 }}>
          {falha}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
        <button
          className="dash-btn-dark"
          disabled={salvando}
          onClick={() => void fechar()}
          style={{ borderRadius: 999, padding: "11px 22px", fontSize: "12.5px" }}
        >
          {salvando ? "Salvando…" : "Confirmar assinatura"}
        </button>
        <button
          className="dash-btn-link"
          onClick={() => setAberto(false)}
          style={{ fontSize: "12.5px", color: "#6E6A5F" }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

/* ── já assinado ─────────────────────────────────────────────────────────── */

function Assinado({
  contrato,
  entradas,
  valorSugerido,
}: {
  contrato: Contrato;
  entradas: { id: string; parcelaId: string; numero: number; valor: number; recebidoEm: string; forma: string }[];
  valorSugerido: number;
}) {
  const saldo = contrato.valor - contrato.recebido;
  const pct = contrato.valor > 0 ? Math.min(100, Math.round((contrato.recebido / contrato.valor) * 100)) : 0;
  // Um real de diferença é arredondamento de centavo, não reajuste.
  const divergente = valorSugerido > 0 && Math.abs(valorSugerido - contrato.valor) >= 1;

  return (
    <>
      <div style={{ display: "flex", gap: 30, flexWrap: "wrap", marginTop: 20 }}>
        <Numero rotulo="contrato" valor={brl(contrato.valor)} />
        <Numero rotulo="recebido" valor={brl(contrato.recebido)} cor="#6B7040" />
        <Numero rotulo="saldo" valor={brl(saldo)} cor={saldo > 0 ? "#A84B1C" : "#6B7040"} />
        <Numero
          rotulo={`comissão · ${(contrato.taxa * 100).toLocaleString("pt-BR")}%`}
          valor={brl(contrato.comissao)}
        />
      </div>

      <div
        style={{
          height: 10,
          borderRadius: 999,
          background: "#EDEAE2",
          overflow: "hidden",
          marginTop: 20,
          maxWidth: 460,
        }}
      >
        <div
          style={{
            height: "100%",
            width: pct + "%",
            borderRadius: 999,
            background: pct >= 100 ? "#6B7040" : "#A84B1C",
          }}
        />
      </div>

      {contrato.condicoes && (
        <div style={{ fontSize: "13px", color: "#6E6A5F", marginTop: 14 }}>{contrato.condicoes}</div>
      )}

      {divergente && (
        <div style={{ ...mono(11, "#A84B1C"), marginTop: 14, lineHeight: 1.6 }}>
          O orçamento hoje soma {brl(valorSugerido)}. O contrato vale o que foi assinado.
        </div>
      )}

      {/* O número sai do maior já usado, não da contagem: remover a 1ª de três
          entradas e contar de novo daria 3, que já existe — e o banco tem
          `unique (contrato_id, numero)`. */}
      <NovaEntrada
        contratoId={contrato.id}
        saldo={saldo}
        proximo={Math.max(0, ...entradas.map((r) => r.numero)) + 1}
      />

      {entradas.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={colLabel()}>Entradas</div>
          <div style={{ marginTop: 10 }}>
            {entradas.map((r) => (
              <div key={r.id} className="dash-meta-item">
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "13.5px", fontWeight: 600, ...NUM }}>{brl(r.valor)}</div>
                  <div style={{ ...mono(11, "#9A9689"), marginTop: 3 }}>
                    {dataCurta(r.recebidoEm)}
                    {r.forma ? ` · ${r.forma}` : ""}
                  </div>
                </div>
                <button
                  className="dash-btn-link"
                  onClick={() => void apagarRecebimento(r.id, r.parcelaId)}
                  style={{ fontSize: "12.5px", color: "#9C2B22" }}
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 22 }}>
        <button
          className="dash-btn-link"
          onClick={() => void apagarContrato(contrato.id)}
          style={{ fontSize: "12.5px", color: "#9C2B22" }}
        >
          Desfazer contrato
        </button>
        <span style={{ ...mono(11, "#B4AFA1"), marginLeft: 10 }}>
          apaga também as entradas registradas
        </span>
      </div>
    </>
  );
}

function NovaEntrada({
  contratoId,
  saldo,
  proximo,
}: {
  contratoId: string;
  saldo: number;
  proximo: number;
}) {
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hojeISO());
  const [forma, setForma] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);

  const registrar = async () => {
    const v = lerValor(valor);
    if (v === null) {
      setFalha("Informe o valor recebido.");
      return;
    }
    setSalvando(true);
    const erro = await registrarRecebimento({
      contratoId,
      valor: v,
      recebidoEm: data,
      forma,
      numeroDaParcela: proximo,
    });
    setSalvando(false);
    setFalha(erro);
    if (!erro) {
      setValor("");
      setForma("");
    }
  };

  return (
    <div style={{ marginTop: 26, paddingTop: 22, borderTop: "1px solid #F0EDE5" }}>
      <div style={colLabel()}>Registrar entrada</div>
      <div className="dash-receb-form">
        <input
          className="dash-field dash-field-sm"
          inputMode="numeric"
          placeholder={saldo > 0 ? `Valor · saldo ${brl(saldo)}` : "Valor"}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void registrar();
          }}
          style={{ minWidth: 0, ...NUM }}
        />
        <input
          className="dash-field dash-field-sm"
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          style={{ minWidth: 0, ...NUM }}
        />
        <input
          className="dash-field dash-field-sm"
          placeholder="Forma (pix, boleto…)"
          value={forma}
          onChange={(e) => setForma(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void registrar();
          }}
          style={{ minWidth: 0 }}
        />
        <button
          className="dash-btn-outline"
          disabled={salvando}
          onClick={() => void registrar()}
          style={{ borderRadius: 999, padding: "10px 18px", fontSize: "12.5px", whiteSpace: "nowrap" }}
        >
          {salvando ? "Salvando…" : "Registrar"}
        </button>
      </div>
      {falha && (
        <div role="alert" style={{ ...mono(11, "#9C2B22"), marginTop: 10 }}>
          {falha}
        </div>
      )}
    </div>
  );
}

function Numero({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div>
      <div style={colLabel()}>{rotulo}</div>
      <div
        style={{
          fontSize: "20px",
          fontWeight: 600,
          marginTop: 5,
          letterSpacing: "-0.02em",
          ...NUM,
          ...(cor ? { color: cor } : null),
        }}
      >
        {valor}
      </div>
    </div>
  );
}
