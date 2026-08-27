"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Comissão.

   Tudo aqui vem de contrato assinado, nunca de proposta enviada — é a data de
   assinatura que conta, senão o mês fecha com venda que não aconteceu. A
   única exceção está separada e rotulada: o painel de projeção, que mostra o
   que os orçamentos abertos gerariam *se* fechassem.

   A taxa sai de `faixas_comissao`, a mesma tabela que `v_comissoes` usa no
   banco. Hoje é uma faixa só, de 2% em tudo; quando virarem faixas de
   verdade, esta tela acompanha sem mudar.
   ═════════════════════════════════════════════════════════════════════════ */

import { useSyncExternalStore } from "react";
import {
  assinarContratos,
  assinarFaixas,
  assinarMetas,
  lerContratos,
  lerContratosNoServidor,
  lerFaixas,
  lerFaixasNoServidor,
  lerMetas,
  lerMetasNoServidor,
  taxaDaFaixa,
} from "@/lib/dados/contratos";
import {
  assinarRelogio,
  lerRelogio,
  lerRelogioNoServidor,
  mesCorrente,
  nomeDoMes,
} from "@/lib/dados/relogio";
import { chip, money, type ToneName } from "@/lib/dashboard/data";
import type { ProjectVM } from "./DashboardArquitetura";
import { MONO, NUM, cardTitle, colLabel, mono, panel } from "./ui";

const COM_COLS = "2fr 1fr 1fr 1.1fr";
const ORC_COLS = "2fr 1fr 1fr";

const TOM: Record<string, ToneName> = {
  recebida: "olive",
  "a liberar": "terracota",
  prevista: "sand",
};

