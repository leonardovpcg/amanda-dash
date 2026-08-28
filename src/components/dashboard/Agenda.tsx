"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Agenda.

   Três colunas que vêm de três lugares diferentes, e a distinção importa:

   - **Visitas e reuniões** ela marca aqui, à mão. Sem sincronia com Google,
     por decisão dela.
   - **Retornos a fazer** ninguém digita: são os leads parados além do limite
     da etapa, calculados por `v_retornos` a cada leitura. "Atrasado 4 dias"
     guardado seria um número errado amanhã.
   - **Entregas e montagens** vêm dos prazos que ela põe no cartão do
     ambiente, dentro do projeto. Digitar de novo aqui criaria a segunda
     agenda que discorda da primeira.

   Só a primeira coluna tem formulário. As outras duas têm o caminho de volta:
   o retorno abre o lead no funil, a montagem abre o projeto.
   ═════════════════════════════════════════════════════════════════════════ */

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  TIPOS_MARCAVEIS,
  apagarCompromisso,
  assinarAgenda,
  assinarRetornos,
  criarCompromisso,
  horaDe,
  lerAgenda,
  lerAgendaNoServidor,
  lerRetornos,
  lerRetornosNoServidor,
  lerStatusAgenda,
  lerStatusAgendaNoServidor,
  mudarSituacao,
  rotuloDoTipo,
  type TipoDeCompromisso,
} from "@/lib/dados/agenda";
import {
  assinarRelogio,
  hojeISO,
  lerRelogio,
  lerRelogioNoServidor,
} from "@/lib/dados/relogio";
import { STAGES, money, type StageKey } from "@/lib/dashboard/data";
import { MONO, NUM, cardTitle, colLabel, mono, panel } from "./ui";

const MES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Tipos que a fábrica manda — vão para a terceira coluna. */
const DE_FABRICA = new Set(["producao", "entrega", "montagem"]);

/* Os rótulos vêm de STAGES, não de uma cópia local: com duas listas, uma
   ganha etapa nova e a outra fica para trás. */
const ETAPAS = new Map(STAGES);

