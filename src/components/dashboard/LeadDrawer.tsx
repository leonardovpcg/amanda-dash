"use client";

import { useState } from "react";
import { NEXT_STEPS, STAGES, chip, money, type Lead } from "@/lib/dashboard/data";
import type { SinalDeBriefing } from "./Funil";
import { MONO, NUM, mono } from "./ui";

const box: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,.9)",
  background: "rgba(255,255,255,.6)",
  borderRadius: 20,
};

/**
 * Um campo que grava ao sair, não a cada tecla.
 *
 * Toda gravação daqui recarrega armazém — renomear cliente mexe em duas
 * listas. Por tecla digitada seria uma ida ao banco por letra, com o cursor
 * pulando de volta no meio da palavra.
 *
 * A `key` do lead descarta o rascunho ao trocar de cartão: sem ela, abrir
 * outro lead herdaria o que ficou digitado no anterior. Esc desiste.
 */
function CampoQueGrava({
  id,
  rotulo,
  valor,
  ajuda,
  somenteLeitura,
  onSalvar,
}: {
  id: string;
  rotulo: string;
  valor: string;
  ajuda?: string;
  somenteLeitura?: boolean;
  onSalvar: (v: string) => void;
}) {
  const [rascunho, setRascunho] = useState(valor);
  const gravar = () => {
    if (rascunho.trim() !== valor) onSalvar(rascunho);
  };
  return (
    <label style={{ display: "block", minWidth: 0 }}>
      <span style={mono(10, "#9A9689", { ls: "0.07em", upper: true })}>{rotulo}</span>
      {somenteLeitura ? (
        <div
          style={{
            marginTop: 5,
            padding: "10px 13px",
            borderRadius: 12,
            border: "1px dashed #E2DED4",
            background: "rgba(255,255,255,.4)",
            fontSize: "13.5px",
            color: "#8C887C",
          }}
        >
          {valor}
        </div>
      ) : (
        <input
          key={id}
          className="dash-field dash-field-sm"
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          onBlur={gravar}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setRascunho(valor);
          }}
          style={{ width: "100%", marginTop: 5 }}
        />
      )}
      {ajuda && (
        <span
          style={{
            display: "block",
            fontFamily: MONO,
            fontSize: "10.5px",
            color: "#9A9689",
            marginTop: 5,
            lineHeight: 1.5,
          }}
        >
          {ajuda}
        </span>
      )}
    </label>
  );
}