const MES_CURTO = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Os seis meses até o corrente, do mais antigo para o mais novo. */
function ultimosSeisMeses(mes: string): string[] {
  const [ano, m] = mes.split("-").map(Number);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(ano, m - 1 - (5 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

export default function Comissao({ projects }: { projects: ProjectVM[] }) {
  const agora = useSyncExternalStore(assinarRelogio, lerRelogio, lerRelogioNoServidor);
  const contratos = useSyncExternalStore(assinarContratos, lerContratos, lerContratosNoServidor);
  const faixas = useSyncExternalStore(assinarFaixas, lerFaixas, lerFaixasNoServidor);
  const metas = useSyncExternalStore(assinarMetas, lerMetas, lerMetasNoServidor);

  const mes = mesCorrente(agora);
  const doMes = contratos.filter((c) => c.assinadoEm.slice(0, 7) === mes);

  const vendido = doMes.reduce((t, c) => t + c.valor, 0);
  const prevista = doMes.reduce((t, c) => t + c.comissao, 0);
  // "Recebida" é a classificação da view: o cliente quitou o contrato. Enquanto
  // falta parcela, a comissão fica "a liberar" — é assim que a loja paga.
  const recebida = doMes
    .filter((c) => c.situacao === "recebida")
    .reduce((t, c) => t + c.comissao, 0);
  const ticket = doMes.length > 0 ? vendido / doMes.length : 0;

  const meta = metas.find((m) => m.mes === mes) ?? null;
  const pctMeta = meta ? Math.min(100, Math.round(meta.pct)) : 0;

  // Projeção: projeto com orçamento lançado já sabe quanto geraria de
  // comissão. Sai da lista assim que o contrato é assinado — daí em diante
  // ele é venda, e aparece nos números de cima.
  const assinados = new Set(contratos.map((c) => c.projetoId));
  const orcados = projects
    .filter((p) => p.doOrcamento && !assinados.has(p.id))
    .map((p) => ({
      id: p.id,
      nome: p.name,
      cliente: p.client,
      status: p.status,
      badgeStyle: p.badgeStyle,
      valor: p.contrato,
      valorLabel: money(p.contrato),
      comissaoLabel: money(p.contrato * taxaDaFaixa(faixas, p.contrato)),
    }));
  const comissaoOrcada = orcados.reduce(
    (t, o) => t + o.valor * taxaDaFaixa(faixas, o.valor),
    0,
  );

  // Gráfico dos seis meses. A escala vem do maior mês do período; sem venda
  // nenhuma o divisor seria zero.
  const meses = ultimosSeisMeses(mes);
  const porMes = meses.map((m) => ({
    mes: m,
    total: contratos
      .filter((c) => c.assinadoEm.slice(0, 7) === m)
      .reduce((t, c) => t + c.valor, 0),
  }));
  const maior = Math.max(1, ...porMes.map((m) => m.total));
  const mensal = porMes.map((m) => ({
    curto: MES_CURTO[Number(m.mes.split("-")[1]) - 1],
    label: m.total > 0 ? "R$ " + Math.round(m.total / 1000) + "k" : "—",
    pct: Math.round((m.total / maior) * 100),
    cor: m.mes === mes ? "#A84B1C" : "#D9D5C8",
  }));

  return (
    <div className="dash-tabpad" style={{ maxWidth: 1440 }}>
      {/* ── destaque do mês ─────────────────────────────────────────────── */}
      <div
        style={{
          background: "linear-gradient(140deg, #23231F 0%, #8E3A12 72%)",
          borderRadius: 30,
          padding: "40px 42px",
          boxShadow: "0 14px 40px rgba(168,75,28,.22)",
          color: "#FBF2EC",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 48,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={mono(10.5, "#D6A488", { ls: "0.09em", upper: true })}>
              Vendido em {nomeDoMes(mes)} de {mes.split("-")[0]}
            </div>
            <div
              style={{
                // Escala fluida em vez de 64px fixo: em 375px o número media
                // 236px numa caixa de 239 e qualquer valor maior quebraria.
                fontSize: "clamp(36px, 8vw, 64px)",
                fontWeight: 600,
                letterSpacing: "-0.045em",
                lineHeight: 1.02,
                marginTop: 12,
                ...NUM,
              }}
            >
              {money(vendido)}
            </div>
            <div style={{ fontSize: "14px", color: "#E9C9B6", marginTop: 8 }}>
              {doMes.length === 0
                ? "nenhum contrato assinado neste mês"
                : `${doMes.length} ${doMes.length === 1 ? "contrato fechado" : "contratos fechados"} · ticket médio ${money(ticket)}`}
            </div>
          </div>
          <div className="dash-com-stats">
            {[
              ["Comissão prevista", money(prevista), "sobre os contratos do mês"],
              [
                "Comissão recebida",
                money(recebida),
                prevista - recebida > 0 ? `${money(prevista - recebida)} a liberar` : "tudo liberado",
              ],
            ].map(([label, value, note]) => (
              <div key={label}>
                <div style={mono(10.5, "#D6A488", { ls: "0.09em", upper: true })}>{label}</div>
                <div
                  style={{
                    fontSize: "clamp(17px, 5vw, 32px)",
                    fontWeight: 600,
                    letterSpacing: "-0.03em",
                    marginTop: 10,
                    ...NUM,
                  }}
                >
                  {value}
                </div>
                <div style={{ fontSize: "12.5px", color: "#E9C9B6", marginTop: 4 }}>{note}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 34 }}>
          {meta ? (
            <>
              <div
                style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}
              >
                <div style={{ fontSize: "13.5px", fontWeight: 600 }}>
                  Meta do mês · {money(meta.meta)}
                </div>
                <div style={{ fontSize: "13.5px", color: "#E9C9B6", ...NUM }}>
                  {Math.round(meta.pct)}% da meta ·{" "}
                  {meta.falta > 0 ? `faltam ${money(meta.falta)}` : "meta batida"}
                </div>
              </div>
              <div
                style={{
                  height: 16,
                  borderRadius: 999,
                  background: "rgba(241,245,244,.18)",
                  marginTop: 12,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{ height: "100%", width: pctMeta + "%", borderRadius: 999, background: "#E8E3D6" }}
                />
              </div>
            </>
          ) : (
            <div style={{ fontFamily: MONO, fontSize: "12px", color: "#D6A488" }}>
              Sem meta definida para este mês — o campo está em Ajustes › Meta do mês.
            </div>
          )}
        </div>
      </div>

      {/* ── projeção vinda dos orçamentos ─────────────────────────────── */}
      {orcados.length > 0 && (
        <div style={{ ...panel, padding: "28px 30px 14px", marginTop: 20 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14 }}>
            <div>
              <div style={cardTitle}>Comissão projetada dos orçamentos</div>
              <div style={{ fontSize: "12.5px", color: "#8C887C", marginTop: 6 }}>
                sobre o valor com ART, antes de assinar
              </div>
            </div>
            <div style={{ textAlign: "right", flex: "none" }}>
              <div style={mono(10, "#9A9689", { ls: "0.07em", upper: true })}>Se todos fecharem</div>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: "#A84B1C",
                  marginTop: 5,
                  ...NUM,
                }}
              >
                {money(comissaoOrcada)}
              </div>
            </div>
          </div>
          <div className="dash-scroll-x">
            <div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: ORC_COLS,
                  gap: 14,
                  padding: "18px 0 12px",
                  borderBottom: "1px solid #EDEAE2",
                }}
              >
                <div style={colLabel()}>Projeto</div>
                <div style={colLabel("right")}>Orçado com ART</div>
                <div style={colLabel("right")}>Comissão</div>
              </div>
              {orcados.map((o) => (
                <div
                  key={o.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: ORC_COLS,
                    gap: 14,
                    padding: "15px 0",
                    borderBottom: "1px solid #F4F1EA",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <span style={{ fontSize: "13.5px", fontWeight: 500 }}>{o.nome}</span>
                      <span style={o.badgeStyle}>{o.status}</span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#8C887C", marginTop: 2 }}>{o.cliente}</div>
                  </div>
                  <div style={{ fontSize: "13px", textAlign: "right", color: "#4A473F", ...NUM }}>
                    {o.valorLabel}
                  </div>
                  <div style={{ fontSize: "13px", textAlign: "right", fontWeight: 600, ...NUM }}>
                    {o.comissaoLabel}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="dash-grid-com" style={{ marginTop: 20 }}>
        {/* ── comissão por contrato ─────────────────────────────────────── */}
        <div style={{ ...panel, padding: "28px 30px 14px" }}>
          <div style={cardTitle}>Comissão por contrato</div>
          {contratos.length === 0 ? (
            <div style={{ fontSize: "13px", color: "#6E6A5F", padding: "18px 0 20px" }}>
              Nenhum contrato registrado. Ele é assinado no painel do projeto, logo abaixo do
              orçamento.
            </div>
          ) : (
            <div className="dash-scroll-x">
              <div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: COM_COLS,
                    gap: 14,
                    padding: "18px 0 12px",
                    borderBottom: "1px solid #EDEAE2",
                  }}
                >
                  <div style={colLabel()}>Cliente</div>
                  <div style={colLabel("right")}>Contrato</div>
                  <div style={colLabel("right")}>Comissão</div>
                  <div style={colLabel("right")}>Situação</div>
                </div>
                {contratos.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: COM_COLS,
                      gap: 14,
                      padding: "15px 0",
                      borderBottom: "1px solid #F4F1EA",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "13.5px", fontWeight: 500 }}>{c.cliente}</div>
                      <div style={{ fontSize: "12px", color: "#8C887C", marginTop: 2 }}>
                        {c.projeto}
                      </div>
                    </div>
                    <div style={{ fontSize: "13px", textAlign: "right", color: "#4A473F", ...NUM }}>
                      {money(c.valor)}
                    </div>
                    <div style={{ fontSize: "13px", textAlign: "right", fontWeight: 600, ...NUM }}>
                      {money(c.comissao)}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={chip(TOM[c.situacao] ?? "sand")}>{c.situacao}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── últimos seis meses ────────────────────────────────────────── */}
        <div style={{ ...panel, padding: "28px 30px" }}>
          <div style={cardTitle}>Últimos seis meses</div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 14,
              height: 200,
              marginTop: 26,
            }}
          >
            {mensal.map((m) => (
              <div
                key={m.curto}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  height: "100%",
                  justifyContent: "flex-end",
                }}
              >
                <div style={{ fontSize: "11.5px", fontWeight: 600, color: "#4A473F", ...NUM }}>
                  {m.curto}
                </div>
                <div
                  style={{
                    width: "100%",
                    borderRadius: "8px 8px 4px 4px",
                    background: m.cor,
                    // Mesmo o mês zerado deixa um traço: coluna sem altura
                    // nenhuma some do gráfico e some com a informação.
                    height: Math.max(2, m.pct) + "%",
                  }}
                />
                <div style={{ fontFamily: MONO, fontSize: "10.5px", color: "#9A9689" }}>
                  {m.label}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: MONO, fontSize: "10.5px", color: "#A8A498", marginTop: 18 }}>
            valor contratado por mês{meta ? ` · meta ${money(meta.meta)}` : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
