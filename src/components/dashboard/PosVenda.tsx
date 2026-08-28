"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Pós-venda.

   Uma coisa digitada e duas calculadas:

   - **Assistência** ela abre, acompanha e resolve. É a única tabela aqui.
   - **Garantia** conta da última montagem realizada, e só quando *nenhum*
     ambiente do projeto está pendente. Ou seja: a lista fica vazia até um
     projeto inteiro chegar a "Concluído" no cartão dos ambientes.
   - **Indicação** é o cliente entregue há mais de 60 dias que ainda não
     indicou ninguém — a fila de quem vale a pena ligar.

   As duas últimas não têm botão de criar de propósito. Se dessem para
   digitar, seriam a segunda versão da verdade sobre o que já foi entregue.
   ═════════════════════════════════════════════════════════════════════════ */

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  SITUACOES_DA_ASSISTENCIA,
  abrirAssistencia,
  apagarAssistencia,
  assinarAssistencias,
  assinarGarantias,
  assinarIndicacoes,
  lerAssistencias,
  lerAssistenciasNoServidor,
  lerGarantias,
  lerGarantiasNoServidor,
  lerIndicacoes,
  lerIndicacoesNoServidor,
  lerStatusAssistencias,
  lerStatusAssistenciasNoServidor,
  mudarSituacaoDaAssistencia,
  rotuloDaAssistencia,
  tomDaAssistencia,
  type SituacaoDaAssistencia,
} from "@/lib/dados/posvenda";
import {
  assinarRelogio,
  hojeISO,
  lerRelogio,
  lerRelogioNoServidor,
} from "@/lib/dados/relogio";
import { chip } from "@/lib/dashboard/data";
import type { ProjectVM } from "./DashboardArquitetura";
import { MONO, NUM, cardTitle, colLabel, mono, panel } from "./ui";

const MES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const dataCurta = (iso: string) => {
  const [a, m, d] = iso.split("-");
  return `${Number(d)} ${MES_CURTO[Number(m) - 1] ?? ""} ${a}`;
};
const mesAno = (iso: string) => {
  const [a, m] = iso.split("-");
  return `${MES_CURTO[Number(m) - 1] ?? ""} ${a}`;
};