export default function Agenda({
  onAbrirLead,
  onAbrirProjeto,
}: {
  onAbrirLead: (leadId: string) => void;
  onAbrirProjeto: (projetoId: string) => void;
}) {
  const agora = useSyncExternalStore(assinarRelogio, lerRelogio, lerRelogioNoServidor);
  const itens = useSyncExternalStore(assinarAgenda, lerAgenda, lerAgendaNoServidor);
  const retornos = useSyncExternalStore(assinarRetornos, lerRetornos, lerRetornosNoServidor);
  const { carregando, erro } = useSyncExternalStore(
    assinarAgenda,
    lerStatusAgenda,
    lerStatusAgendaNoServidor,
  );
  const [novo, setNovo] = useState(false);

  const hoje = hojeISO(agora);

  const { compromissos, fabrica } = useMemo(() => {
    // Passado resolvido sai da lista: agenda é o que ainda vai acontecer.
    // O que passou e não foi feito **fica**, em vermelho — sumir com o
    // compromisso esquecido é o pior jeito de lembrar dele.
    const vivos = itens.filter((i) => i.situacao !== "feito" || i.dia >= hoje);
    return {
      compromissos: vivos.filter((i) => !DE_FABRICA.has(i.tipo)),
      fabrica: vivos.filter((i) => DE_FABRICA.has(i.tipo)),
    };
  }, [itens, hoje]);

  return (
    <div className="dash-tabpad" style={{ maxWidth: 1440 }}>
      <div className="dash-agenda-cabeca">
        <div style={{ fontFamily: MONO, fontSize: "11px", color: erro ? "#9C2B22" : "#9A9689" }}>
          {erro ?? (carregando ? "carregando…" : `${itens.length + retornos.length} itens`)}
        </div>
        <button
          className="dash-btn-dark"
          onClick={() => setNovo((v) => !v)}
          style={{ borderRadius: 999, padding: "11px 20px", fontSize: "12.5px" }}
        >
          {novo ? "Fechar" : "+ Novo compromisso"}
        </button>
      </div>

      {novo && <FormNovo hoje={hoje} onPronto={() => setNovo(false)} />}

      <div className="dash-grid-3" style={{ marginTop: 20 }}>
        {/* ── o que ela marca ──────────────────────────────────────────── */}
        <Coluna
          titulo="Visitas e reuniões"
          subtitulo="Marcados por você"
          quantidade={compromissos.length}
          vazio="Nada marcado. Use o botão acima."
        >
          {compromissos.map((i) => (
            <Linha
              key={i.id}
              dia={i.dia}
              hoje={hoje}
              titulo={i.titulo}
              detalhe={[i.cliente, i.nota].filter(Boolean).join(" · ")}
              rodape={[horaDe(i), i.local, rotuloDoTipo(i.tipo)].filter(Boolean).join(" · ")}
              atrasado={i.dia < hoje && i.situacao !== "feito"}
              acoes={
                <>
                  {i.situacao !== "feito" && (
                    <button
                      className="dash-btn-link"
                      onClick={() => void mudarSituacao(i.id, "feito")}
                      style={{ fontSize: "11.5px", color: "#6B7040" }}
                    >
                      Feito
                    </button>
                  )}
                  <button
                    className="dash-btn-link"
                    onClick={() => void apagarCompromisso(i.id)}
                    style={{ fontSize: "11.5px", color: "#9C2B22" }}
                  >
                    Remover
                  </button>
                </>
              }
            />
          ))}
        </Coluna>

        {/* ── o que o funil cobra ──────────────────────────────────────── */}
        <Coluna
          titulo="Retornos a fazer"
          subtitulo="Leads parados além do limite da etapa"
          quantidade={retornos.length}
          vazio="Nenhum lead parado. O funil está em dia."
        >
          {retornos.map((r) => (
            <div key={r.id} className="dash-agenda-item">
              <div style={{ width: 52, flex: "none", textAlign: "center" }}>
                <div style={{ fontSize: "17px", fontWeight: 600, letterSpacing: "-0.02em", color: "#9C2B22", ...NUM }}>
                  {r.diasParado}
                </div>
                <div style={mono(9.5, "#9A9689", { upper: true })}>dias</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13.5px", fontWeight: 600, letterSpacing: "-0.005em" }}>
                  {r.nome}
                </div>
                <div style={{ fontSize: "12.5px", color: "#6E6A5F", marginTop: 3 }}>
                  {ETAPAS.get(r.etapa as StageKey) ?? r.etapa}
                  {r.valorEstimado > 0 ? ` · ${money(r.valorEstimado)}` : ""}
                </div>
                <button
                  className="dash-btn-link"
                  onClick={() => onAbrirLead(r.id)}
                  style={{ fontSize: "11.5px", color: "#A84B1C", marginTop: 6 }}
                >
                  Abrir no funil
                </button>
              </div>
            </div>
          ))}
        </Coluna>

        {/* ── o que a fábrica devolve ──────────────────────────────────── */}
        <Coluna
          titulo="Entregas e montagens"
          subtitulo="Dos prazos marcados no cartão do ambiente"
          quantidade={fabrica.length}
          vazio="Nenhum prazo de fábrica marcado."
        >
          {fabrica.map((i) => (
            <Linha
              key={i.id}
              dia={i.dia}
              hoje={hoje}
              titulo={i.titulo}
              detalhe={[i.cliente, i.projeto].filter(Boolean).join(" · ")}
              rodape={
                i.situacao === "feito" ? `${rotuloDoTipo(i.tipo)} · feita` : rotuloDoTipo(i.tipo)
              }
              atrasado={i.dia < hoje && i.situacao !== "feito"}
              acoes={
                i.projetoId ? (
                  <button
                    className="dash-btn-link"
                    onClick={() => onAbrirProjeto(i.projetoId!)}
                    style={{ fontSize: "11.5px", color: "#A84B1C" }}
                  >
                    Abrir projeto
                  </button>
                ) : null
              }
            />
          ))}
        </Coluna>
      </div>
    </div>
  );
}

/* ── peças ─────────────────────────────────────────────────────────────── */

