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

import { AlvoDaSecao, useSecaoAberta } from "./SecaoDobravel";
import { useState, useSyncExternalStore } from "react";
import {
  apagarContrato,
  apagarParcela,
  apagarRecebimento,
  assinarContrato,
  assinarContratos,
  assinarParcelas,
  assinarRecebimentos,
  criarParcela,
  lerContratos,
  lerContratosNoServidor,
  lerParcelas,
  lerParcelasNoServidor,
  lerRecebimentos,
  lerRecebimentosNoServidor,
  registrarRecebimento,
  type Contrato,
  type Parcela,
  type Recebimento,
} from "@/lib/dados/contratos";
import {
  assinarRelogio,
  hojeISO,
  lerRelogio,
  lerRelogioNoServidor,
} from "@/lib/dados/relogio";
import { brl } from "@/lib/orcamento/calculo";
import CampoNumero from "./CampoNumero";
import { MONO, NUM, colLabel, mono, panel } from "./ui";

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

export default function ContratoPainel({
  projetoId,
  /** Total do orçamento com ART, quando há orçamento lançado. */
  valorSugerido,
}: {
  projetoId: string;
  valorSugerido: number;
}) {
  const contratos = useSyncExternalStore(assinarContratos, lerContratos, lerContratosNoServidor);
  const parcelas = useSyncExternalStore(assinarParcelas, lerParcelas, lerParcelasNoServidor);
  // As baixas, para ela poder desfazer uma lançada errada. Sem isso a parcela
  // ficaria "recebida" para sempre, sem caminho de volta.
  const recebimentos = useSyncExternalStore(
    assinarRecebimentos,
    lerRecebimentos,
    lerRecebimentosNoServidor,
  );
  const agora = useSyncExternalStore(assinarRelogio, lerRelogio, lerRelogioNoServidor);

  const aberta = useSecaoAberta("contrato");
  const contrato = contratos.find((c) => c.projetoId === projetoId) ?? null;

  return (
    <div style={{ ...panel, padding: "28px 30px", marginTop: 20 }}>
      <div className="dash-secao-topo">
        <AlvoDaSecao id="contrato" titulo="Contrato e recebimentos" aberta={aberta} />
        {/* O resumo continua visível com o bloco fechado: se falta assinar ou
            se falta entrada, ela precisa saber sem abrir. */}
        <div style={{ fontFamily: MONO, fontSize: "11px", color: "#9A9689" }}>
          {contrato
            ? "assinado em " + dataCurta(contrato.assinadoEm) + " · " + brl(contrato.recebido) + " recebido"
            : "sem contrato registrado"}
        </div>
      </div>

      {aberta &&
        (contrato ? (
          <Assinado
            contrato={contrato}
            parcelas={parcelas}
            recebimentos={recebimentos}
            hoje={hojeISO(agora)}
            valorSugerido={valorSugerido}
          />
        ) : (
          <PorAssinar projetoId={projetoId} valorSugerido={valorSugerido} />
        ))}
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
  parcelas,
  recebimentos,
  hoje,
  valorSugerido,
}: {
  contrato: Contrato;
  parcelas: Parcela[];
  recebimentos: Recebimento[];
  hoje: string;
  valorSugerido: number;
}) {
  const minhas = parcelas.filter((p) => p.contratoId === contrato.id);
  // O que ainda não foi posto em nenhuma parcela. Negativo quer dizer que o
  // plano passou do contrato — que é erro de digitação, não desconto.
  const aDistribuir = contrato.valor - minhas.reduce((t, p) => t + p.valor, 0);
  const vencida = (p: Parcela) => !p.quitada && p.venceEm < hoje;
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

      {/* ── o plano de pagamento ────────────────────────────────────────
          O parcelamento é combinado na assinatura, antes de qualquer dinheiro
          entrar. Antes só existia "registrar entrada", que criava a parcela e
          a baixa no mesmo gesto — e aí não havia como escrever o combinado. */}
      <div style={{ marginTop: 26, paddingTop: 22, borderTop: "1px solid #F0EDE5" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={colLabel()}>Plano de pagamento</div>
          <div style={{ ...mono(11, aDistribuir > 0.01 ? "#A84B1C" : "#9A9689"), ...NUM }}>
            {aDistribuir > 0.01
              ? "falta distribuir " + brl(aDistribuir)
              : aDistribuir < -0.01
                ? "as parcelas passam do contrato em " + brl(-aDistribuir)
                : "parcelas fecham com o contrato"}
          </div>
        </div>

        {minhas.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {minhas.map((p) => (
              <div key={p.id} className="dash-parcela">
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "13.5px", fontWeight: 600, ...NUM }}>
                    {p.numero}ª · {brl(p.valor)}
                  </div>
                  <div style={{ ...mono(11, vencida(p) ? "#9C2B22" : "#9A9689"), marginTop: 3 }}>
                    {p.quitada
                      ? "recebida"
                      : (vencida(p) ? "venceu em " : "vence em ") + dataCurta(p.venceEm)}
                    {!p.quitada && p.recebido > 0 ? " · " + brl(p.recebido) + " parcial" : ""}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  {!p.quitada && <BaixaRapida parcela={p} hoje={hoje} />}
                  <button
                    className="dash-btn-link"
                    onClick={() => void apagarParcela(p.id)}
                    style={{ fontSize: "12px", color: "#9C2B22" }}
                  >
                    Remover
                  </button>
                </div>

                {/* As baixas desta parcela, para desfazer a que foi lançada
                    errada. Desfazer devolve a parcela ao plano em vez de
                    apagá-la: o combinado com o cliente não mudou. */}
                {recebimentos
                  .filter((r) => r.parcelaId === p.id)
                  .map((r) => (
                    <div key={r.id} className="dash-parcela-baixa-feita">
                      <span style={mono(11, "#6B7040")}>
                        {brl(r.valor)} · {dataCurta(r.recebidoEm)}
                        {r.forma ? " · " + r.forma : ""}
                      </span>
                      <button
                        className="dash-btn-link"
                        onClick={() => void apagarRecebimento(r.id)}
                        style={{ fontSize: "11px", color: "#9A9689" }}
                      >
                        desfazer
                      </button>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        )}

        <NovaParcela
          contratoId={contrato.id}
          aDistribuir={aDistribuir}
          proximo={Math.max(0, ...minhas.map((p) => p.numero)) + 1}
          hoje={hoje}
        />
      </div>

      <div style={{ marginTop: 22 }}>
        <button
          className="dash-btn-link"
          onClick={() => void apagarContrato(contrato.id)}
          style={{ fontSize: "12.5px", color: "#9C2B22" }}
        >
          Desfazer contrato
        </button>
        <span style={{ ...mono(11, "#B4AFA1"), marginLeft: 10 }}>
          apaga o plano de pagamento e as baixas
        </span>
      </div>
    </>
  );
}

/**
 * Uma parcela nova no plano.
 *
 * O valor já vem sugerido com o que falta distribuir: o caso comum é fechar o
 * plano na assinatura, e digitar de novo um número que a tela acabou de
 * calcular é trabalho à toa.
 *
 * O número sai do maior já usado, não da contagem: remover a 1ª de três e
 * contar de novo daria 3, que já existe — e o banco tem
 * `unique (contrato_id, numero)`.
 */
function NovaParcela({
  contratoId,
  aDistribuir,
  proximo,
  hoje,
}: {
  contratoId: string;
  aDistribuir: number;
  proximo: number;
  hoje: string;
}) {
  const [valor, setValor] = useState<number | null>(null);
  const [data, setData] = useState(hoje);
  const [salvando, setSalvando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);

  const emUso = valor ?? (aDistribuir > 0.01 ? Math.round(aDistribuir * 100) / 100 : null);

  const salvar = async () => {
    setSalvando(true);
    const erro = await criarParcela({
      contratoId,
      numero: proximo,
      valor: emUso ?? 0,
      venceEm: data,
    });
    setSalvando(false);
    setFalha(erro);
    if (!erro) setValor(null);
  };

  return (
    <div style={{ marginTop: 18 }}>
      <div className="dash-parcela-form">
        <CampoNumero
          valor={emUso}
          onChange={setValor}
          placeholder="Valor da parcela"
          aria-label={"Valor da " + proximo + "ª parcela"}
          style={{ minWidth: 0, ...NUM }}
        />
        <input
          className="dash-field dash-field-sm"
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          aria-label={"Vencimento da " + proximo + "ª parcela"}
          style={{ minWidth: 0, ...NUM }}
        />
        <button
          className="dash-btn-outline"
          disabled={salvando || !emUso}
          onClick={() => void salvar()}
          style={{
            borderRadius: 999,
            padding: "10px 18px",
            fontSize: "12.5px",
            opacity: salvando || !emUso ? 0.45 : 1,
          }}
        >
          {salvando ? "Salvando…" : "+ Parcela"}
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

/**
 * A baixa de uma parcela, ali na linha dela.
 *
 * Abre só quando ela clica: a lista é para consultar o plano, e um formulário
 * aberto em toda parcela transformaria o painel numa parede de campos.
 *
 * O valor vem preenchido com o que falta na parcela, mas continua editável —
 * cliente paga a menos, paga em duas vezes, paga com desconto.
 */
function BaixaRapida({ parcela, hoje }: { parcela: Parcela; hoje: string }) {
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState<number | null>(null);
  const [data, setData] = useState(hoje);
  const [forma, setForma] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);

  const falta = Math.round((parcela.valor - parcela.recebido) * 100) / 100;
  const emUso = valor ?? falta;

  if (!aberto) {
    return (
      <button
        className="dash-btn-link"
        onClick={() => setAberto(true)}
        style={{ fontSize: "12px", color: "#6B7040" }}
      >
        Dar baixa
      </button>
    );
  }

  const salvar = async () => {
    setSalvando(true);
    const erro = await registrarRecebimento({
      parcelaId: parcela.id,
      valor: emUso,
      recebidoEm: data,
      forma,
    });
    setSalvando(false);
    setFalha(erro);
    if (!erro) setAberto(false);
  };

  return (
    <div className="dash-parcela-baixa">
      <CampoNumero
        valor={emUso}
        onChange={setValor}
        aria-label="Valor recebido"
        style={{ width: 110, ...NUM }}
      />
      <input
        className="dash-field dash-field-sm"
        type="date"
        value={data}
        onChange={(e) => setData(e.target.value)}
        aria-label="Data do recebimento"
        style={{ width: 140, ...NUM }}
      />
      <input
        className="dash-field dash-field-sm"
        placeholder="pix, boleto…"
        value={forma}
        onChange={(e) => setForma(e.target.value)}
        aria-label="Forma de pagamento"
        style={{ width: 120 }}
      />
      <button
        className="dash-btn-dark"
        disabled={salvando}
        onClick={() => void salvar()}
        style={{ borderRadius: 999, padding: "9px 16px", fontSize: "12px" }}
      >
        {salvando ? "…" : "Receber"}
      </button>
      <button
        className="dash-btn-link"
        onClick={() => setAberto(false)}
        style={{ fontSize: "12px", color: "#9A9689" }}
      >
        Cancelar
      </button>
      {falha && (
        <div role="alert" style={{ ...mono(11, "#9C2B22"), width: "100%" }}>
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