export default function PosVenda({
  projects,
  onAbrirProjeto,
}: {
  projects: ProjectVM[];
  onAbrirProjeto: (id: string) => void;
}) {
  const agora = useSyncExternalStore(assinarRelogio, lerRelogio, lerRelogioNoServidor);
  const assistencias = useSyncExternalStore(
    assinarAssistencias,
    lerAssistencias,
    lerAssistenciasNoServidor,
  );
  const garantias = useSyncExternalStore(assinarGarantias, lerGarantias, lerGarantiasNoServidor);
  const indicacoes = useSyncExternalStore(
    assinarIndicacoes,
    lerIndicacoes,
    lerIndicacoesNoServidor,
  );
  const { carregando, erro } = useSyncExternalStore(
    assinarAssistencias,
    lerStatusAssistencias,
    lerStatusAssistenciasNoServidor,
  );

  const hoje = hojeISO(agora);
  const [nova, setNova] = useState(false);

  const kpis = useMemo(() => {
    const abertas = assistencias.filter((a) => a.situacao !== "resolvida");
    const vencidas = abertas.filter((a) => a.prazo && a.prazo < hoje).length;
    // 60 dias é o mesmo limite que a tela usa para destacar em vermelho.
    const vencendo = garantias.filter((g) => g.diasRestantes <= 60 && g.diasRestantes > 0).length;
    const pad = (n: number) => String(n).padStart(2, "0");
    return [
      {
        label: "Assistências abertas",
        valor: pad(abertas.length),
        nota:
          vencidas > 0
            ? `${vencidas} com prazo vencido`
            : abertas.length > 0
              ? "nenhuma com prazo vencido"
              : "nada em aberto",
        cor: vencidas > 0 ? "#9C2B22" : undefined,
      },
      {
        label: "Garantias em vigência",
        valor: pad(garantias.filter((g) => g.diasRestantes > 0).length),
        nota: vencendo > 0 ? `${vencendo} vencem em 60 dias` : "nenhuma vence em 60 dias",
      },
      {
        label: "Indicação e recompra",
        valor: pad(indicacoes.length),
        nota: indicacoes.length > 0 ? "clientes prontos para contato" : "nenhum na fila",
      },
    ];
  }, [assistencias, garantias, indicacoes, hoje]);

  return (
    <div className="dash-tabpad" style={{ maxWidth: 1440 }}>
      <div className="dash-grid-3">
        {kpis.map(({ label, valor, nota, cor }) => (
          <div key={label} style={{ ...panel, padding: "24px 26px" }}>
            <div style={mono(10.5, "#8C887C", { ls: "0.08em", upper: true })}>{label}</div>
            <div
              style={{
                fontSize: "clamp(32px, 7vw, 44px)",
                fontWeight: 600,
                letterSpacing: "-0.04em",
                marginTop: 12,
                ...NUM,
                ...(cor ? { color: cor } : null),
              }}
            >
              {valor}
            </div>
            <div style={{ fontSize: "13px", color: "#6E6A5F", marginTop: 6 }}>{nota}</div>
          </div>
        ))}
      </div>

      {/* ── assistências técnicas ───────────────────────────────────────── */}
      <div style={{ ...panel, padding: "28px 30px 14px", marginTop: 20 }}>
        <div
          style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}
        >
          <div style={cardTitle}>Assistências técnicas</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontFamily: MONO, fontSize: "11px", color: erro ? "#9C2B22" : "#9A9689" }}>
              {erro ?? (carregando ? "carregando…" : `${assistencias.length} no total`)}
            </div>
            <button
              className="dash-btn-outline"
              onClick={() => setNova((v) => !v)}
              style={{ borderRadius: 999, padding: "8px 15px", fontSize: "12.5px" }}
            >
              {nova ? "Fechar" : "+ Abrir chamado"}
            </button>
          </div>
        </div>

        {nova && <FormAssistencia projects={projects} onPronto={() => setNova(false)} />}

        {assistencias.length === 0 ? (
          <div style={{ fontSize: "13px", color: "#6E6A5F", padding: "18px 0 20px" }}>
            Nenhum chamado registrado.
          </div>
        ) : (
          <div className="dash-scroll-x">
            <div>
              {assistencias.map((a) => (
                <div key={a.id} className="dash-assist-linha">
                  <div style={{ minWidth: 0 }}>
                    <button
                      className="dash-btn-link"
                      onClick={() => onAbrirProjeto(a.projetoId)}
                      style={{ fontSize: "13.5px", fontWeight: 600, textAlign: "left" }}
                    >
                      {a.cliente}
                    </button>
                    <div style={{ fontSize: "12px", color: "#8C887C", marginTop: 2 }}>
                      {[a.ambiente, a.projeto].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div style={{ fontSize: "13px", color: "#4A473F", minWidth: 0 }}>{a.sintoma}</div>
                  <div style={{ fontFamily: MONO, fontSize: "11.5px", color: "#6E6A5F" }}>
                    aberto {dataCurta(a.abertaEm)}
                    {a.prazo && (
                      <div style={{ color: a.prazo < hoje && a.situacao !== "resolvida" ? "#9C2B22" : "#9A9689", marginTop: 2 }}>
                        prazo {dataCurta(a.prazo)}
                      </div>
                    )}
                  </div>
                  <div className="dash-assist-acoes">
                    <span style={chip(tomDaAssistencia(a.situacao))}>
                      {rotuloDaAssistencia(a.situacao)}
                    </span>
                    <select
                      className="dash-select"
                      value={a.situacao}
                      onChange={(e) =>
                        void mudarSituacaoDaAssistencia(
                          a.id,
                          e.target.value as SituacaoDaAssistencia,
                          hoje,
                        )
                      }
                      aria-label={"Situação do chamado de " + a.cliente}
                      style={{
                        padding: "6px 26px 6px 9px",
                        fontSize: "11.5px",
                        borderRadius: 9,
                        width: "auto",
                        backgroundPosition: "right 8px center",
                      }}
                    >
                      {SITUACOES_DA_ASSISTENCIA.map(([v, r]) => (
                        <option key={v} value={v}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <button
                      className="dash-btn-link"
                      onClick={() => void apagarAssistencia(a.id)}
                      style={{ fontSize: "11.5px", color: "#9C2B22" }}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="dash-grid-2" style={{ marginTop: 20 }}>
        {/* ── garantias ─────────────────────────────────────────────────── */}
        <div style={{ ...panel, padding: "28px 30px 14px" }}>
          <div style={cardTitle}>Garantias em vigência</div>
          <div style={{ fontSize: "12.5px", color: "#8C887C", marginTop: 4 }}>
            Conta da montagem do último ambiente concluído
          </div>
          {garantias.length === 0 ? (
            <div style={{ fontSize: "13px", color: "#6E6A5F", padding: "16px 0 20px" }}>
              Nenhum projeto entregue por inteiro ainda. A garantia começa quando o último
              ambiente chega a &quot;Concluído&quot;.
            </div>
          ) : (
            garantias.map((g) => (
              <div key={g.projetoId} className="dash-pos-linha">
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "13.5px", fontWeight: 600 }}>{g.cliente}</div>
                  <div style={{ fontSize: "12px", color: "#8C887C", marginTop: 2 }}>{g.projeto}</div>
                </div>
                <div style={{ textAlign: "right", flex: "none" }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: g.diasRestantes <= 60 ? "#9C2B22" : "#A84B1C",
                      ...NUM,
                    }}
                  >
                    {mesAno(g.venceEm)}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: "10.5px", color: "#9A9689", marginTop: 2 }}>
                    {g.diasRestantes <= 0
                      ? "vencida"
                      : `${Math.round(g.diasRestantes / 30)} meses`}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── indicação e recompra ──────────────────────────────────────── */}
        <div style={{ ...panel, padding: "28px 30px 14px" }}>
          <div style={cardTitle}>Indicação e recompra</div>
          <div style={{ fontSize: "12.5px", color: "#8C887C", marginTop: 4 }}>
            Entregues há mais de 60 dias que ainda não indicaram ninguém
          </div>
          {indicacoes.length === 0 ? (
            <div style={{ fontSize: "13px", color: "#6E6A5F", padding: "16px 0 20px" }}>
              Ninguém na fila.
            </div>
          ) : (
            indicacoes.map((i) => (
              <div key={i.projetoId} className="dash-pos-linha">
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "13.5px", fontWeight: 600 }}>{i.cliente}</div>
                  <div style={{ fontSize: "12px", color: "#8C887C", marginTop: 2 }}>
                    entregue há {Math.round(i.diasDesdeEntrega / 30)} meses · {i.projeto}
                  </div>
                </div>
                <button
                  className="dash-btn-soft"
                  onClick={() => onAbrirProjeto(i.projetoId)}
                  style={{
                    background: "#FBF2EC",
                    padding: "8px 14px",
                    fontSize: "12px",
                    whiteSpace: "nowrap",
                    flex: "none",
                  }}
                >
                  Abrir projeto
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ── abrir chamado ─────────────────────────────────────────────────────── */

function FormAssistencia({
  projects,
  onPronto,
}: {
  projects: ProjectVM[];
  onPronto: () => void;
}) {
  const [projetoId, setProjetoId] = useState(projects[0]?.id ?? "");
  const [sintoma, setSintoma] = useState("");
  const [prazo, setPrazo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);

  const salvar = async () => {
    setSalvando(true);
    const erro = await abrirAssistencia({ projetoId, sintoma, prazo });
    setSalvando(false);
    setFalha(erro);
    if (!erro) onPronto();
  };

  if (projects.length === 0) {
    return (
      <div style={{ fontSize: "13px", color: "#6E6A5F", padding: "18px 0 4px" }}>
        Não há projeto para abrir chamado. A assistência é sempre de um projeto.
      </div>
    );
  }

  return (
    <div style={{ padding: "18px 0 4px", borderTop: "1px solid #F0EDE5", marginTop: 18 }}>
      <div className="dash-assist-form">
        <label style={{ display: "block", minWidth: 0 }}>
          <span style={colLabel()}>Projeto</span>
          <select
            className="dash-select"
            value={projetoId}
            onChange={(e) => setProjetoId(e.target.value)}
            style={{ width: "100%", marginTop: 5 }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.client} · {p.name}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "block", minWidth: 0, gridColumn: "span 2" }}>
          <span style={colLabel()}>Problema</span>
          <input
            className="dash-field dash-field-sm"
            placeholder="Regulagem de porta de correr desalinhada"
            value={sintoma}
            onChange={(e) => setSintoma(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void salvar();
            }}
            style={{ width: "100%", marginTop: 5 }}
          />
        </label>
        <label style={{ display: "block", minWidth: 0 }}>
          <span style={colLabel()}>Prazo (opcional)</span>
          <input
            className="dash-field dash-field-sm"
            type="date"
            value={prazo}
            onChange={(e) => setPrazo(e.target.value)}
            style={{ width: "100%", marginTop: 5, ...NUM }}
          />
        </label>
      </div>

      {falha && (
        <div role="alert" style={{ ...mono(11, "#9C2B22"), marginTop: 12 }}>
          {falha}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
        <button
          className="dash-btn-dark"
          disabled={salvando}
          onClick={() => void salvar()}
          style={{ borderRadius: 999, padding: "10px 20px", fontSize: "12.5px" }}
        >
          {salvando ? "Salvando…" : "Abrir chamado"}
        </button>
        <button
          className="dash-btn-link"
          onClick={onPronto}
          style={{ fontSize: "12.5px", color: "#6E6A5F" }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