export default function LeadDrawer({
  lead,
  onClose,
  onAdvance,
  onAbrirProjeto,
  onCliente,
  onProjeto,
  onAmbientes,
  onTelefone,
  onEmail,
  onValor,
  projetoNome,
  valorEditavel,
  briefing,
  onBriefing,
}: {
  lead: Lead;
  onClose: () => void;
  onAdvance: () => void;
  /** Abre o projeto deste atendimento — eles nascem juntos. */
  onAbrirProjeto: () => void;
  /** Renomeia o cliente. Vale em todo o histórico: é a mesma pessoa. */
  onCliente: (nome: string) => void;
  onProjeto: (nome: string) => void;
  onAmbientes: (texto: string) => void;
  onTelefone: (v: string) => void;
  onEmail: (v: string) => void;
  onValor: (texto: string) => void;
  /** Nome do projeto vinculado, ou nulo em lead que não tem um. */
  projetoNome: string | null;
  /** Falso quando o valor vem do orçamento ou do contrato — aí não se digita. */
  valorEditavel: boolean;
  briefing?: SinalDeBriefing;
  onBriefing: () => void;
}) {
  const stageIdx = STAGES.findIndex((s) => s[0] === lead.stage);
  const parts = lead.ambientes.split(" · ");

  const vm = {
    ambientes: parts[0],
    origem: parts[1] || "Loja",
    stageLabel: STAGES[stageIdx][1],
    badgeStyle: chip(lead.stage === "fechado" ? "olive" : lead.idle >= 7 ? "clay" : "terracota"),
    valueLabel: money(lead.value),
    idleText: lead.idle === 0 ? "hoje" : lead.idle + (lead.idle === 1 ? " dia" : " dias"),
    idleColor: lead.idle >= 7 ? "#9C2B22" : "#23231F",
    // Antes isto era inventado a partir do valor do lead. Com cliente de
    // verdade, número fabricado é pior que campo vazio: ela ligaria para ele.
    phone: lead.telefone?.trim() || null,
    email: lead.email?.trim() || null,
    next: NEXT_STEPS[stageIdx],
    // A segunda linha era inventada — "agenda sugerida: 27 ago, 14:30" para
    // uma reunião que ninguém marcou. Em vez de uma data falsa, o que a tela
    // tem de verdade: há quanto tempo o lead está parado.
    nextDate:
      lead.idle === 0
        ? "contato hoje"
        : lead.idle === 1
          ? "sem contato há 1 dia"
          : "sem contato há " + lead.idle + " dias",
    // Era "Converter em projeto" na última etapa. Não converte mais nada: o
    // projeto existe desde a abertura do atendimento.
    advanceLabel:
      stageIdx >= STAGES.length - 1
        ? "Já está fechado"
        : "Avançar para " + STAGES[stageIdx + 1][1],
    history: STAGES.slice(0, stageIdx + 1)
      .reverse()
      .map((s, i) => ({
        title: (i === 0 ? "Etapa atual · " : "Concluído · ") + s[1],
        date:
          i === 0
            ? lead.idle === 0
              ? "atualizado hoje"
              : "há " + lead.idle + " dias"
            : "há " + (lead.idle + i * 6) + " dias",
        color: i === 0 ? "#A84B1C" : "#C9C4B6",
      })),
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 45,
        display: "flex",
        justifyContent: "flex-end",
        background: "rgba(38,42,38,.32)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        className="dash-drawer"
        onClick={(e) => e.stopPropagation()}
        style={{
          background:
            "linear-gradient(170deg, rgba(252,251,248,.97) 0%, rgba(238,243,240,.97) 100%)",
          borderLeft: "1px solid rgba(255,255,255,.9)",
          boxShadow: "-30px 0 80px rgba(38,42,38,.28)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <span style={vm.badgeStyle}>{vm.stageLabel}</span>
            <h2
              style={{
                fontSize: "27px",
                fontWeight: 500,
                letterSpacing: "-0.03em",
                margin: "14px 0 0",
              }}
            >
              {lead.name}
            </h2>
            <div style={{ fontSize: "13px", color: "#6E6A5F", marginTop: 5 }}>{vm.ambientes}</div>
          </div>
          <button
            className="dash-btn-ghost"
            onClick={onClose}
            style={{
              borderRadius: 999,
              width: 36,
              height: 36,
              fontSize: "15px",
              color: "#6E6A5F",
              flex: "none",
            }}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {/* ── editar ─────────────────────────────────────────────────────
            A gaveta era só leitura: dava para avançar a etapa e nada mais.
            Como o cartão mostra o nome do CLIENTE e o cabeçalho do projeto
            edita o nome do PROJETO, mexer lá não mudava nada aqui — e como os
            dois nascem iguais, parecia que tinham parado de sincronizar. Os
            dois campos ficam lado a lado agora, com o nome de cada um. */}
        <div style={{ ...box, padding: "18px 20px", marginTop: 18 }}>
          <div style={{ display: "grid", gap: 14 }}>
            <CampoQueGrava
              id={lead.id + ":cliente"}
              rotulo="Cliente"
              valor={lead.name}
              ajuda="Muda em todo lugar: funil, projeto, contrato e garantia."
              onSalvar={onCliente}
            />
            <CampoQueGrava
              id={lead.id + ":projeto"}
              rotulo="Projeto"
              valor={projetoNome ?? "—"}
              somenteLeitura={projetoNome === null}
              ajuda={
                projetoNome === null
                  ? "Este atendimento é anterior ao vínculo automático e não tem projeto."
                  : undefined
              }
              onSalvar={onProjeto}
            />
            <CampoQueGrava
              id={lead.id + ":ambientes"}
              rotulo="Ambientes"
              valor={lead.ambientes}
              ajuda="A anotação do cartão. Os ambientes que orçam ficam dentro do projeto."
              onSalvar={onAmbientes}
            />
            <CampoQueGrava
              id={lead.id + ":valor"}
              rotulo="Valor"
              valor={valorEditavel ? String(lead.value || "") : money(lead.value)}
              somenteLeitura={!valorEditavel}
              ajuda={
                valorEditavel
                  ? "Estimativa do projeto, enquanto não há orçamento lançado."
                  : "Calculado do orçamento ou do contrato assinado — some quando há número de verdade."
              }
              onSalvar={onValor}
            />
          </div>
        </div>

        {/* ── briefing ──────────────────────────────────────────────── */}
        <BlocoDeBriefing sinal={briefing} onAbrir={onBriefing} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <div style={{ ...box, padding: "18px 20px" }}>
            <div style={mono(10, "#9A9689", { ls: "0.08em", upper: true })}>Valor estimado</div>
            <div
              style={{
                fontSize: "26px",
                fontWeight: 600,
                letterSpacing: "-0.03em",
                marginTop: 8,
                ...NUM,
              }}
            >
              {vm.valueLabel}
            </div>
          </div>
          <div style={{ ...box, padding: "18px 20px" }}>
            <div style={mono(10, "#9A9689", { ls: "0.08em", upper: true })}>Parado nesta etapa</div>
            <div
              style={{
                fontSize: "26px",
                fontWeight: 600,
                letterSpacing: "-0.03em",
                marginTop: 8,
                color: vm.idleColor,
                ...NUM,
              }}
            >
              {vm.idleText}
            </div>
          </div>
        </div>

        <div style={{ ...box, padding: "20px 22px", marginTop: 12 }}>
          <div style={{ fontSize: "14px", fontWeight: 600, letterSpacing: "-0.01em" }}>Contato</div>
          {/* Eram só de leitura: "não está me deixando preencher depois,
              telefone e e-mail, só na hora de criar". Telefone que ela não
              tinha em mãos na abertura é o caso comum, não a exceção. */}
          <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
            <CampoQueGrava
              id={lead.id + ":telefone"}
              rotulo="Telefone"
              valor={vm.phone ?? ""}
              onSalvar={onTelefone}
            />
            <CampoQueGrava
              id={lead.id + ":email"}
              rotulo="E-mail"
              valor={vm.email ?? ""}
              onSalvar={onEmail}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span style={{ color: "#8C887C" }}>Origem</span>
              <span>{vm.origem}</span>
            </div>
          </div>
        </div>

        <div style={{ ...box, padding: "20px 22px", marginTop: 12 }}>
          <div style={{ fontSize: "14px", fontWeight: 600, letterSpacing: "-0.01em" }}>
            Histórico do atendimento
          </div>
          <div style={{ marginTop: 6 }}>
            {vm.history.map((h, i) => (
              <div
                key={i}
                style={{ display: "flex", gap: 13, padding: "13px 0", borderTop: "1px solid #F0EDE5" }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    flex: "none",
                    marginTop: 6,
                    background: h.color,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: 600 }}>{h.title}</div>
                  <div style={{ fontFamily: MONO, fontSize: "10.5px", color: "#9A9689", marginTop: 3 }}>
                    {h.date}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            border: "1px solid rgba(168,75,28,.2)",
            background: "rgba(168,75,28,.07)",
            borderRadius: 20,
            padding: "20px 22px",
            marginTop: 12,
          }}
        >
          <div style={mono(10, "#9C7B62", { ls: "0.08em", upper: true })}>Próximo passo</div>
          <div
            style={{
              fontSize: "14.5px",
              fontWeight: 600,
              marginTop: 8,
              letterSpacing: "-0.01em",
            }}
          >
            {vm.next}
          </div>
          <div style={{ fontSize: "12.5px", color: "#4A473F", marginTop: 4 }}>{vm.nextDate}</div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button
            className="dash-btn-dark"
            onClick={onAdvance}
            style={{ flex: 1, borderRadius: 999, padding: "13px 20px", fontSize: "13px" }}
          >
            {vm.advanceLabel}
          </button>
          <button
            className="dash-btn-ghost"
            onClick={onAbrirProjeto}
            disabled={!lead.projetoId}
            title={lead.projetoId ? undefined : "Este atendimento é anterior ao vínculo automático"}
            style={{
              borderRadius: 999,
              padding: "13px 20px",
              fontSize: "13px",
              opacity: lead.projetoId ? 1 : 0.45,
            }}
          >
            Abrir projeto
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Bloco de briefing da gaveta.
 *
 * O botão é a entrada principal do modo reunião — ela abre a gaveta do cliente
 * antes de sentar com ele. As essenciais em aberto aparecem como aviso, não
 * como bloqueio: quem decide se dá para orçar assim é ela, não o dashboard.
 */
function BlocoDeBriefing({ sinal, onAbrir }: { sinal?: SinalDeBriefing; onAbrir: () => void }) {
  const existe = Boolean(sinal?.existe);
  const p = sinal?.progresso;
  const faltam = p?.essenciaisAbertas ?? 0;

  return (
    <div style={{ ...box, padding: "18px 20px", marginTop: 26 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
        <div style={{ minWidth: 0 }}>
          <div style={mono(10, "#9A9689", { ls: "0.08em", upper: true })}>Briefing comercial</div>
          <div style={{ fontSize: "14px", fontWeight: 600, marginTop: 7, ...NUM }}>
            {existe && p ? `${p.resolvidas} de ${p.total} respondidas` : "ainda não iniciado"}
          </div>
        </div>
        <button
          className="dash-btn-terra"
          onClick={onAbrir}
          style={{ borderRadius: 999, padding: "10px 17px", fontSize: "12.5px", flex: "none" }}
        >
          {existe ? "Continuar" : "Iniciar"}
        </button>
      </div>

      {existe && p && p.total > 0 && (
        <>
          <div
            style={{ height: 6, borderRadius: 999, background: "#EDEAE2", marginTop: 12, overflow: "hidden" }}
          >
            <div style={{ height: "100%", width: p.pct + "%", background: "#A84B1C", borderRadius: 999 }} />
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: "10.5px",
              marginTop: 8,
              color: faltam ? "#9C2B22" : "#6B7040",
            }}
          >
            {faltam
              ? `${faltam} essencia${faltam === 1 ? "l" : "is"} em aberto para orçar`
              : "nada essencial em aberto"}
          </div>
        </>
      )}
    </div>
  );
}
