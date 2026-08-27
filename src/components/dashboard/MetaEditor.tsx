"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Meta do mês — o número que a barra do topo persegue.

   Ela mesma define, mês a mês. Não é calculada de histórico de propósito: a
   meta é decisão comercial dela, e uma média dos meses anteriores viraria
   cobrança que ninguém escolheu.

   Diferente das outras telas de Ajustes, esta tem botão de salvar. As outras
   gravam a cada tecla porque o catálogo é um documento só, e escrever nele é
   otimista; aqui cada gravação é uma ida ao banco que recarrega a lista, e
   fazer isso por tecla digitada seria uma viagem de rede por algarismo.
   ═════════════════════════════════════════════════════════════════════════ */

import { useState, useSyncExternalStore } from "react";
import {
  apagarMeta,
  assinarMetas,
  definirMeta,
  lerMetas,
  lerMetasNoServidor,
  lerStatusMetas,
  lerStatusMetasNoServidor,
} from "@/lib/dados/contratos";
import {
  assinarRelogio,
  lerRelogio,
  lerRelogioNoServidor,
  mesCorrente,
  nomeDoMes,
} from "@/lib/dados/relogio";
import { brl } from "@/lib/orcamento/calculo";
import { MONO, NUM, colLabel, panel, sectionTitle } from "./ui";

/** "2026-08" + 1 → "2026-09". */
function somarMes(aaaaMm: string, n: number): string {
  const [ano, mes] = aaaaMm.split("-").map(Number);
  const d = new Date(ano, mes - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const rotuloDoMes = (aaaaMm: string) => `${nomeDoMes(aaaaMm)} de ${aaaaMm.split("-")[0]}`;

/** Aceita "84000", "84.000" e "84.000,00". */
function lerValor(s: string): number | null {
  const limpo = s.replace(/[^0-9,.]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(limpo);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function MetaEditor() {
  const agora = useSyncExternalStore(assinarRelogio, lerRelogio, lerRelogioNoServidor);
  const metas = useSyncExternalStore(assinarMetas, lerMetas, lerMetasNoServidor);
  // O armazém avisa dado e status pelos mesmos ouvintes, então a assinatura é
  // a mesma.
  const { carregando, erro } = useSyncExternalStore(
    assinarMetas,
    lerStatusMetas,
    lerStatusMetasNoServidor,
  );

  const mes = mesCorrente(agora);
  const atual = metas.find((m) => m.mes === mes) ?? null;
  const outras = metas.filter((m) => m.mes !== mes);

  const [rascunho, setRascunho] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);

  const campo = rascunho ?? (atual ? String(atual.meta).replace(".", ",") : "");

  const salvar = async (alvo: string, texto: string) => {
    const valor = lerValor(texto);
    if (valor === null) {
      setFalha("Informe um valor maior que zero.");
      return;
    }
    setSalvando(true);
    setFalha(await definirMeta(alvo, valor));
    setSalvando(false);
    setRascunho(null);
  };

  return (
    <>
      <div className="dash-ajustes-cabeca">
        <div>
          <h2 style={sectionTitle}>Meta do mês</h2>
          <div style={{ fontSize: "13px", color: "#6E6A5F", marginTop: 6 }}>
            Quanto você quer fechar em contrato. É esta a barra que aparece no topo do painel —
            e o que conta para ela é contrato assinado, não proposta enviada.
          </div>
        </div>
        <div
          role={erro ? "alert" : undefined}
          style={{ fontFamily: MONO, fontSize: "11px", color: erro ? "#9C2B22" : "#9A9689" }}
        >
          {erro ??
            (carregando
              ? "carregando…"
              : `${metas.length} ${metas.length === 1 ? "mês definido" : "meses definidos"}`)}
        </div>
      </div>

      {/* ── mês corrente ──────────────────────────────────────────────── */}
      <div style={{ ...panel, padding: "28px 30px", marginTop: 22 }}>
        <div style={colLabel()}>{rotuloDoMes(mes)}</div>

        <div className="dash-meta-linha">
          <div style={{ position: "relative", flex: "1 1 220px", minWidth: 0 }}>
            <span
              style={{
                position: "absolute",
                left: 16,
                top: "50%",
                transform: "translateY(-50%)",
                fontFamily: MONO,
                fontSize: "13px",
                color: "#9A9689",
                pointerEvents: "none",
              }}
            >
              R$
            </span>
            <input
              className="dash-field"
              inputMode="numeric"
              placeholder="0"
              value={campo}
              onChange={(e) => setRascunho(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void salvar(mes, campo);
              }}
              style={{
                width: "100%",
                padding: "14px 16px 14px 44px",
                fontSize: "22px",
                fontWeight: 500,
                letterSpacing: "-0.02em",
                ...NUM,
              }}
            />
          </div>
          <button
            className="dash-btn-dark"
            disabled={salvando}
            onClick={() => void salvar(mes, campo)}
            style={{ borderRadius: 999, padding: "14px 22px", fontSize: "13px" }}
          >
            {salvando ? "Salvando…" : atual ? "Atualizar" : "Definir meta"}
          </button>
          {atual && (
            <button
              className="dash-btn-link"
              onClick={() => void apagarMeta(mes)}
              style={{ fontSize: "12.5px", color: "#9C2B22" }}
            >
              Remover
            </button>
          )}
        </div>

        {falha && (
          <div
            role="alert"
            style={{ fontFamily: MONO, fontSize: "11px", color: "#9C2B22", marginTop: 12 }}
          >
            {falha}
          </div>
        )}

        {atual ? (
          <div style={{ marginTop: 26 }}>
            <div
              style={{
                height: 10,
                borderRadius: 999,
                background: "#EDEAE2",
                overflow: "hidden",
                maxWidth: 420,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: Math.min(100, Math.round(atual.pct)) + "%",
                  borderRadius: 999,
                  background: atual.pct >= 100 ? "#6B7040" : "#A84B1C",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginTop: 16 }}>
              <Numero rotulo="fechado no mês" valor={brl(atual.vendido)} />
              <Numero rotulo="meta" valor={brl(atual.meta)} />
              <Numero
                rotulo={atual.falta > 0 ? "falta" : "acima da meta"}
                valor={brl(atual.falta > 0 ? atual.falta : atual.vendido - atual.meta)}
                cor={atual.falta > 0 ? "#A84B1C" : "#6B7040"}
              />
            </div>
          </div>
        ) : (
          !carregando && (
            <div style={{ fontSize: "13px", color: "#6E6A5F", marginTop: 16 }}>
              Sem meta definida, o topo do painel não mostra barra nenhuma.
            </div>
          )
        )}
      </div>

      {/* ── outros meses ──────────────────────────────────────────────── */}
      <div style={{ ...panel, padding: "28px 30px", marginTop: 18 }}>
        <div style={colLabel()}>Outros meses</div>
        <div style={{ marginTop: 14 }}>
          {outras.length === 0 ? (
            <div style={{ fontSize: "13px", color: "#6E6A5F" }}>
              Nenhum outro mês com meta. Dá para adiantar a de{" "}
              {rotuloDoMes(somarMes(mes, 1))} abaixo.
            </div>
          ) : (
            outras.map((m) => (
              <div key={m.mes} className="dash-meta-item">
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "13.5px", fontWeight: 600 }}>{rotuloDoMes(m.mes)}</div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: "11px",
                      color: "#9A9689",
                      marginTop: 3,
                      ...NUM,
                    }}
                  >
                    {brl(m.vendido)} de {brl(m.meta)} · {Math.round(m.pct)}%
                  </div>
                </div>
                <button
                  className="dash-btn-link"
                  onClick={() => void apagarMeta(m.mes)}
                  style={{ fontSize: "12.5px", color: "#9C2B22" }}
                >
                  Remover
                </button>
              </div>
            ))
          )}
        </div>

        <OutroMes mes={somarMes(mes, 1)} onSalvar={salvar} />
      </div>
    </>
  );
}

