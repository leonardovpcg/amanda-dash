"use client";

import { useState, useSyncExternalStore } from "react";
import {
  assinarParcelas,
  lerParcelas,
  lerParcelasNoServidor,
  lerStatusParcelas,
  lerStatusParcelasNoServidor,
  registrarRecebimento,
  type Parcela,
} from "@/lib/dados/contratos";
import {
  assinarRelogio,
  hojeISO,
  lerRelogio,
  lerRelogioNoServidor,
} from "@/lib/dados/relogio";
import { money } from "@/lib/dashboard/data";
import type { ProjectVM } from "./DashboardArquitetura";
import CampoNumero from "./CampoNumero";
import { MONO, NUM, cardTitle, mono, panel } from "./ui";

const MES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
/** "2026-09-18" → "18 set". */
const dataCurta = (iso: string) => {
  const [, m, d] = iso.split("-");
  return Number(d) + " " + (MES_CURTO[Number(m) - 1] ?? "");
};

export default function Financeiro({ projects }: { projects: ProjectVM[] }) {
  const agora = useSyncExternalStore(assinarRelogio, lerRelogio, lerRelogioNoServidor);
  /*
    Os três totais.

    Só entra projeto com contrato assinado. Somar proposta aberta aqui daria
    um "total contratado" que a loja não tem — e era exatamente o que os
    R$ 1,84 mi fixos do design faziam.
  */
  const comContrato = projects.filter((p) => p.contratoAssinado !== undefined);
  const contratado = comContrato.reduce((t, p) => t + p.contrato, 0);
  const faturado = comContrato.reduce((t, p) => t + p.spent, 0);
  const totais: [string, string, string | undefined][] = [
    ["Total contratado", money(contratado), undefined],
    ["Total faturado", money(faturado), "#A84B1C"],
    ["A faturar", money(contratado - faturado), undefined],
  ];

  return (
    <div className="dash-tabpad" style={{ maxWidth: 1440 }}>
      <div className="dash-grid-3">
        {totais.map(([label, value, color]) => (
          <div key={label} style={{ ...panel, padding: "26px 28px" }}>
            <div style={mono(11, "#8C887C", { ls: "0.08em", upper: true })}>{label}</div>
            <div
              style={{
                fontSize: "clamp(28px, 6.5vw, 40px)",
                fontWeight: 600,
                letterSpacing: "-0.035em",
                marginTop: 12,
                ...NUM,
                ...(color ? { color } : null),
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      <AReceber hoje={hojeISO(agora)} />

      <div style={{ ...panel, padding: "30px 32px", marginTop: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div style={cardTitle}>Contratado vs. recebido por projeto</div>
          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
            {[
              ["#A84B1C", "Recebido"],
              ["#F0EDE5", "Contratado"],
            ].map(([c, label]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: c }} />
                <span style={{ fontSize: "12px", color: "#6E6A5F" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 26, marginTop: 30 }}>
          {comContrato.length === 0 && (
            <div style={{ fontSize: "13px", color: "#6E6A5F" }}>
              Nenhum contrato assinado ainda. A barra aparece quando o contrato do projeto for
              registrado.
            </div>
          )}
          {comContrato.map((p) => (
            <div key={p.id}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 20,
                }}
              >
                <div style={{ fontSize: "14px", fontWeight: 600, letterSpacing: "-0.01em" }}>
                  {p.name}
                </div>
                <div style={{ fontSize: "13px", color: "#6E6A5F", ...NUM }}>
                  {p.spentLabel} de {p.budgetLabel} ·{" "}
                  <span style={{ color: p.pctColor, fontWeight: 600 }}>{p.pct}%</span>
                </div>
              </div>
              <div
                style={{
                  height: 14,
                  borderRadius: 999,
                  background: "#F0EDE5",
                  marginTop: 10,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: 999,
                    background: p.pctColor,
                    width: p.pct + "%",
                  }}
                />
              </div>
              <div style={{ fontFamily: MONO, fontSize: "11px", color: "#9A9689", marginTop: 7 }}>
                {p.client} · saldo {p.saldoLabel}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Tudo que está para receber, de todos os projetos.
 *
 * É a razão de a baixa morar aqui e não só dentro do projeto: para saber o
 * que vence esta semana ela teria que abrir projeto por projeto. Aqui é uma
 * lista só, por vencimento, com o vencido em vermelho no topo.
 *
 * A baixa é a mesma função do painel do contrato — nenhuma conta é refeita
 * aqui, e as duas telas não têm como discordar.
 */
function AReceber({ hoje }: { hoje: string }) {
  const parcelas = useSyncExternalStore(assinarParcelas, lerParcelas, lerParcelasNoServidor);
  const { carregando, erro } = useSyncExternalStore(
    assinarParcelas,
    lerStatusParcelas,
    lerStatusParcelasNoServidor,
  );

  const abertas = parcelas.filter((p) => !p.quitada);
  const vencidas = abertas.filter((p) => p.venceEm < hoje);
  const aVencer = abertas.reduce((t, p) => t + (p.valor - p.recebido), 0);

  return (
    <div style={{ ...panel, padding: "28px 30px 14px", marginTop: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div style={cardTitle}>A receber</div>
        <div style={{ fontFamily: MONO, fontSize: "11px", color: erro ? "#9C2B22" : "#9A9689" }}>
          {erro ??
            (carregando
              ? "carregando…"
              : abertas.length === 0
                ? "nada em aberto"
                : `${abertas.length} ${abertas.length === 1 ? "parcela" : "parcelas"} · ${money(aVencer)}` +
                  (vencidas.length > 0 ? ` · ${vencidas.length} vencida${vencidas.length > 1 ? "s" : ""}` : ""))}
        </div>
      </div>

      {abertas.length === 0 ? (
        <div style={{ fontSize: "13px", color: "#6E6A5F", padding: "18px 0 20px", lineHeight: 1.5 }}>
          Nada a receber. As parcelas são cadastradas no painel de contrato de cada projeto, ao
          fechar a venda.
        </div>
      ) : (
        <div style={{ marginTop: 14 }}>
          {abertas.map((p) => {
            const vencida = p.venceEm < hoje;
            return (
              <div key={p.id} className="dash-parcela">
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "13.5px", fontWeight: 600 }}>{p.cliente}</div>
                  <div style={{ fontSize: "12px", color: "#8C887C", marginTop: 2 }}>
                    {p.projeto} · {p.numero}ª parcela
                  </div>
                </div>
                <div style={{ textAlign: "right", flex: "none" }}>
                  <div style={{ fontSize: "13.5px", fontWeight: 600, ...NUM }}>
                    {money(p.valor - p.recebido)}
                  </div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: "10.5px",
                      color: vencida ? "#9C2B22" : "#9A9689",
                      marginTop: 2,
                    }}
                  >
                    {vencida ? "venceu em " : "vence em "}
                    {dataCurta(p.venceEm)}
                    {p.recebido > 0 ? " · " + money(p.recebido) + " parcial" : ""}
                  </div>
                </div>
                <BaixaDaParcela parcela={p} hoje={hoje} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** A baixa, aberta só quando ela clica — igual à do painel do contrato. */
function BaixaDaParcela({ parcela, hoje }: { parcela: Parcela; hoje: string }) {
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
        className="dash-btn-outline"
        onClick={() => setAberto(true)}
        style={{ borderRadius: 999, padding: "8px 15px", fontSize: "12.5px", flex: "none" }}
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
        aria-label={"Valor recebido de " + parcela.cliente}
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
        <div role="alert" style={{ fontFamily: MONO, fontSize: "11px", color: "#9C2B22", width: "100%" }}>
          {falha}
        </div>
      )}
    </div>
  );
}