function Coluna({
  titulo,
  subtitulo,
  quantidade,
  vazio,
  children,
}: {
  titulo: string;
  subtitulo: string;
  quantidade: number;
  vazio: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ ...panel, padding: "26px 28px 14px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div style={cardTitle}>{titulo}</div>
        <div style={{ fontFamily: MONO, fontSize: "10.5px", color: "#9A9689" }}>{quantidade}</div>
      </div>
      <div style={{ fontSize: "12.5px", color: "#8C887C", marginTop: 4 }}>{subtitulo}</div>
      <div style={{ marginTop: 18 }}>
        {quantidade === 0 ? (
          <div style={{ fontSize: "13px", color: "#9A9689", padding: "10px 0 18px" }}>{vazio}</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function Linha({
  dia,
  hoje,
  titulo,
  detalhe,
  rodape,
  atrasado,
  acoes,
}: {
  dia: string;
  hoje: string;
  titulo: string;
  detalhe: string;
  rodape: string;
  atrasado: boolean;
  acoes: React.ReactNode;
}) {
  const [, m, d] = dia.split("-");
  const eHoje = dia === hoje;
  return (
    <div className="dash-agenda-item">
      <div style={{ width: 52, flex: "none", textAlign: "center" }}>
        <div
          style={{
            fontSize: "17px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: atrasado ? "#9C2B22" : eHoje ? "#A84B1C" : "#23231F",
            ...NUM,
          }}
        >
          {d}
        </div>
        <div style={mono(10, "#9A9689", { upper: true })}>{MES_CURTO[Number(m) - 1]}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13.5px", fontWeight: 600, letterSpacing: "-0.005em" }}>{titulo}</div>
        {detalhe && (
          <div style={{ fontSize: "12.5px", color: "#6E6A5F", marginTop: 3 }}>{detalhe}</div>
        )}
        <div
          style={{
            fontFamily: MONO,
            fontSize: "10.5px",
            color: atrasado ? "#9C2B22" : eHoje ? "#A84B1C" : "#9A9689",
            marginTop: 5,
          }}
        >
          {atrasado ? "atrasado · " : eHoje ? "hoje · " : ""}
          {rodape}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 7 }}>{acoes}</div>
      </div>
    </div>
  );
}

function FormNovo({ hoje, onPronto }: { hoje: string; onPronto: () => void }) {
  const [tipo, setTipo] = useState<TipoDeCompromisso>("visita");
  const [dia, setDia] = useState(hoje);
  const [hora, setHora] = useState("09:00");
  const [titulo, setTitulo] = useState("");
  const [local, setLocal] = useState("");
  const [nota, setNota] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);

  const salvar = async () => {
    setSalvando(true);
    const erro = await criarCompromisso({ tipo, dia, hora, titulo, local, nota });
    setSalvando(false);
    setFalha(erro);
    if (!erro) onPronto();
  };

  return (
    <div style={{ ...panel, padding: "26px 28px", marginTop: 18 }}>
      <div style={cardTitle}>Novo compromisso</div>
      <div className="dash-agenda-form">
        <label style={{ display: "block", minWidth: 0 }}>
          <span style={colLabel()}>Tipo</span>
          <select
            className="dash-field dash-field-sm"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoDeCompromisso)}
            style={{ width: "100%", marginTop: 5 }}
          >
            {TIPOS_MARCAVEIS.map(([v, r]) => (
              <option key={v} value={v}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "block", minWidth: 0 }}>
          <span style={colLabel()}>Dia</span>
          <input
            className="dash-field dash-field-sm"
            type="date"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            style={{ width: "100%", marginTop: 5, ...NUM }}
          />
        </label>
        <label style={{ display: "block", minWidth: 0 }}>
          <span style={colLabel()}>Hora</span>
          <input
            className="dash-field dash-field-sm"
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            style={{ width: "100%", marginTop: 5, ...NUM }}
          />
        </label>
        <label style={{ display: "block", minWidth: 0, gridColumn: "1 / -1" }}>
          <span style={colLabel()}>Com quem / o quê</span>
          <input
            className="dash-field dash-field-sm"
            placeholder="Juliana Beltrão"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void salvar();
            }}
            style={{ width: "100%", marginTop: 5 }}
          />
        </label>
        <label style={{ display: "block", minWidth: 0 }}>
          <span style={colLabel()}>Local</span>
          <input
            className="dash-field dash-field-sm"
            placeholder="Perdizes"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            style={{ width: "100%", marginTop: 5 }}
          />
        </label>
        <label style={{ display: "block", minWidth: 0, gridColumn: "span 2" }}>
          <span style={colLabel()}>Nota</span>
          <input
            className="dash-field dash-field-sm"
            placeholder="Medição final · cozinha e lavanderia"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            style={{ width: "100%", marginTop: 5 }}
          />
        </label>
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
          onClick={() => void salvar()}
          style={{ borderRadius: 999, padding: "11px 22px", fontSize: "12.5px" }}
        >
          {salvando ? "Salvando…" : "Marcar"}
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