function Numero({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div>
      <div style={colLabel()}>{rotulo}</div>
      <div
        style={{
          fontSize: "17px",
          fontWeight: 600,
          marginTop: 4,
          ...NUM,
          ...(cor ? { color: cor } : null),
        }}
      >
        {valor}
      </div>
    </div>
  );
}

/** Adiantar a meta do mês que vem, sem esperar ele virar. */
function OutroMes({
  mes,
  onSalvar,
}: {
  mes: string;
  onSalvar: (mes: string, texto: string) => Promise<void>;
}) {
  const [texto, setTexto] = useState("");
  const enviar = () => {
    if (!texto.trim()) return;
    void onSalvar(mes, texto).then(() => setTexto(""));
  };
  return (
    <div className="dash-meta-linha" style={{ marginTop: 20 }}>
      <input
        className="dash-field dash-field-sm"
        inputMode="numeric"
        placeholder={`Meta de ${rotuloDoMes(mes)}`}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") enviar();
        }}
        style={{ flex: "1 1 220px", minWidth: 0 }}
      />
      <button
        className="dash-btn-outline"
        disabled={!texto.trim()}
        onClick={enviar}
        style={{
          borderRadius: 999,
          padding: "11px 20px",
          fontSize: "12.5px",
          opacity: texto.trim() ? 1 : 0.45,
        }}
      >
        Adiantar
      </button>
    </div>
  );
}
