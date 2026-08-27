"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Briefing em modo reunião.

   Tela cheia porque ela vai estar com o celular ou o tablet na mão, do outro
   lado da mesa. As decisões que sustentam o formato:

   - **Chip antes de campo de texto.** Ela está conversando, não digitando.
   - **Fora de ordem.** O cliente fala do que quiser; qualquer parte abre
     direto, e nenhuma pergunta bloqueia a seguinte.
   - **"Não se aplica" existe.** É diferente de "não perguntei", e sem essa
     diferença o contador de pendências mente.
   - **Salva a cada toque.** Reunião não tem botão "salvar".
   ═════════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { novoIdDeAmbiente, progressoDeSecoes } from "@/lib/briefing/armazem";
import type {
  Briefing as TBriefing,
  BriefingAmbiente,
  Pergunta,
  Progresso,
  Respostas,
  Roteiro,
  Secao,
  ValorResposta,
} from "@/lib/briefing/tipos";
import { MONO, NUM, mono, pillStyle } from "./ui";

/** "geral" ou o id de um ambiente do briefing. */
type Parte = string;

export default function Briefing({
  cliente,
  briefing,
  roteiro,
  onChange,
  onClose,
}: {
  cliente: string;
  briefing: TBriefing;
  roteiro: Roteiro;
  /**
   * Recebe a função, não o briefing pronto: cada alteração parte do que está
   * gravado naquele instante, senão dois toques no mesmo quadro se atropelam.
   */
  onChange: (fn: (b: TBriefing) => TBriefing) => void;
  onClose: () => void;
}) {
  const [parte, setParte] = useState<Parte>("geral");
  const [escolhendo, setEscolhendo] = useState(false);

  const partes = [
    {
      id: "geral",
      rotulo: "Geral",
      progresso: progressoDeSecoes(roteiro.geral, briefing.geral),
    },
    ...briefing.ambientes.map((a) => {
      const rot = roteiro.ambientes.find((x) => x.id === a.tipo);
      return {
        id: a.id,
        rotulo: a.apelido,
        progresso: rot
          ? progressoDeSecoes(rot.secoes, a.respostas)
          : { resolvidas: 0, total: 0, essenciaisAbertas: 0, pct: 0 },
      };
    }),
  ];

  const geral = parte === "geral";
  const ambiente = briefing.ambientes.find((a) => a.id === parte);
  const roteiroDoAmbiente = ambiente
    ? roteiro.ambientes.find((x) => x.id === ambiente.tipo)
    : undefined;

  const secoes: Secao[] = geral ? roteiro.geral : (roteiroDoAmbiente?.secoes ?? []);
  const respostas: Respostas = geral ? briefing.geral : (ambiente?.respostas ?? {});
  const nota = geral ? briefing.notaGeral : (ambiente?.nota ?? "");

  const total = partes.reduce(
    (acc, p) => ({
      resolvidas: acc.resolvidas + p.progresso.resolvidas,
      total: acc.total + p.progresso.total,
      essenciaisAbertas: acc.essenciaisAbertas + p.progresso.essenciaisAbertas,
      pct: 0,
    }),
    { resolvidas: 0, total: 0, essenciaisAbertas: 0, pct: 0 },
  );
  total.pct = total.total ? Math.round((total.resolvidas / total.total) * 100) : 0;

  /* ── edição ────────────────────────────────────────────────────────── */

  const trocarRespostas = (fn: (r: Respostas) => Respostas) => {
    const alvo = ambiente?.id;
    if (geral) onChange((b) => ({ ...b, geral: fn(b.geral) }));
    else if (alvo)
      onChange((b) => ({
        ...b,
        ambientes: b.ambientes.map((a) => (a.id === alvo ? { ...a, respostas: fn(a.respostas) } : a)),
      }));
  };

  const responder = (id: string, valor: ValorResposta) =>
    trocarRespostas((r) => ({ ...r, [id]: { estado: "respondida", valor } }));

  /**
   * Marca ou desmarca sem depender do que estava na tela.
   *
   * Chip trabalha por intenção — "alterna esta opção" — e não por valor
   * calculado no render. Tocando três chips em sequência rápida, um valor
   * pré-calculado partiria sempre da mesma lista velha e só o último toque
   * sobreviveria; assim cada toque parte do que já está gravado.
   */
  const alternarOpcao = (id: string, opcao: string) =>
    trocarRespostas((r) => {
      const atual = r[id];
      const lista =
        atual?.estado === "respondida" && Array.isArray(atual.valor) ? atual.valor : [];
      const nova = lista.includes(opcao)
        ? lista.filter((x) => x !== opcao)
        : [...lista, opcao];
      if (!nova.length) {
        const copia = { ...r };
        delete copia[id];
        return copia;
      }
      return { ...r, [id]: { estado: "respondida", valor: nova } };
    });

  /** Mesma ideia para escolha única e sim/não: tocar no marcado desmarca. */
  const alternarValor = (id: string, valor: ValorResposta) =>
    trocarRespostas((r) => {
      const atual = r[id];
      if (atual?.estado === "respondida" && atual.valor === valor) {
        const copia = { ...r };
        delete copia[id];
        return copia;
      }
      return { ...r, [id]: { estado: "respondida", valor } };
    });

  /** Limpa de vez: volta para "não perguntada", que não é o mesmo que vazia. */
  const limpar = (id: string) =>
    trocarRespostas((r) => {
      const novo = { ...r };
      delete novo[id];
      return novo;
    });

  const alternarNaoSeAplica = (id: string) =>
    trocarRespostas((r) => {
      if (r[id]?.estado === "naoSeAplica") {
        const novo = { ...r };
        delete novo[id];
        return novo;
      }
      return { ...r, [id]: { estado: "naoSeAplica" } };
    });

  const trocarNota = (v: string) => {
    const alvo = ambiente?.id;
    if (geral) onChange((b) => ({ ...b, notaGeral: v }));
    else if (alvo)
      onChange((b) => ({
        ...b,
        ambientes: b.ambientes.map((a) => (a.id === alvo ? { ...a, nota: v } : a)),
      }));
  };

  const addAmbiente = (tipoId: string) => {
    const rot = roteiro.ambientes.find((x) => x.id === tipoId);
    if (!rot) return;
    const novo: BriefingAmbiente = {
      // Uuid gerado no cliente: o banco aceita id explícito, e assim o
      // ambiente aparece na tela sem esperar a ida e volta da rede.
      id: novoIdDeAmbiente(),
      tipo: tipoId,
      apelido: rot.nome,
      respostas: {},
      nota: "",
    };
    onChange((b) => ({ ...b, ambientes: [...b.ambientes, novo] }));
    setParte(novo.id);
    setEscolhendo(false);
  };

  const removerAmbiente = () => {
    const alvo = ambiente?.id;
    if (!alvo) return;
    onChange((b) => ({ ...b, ambientes: b.ambientes.filter((a) => a.id !== alvo) }));
    setParte("geral");
  };

  /* ── tela ──────────────────────────────────────────────────────────── */

  return (
    <div className="dash-brief">
      <div className="dash-brief-topo">
        <div style={{ minWidth: 0 }}>
          <div style={mono(10, "#9A9689", { ls: "0.08em", upper: true })}>Briefing comercial</div>
          <div
            style={{
              fontSize: "18px",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              marginTop: 3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {cliente}
          </div>
        </div>
        <div className="dash-brief-topo-dir">
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "15px", fontWeight: 600, ...NUM }}>
              {total.resolvidas}/{total.total}
            </div>
            <div
              style={{
                ...mono(10, total.essenciaisAbertas ? "#9C2B22" : "#9A9689"),
                marginTop: 2,
                whiteSpace: "nowrap",
              }}
            >
              {total.essenciaisAbertas
                ? `${total.essenciaisAbertas} essencia${total.essenciaisAbertas === 1 ? "l" : "is"} em aberto`
                : "nada essencial em aberto"}
            </div>
          </div>
          <button
            className="dash-btn-ghost"
            onClick={onClose}
            aria-label="Fechar briefing"
            style={{
              background: "#FFFFFF",
              borderRadius: 999,
              width: 38,
              height: 38,
              fontSize: "15px",
              lineHeight: 1,
              flex: "none",
            }}
          >
            ✕
          </button>
        </div>
      </div>

      <div className="dash-brief-barra">
        <div style={{ width: total.pct + "%", height: "100%", background: "#A84B1C" }} />
      </div>

      {/* ── partes ──────────────────────────────────────────────────── */}
      <div className="dash-brief-abas">
        {partes.map((p) => {
          const ativa = p.id === parte;
          return (
            <button
              key={p.id}
              onClick={() => setParte(p.id)}
              style={{
                ...pillStyle(ativa),
                display: "flex",
                alignItems: "center",
                gap: 7,
                flex: "none",
              }}
            >
              {p.rotulo}
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: "10px",
                  opacity: ativa ? 0.85 : 0.6,
                  ...NUM,
                }}
              >
                {p.progresso.resolvidas}/{p.progresso.total}
              </span>
              {p.progresso.essenciaisAbertas > 0 && (
                <span
                  aria-label="tem essencial em aberto"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: ativa ? "#FBF2EC" : "#9C2B22",
                    flex: "none",
                  }}
                />
              )}
            </button>
          );
        })}
        <button
          className="dash-btn-outline"
          onClick={() => setEscolhendo((v) => !v)}
          style={{ borderRadius: 999, padding: "9px 15px", fontSize: "12.5px", flex: "none" }}
        >
          + Ambiente
        </button>
      </div>

      {escolhendo && (
        <div className="dash-brief-escolha">
          {roteiro.ambientes.map((a) => (
            <button
              key={a.id}
              className="dash-btn-soft"
              onClick={() => addAmbiente(a.id)}
              style={{ background: "#FFFFFF", padding: "9px 15px", fontSize: "12.5px" }}
            >
              {a.nome}
            </button>
          ))}
        </div>
      )}

      {/* ── perguntas ───────────────────────────────────────────────── */}
      <div className="dash-brief-corpo">
        {!geral && ambiente && (
          <div className="dash-brief-apelido">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={mono(10, "#9A9689", { ls: "0.07em", upper: true })}>
                Como o cliente chama este ambiente
              </div>
              <input
                className="dash-inline"
                value={ambiente.apelido}
                onChange={(e) => {
                  const v = e.target.value;
                  onChange((b) => ({
                    ...b,
                    ambientes: b.ambientes.map((a) =>
                      a.id === ambiente.id ? { ...a, apelido: v } : a,
                    ),
                  }));
                }}
                placeholder={roteiroDoAmbiente?.nome ?? "Ambiente"}
                style={{ fontSize: "16px", fontWeight: 600, width: "100%", marginTop: 2 }}
              />
            </div>
            <button
              className="dash-btn-link"
              onClick={removerAmbiente}
              style={{
                padding: "6px 0",
                fontSize: "12px",
                color: "#9C2B22",
                flex: "none",
              }}
            >
              Remover
            </button>
          </div>
        )}

        {secoes.map((s) => (
          <section key={s.id} className="dash-brief-secao">
            <h3 className="dash-brief-secao-tit">{s.titulo}</h3>
            {s.perguntas.map((p) => (
              <PerguntaBloco
                key={p.id}
                p={p}
                resposta={respostas[p.id]}
                onResponder={(v) => responder(p.id, v)}
                onAlternarValor={(v) => alternarValor(p.id, v)}
                onAlternarOpcao={(o) => alternarOpcao(p.id, o)}
                onLimpar={() => limpar(p.id)}
                onNaoSeAplica={() => alternarNaoSeAplica(p.id)}
              />
            ))}
          </section>
        ))}

        {secoes.length === 0 && (
          <div style={{ fontSize: "13px", color: "#8C887C", padding: "20px 0" }}>
            Este ambiente não tem roteiro — o tipo pode ter sido removido em Ajustes.
          </div>
        )}

        <section className="dash-brief-secao">
          <h3 className="dash-brief-secao-tit">Anotações livres</h3>
          <textarea
            className="dash-field"
            value={nota}
            onChange={(e) => trocarNota(e.target.value)}
            rows={4}
            placeholder="O que a lista não previu."
            style={{ width: "100%", resize: "vertical", lineHeight: 1.5 }}
          />
        </section>
      </div>
    </div>
  );
}

/* ── uma pergunta ─────────────────────────────────────────────────────── */

function PerguntaBloco({
  p,
  resposta,
  onResponder,
  onAlternarValor,
  onAlternarOpcao,
  onLimpar,
  onNaoSeAplica,
}: {
  p: Pergunta;
  resposta: { estado: "respondida"; valor: ValorResposta } | { estado: "naoSeAplica" } | undefined;
  onResponder: (v: ValorResposta) => void;
  onAlternarValor: (v: ValorResposta) => void;
  onAlternarOpcao: (o: string) => void;
  onLimpar: () => void;
  onNaoSeAplica: () => void;
}) {
  const na = resposta?.estado === "naoSeAplica";
  const valor = resposta?.estado === "respondida" ? resposta.valor : undefined;

  // Três áreas soltas em vez de aninhadas: no desktop elas viram uma linha só
  // (pergunta · resposta · não se aplica) e no celular empilham. Aninhado o
  // controle nunca conseguiria subir para o lado da pergunta.
  return (
    <div className="dash-brief-perg">
      <div className="dash-brief-perg-texto">
        <div style={{ fontSize: "14.5px", fontWeight: 500, letterSpacing: "-0.01em" }}>
          {p.texto}
          {p.essencial && (
            <span
              title="sem isto não dá para orçar"
              style={{ color: "#A84B1C", marginLeft: 5, fontWeight: 700 }}
            >
              *
            </span>
          )}
        </div>
        {p.ajuda && (
          <div style={{ ...mono(10.5, "#9A9689"), marginTop: 4, lineHeight: 1.5 }}>{p.ajuda}</div>
        )}
      </div>

      <div className="dash-brief-perg-controle">
        {!na && (
          <Controle
            p={p}
            valor={valor}
            onResponder={onResponder}
            onAlternarValor={onAlternarValor}
            onAlternarOpcao={onAlternarOpcao}
            onLimpar={onLimpar}
          />
        )}
      </div>

      <button
        className="dash-btn-ghost dash-brief-perg-na"
        onClick={onNaoSeAplica}
        style={{
          background: na ? "#F1F0EA" : "transparent",
          border: "1px solid " + (na ? "#E3E0D6" : "transparent"),
          borderRadius: 999,
          padding: "5px 11px",
          fontSize: "11.5px",
          color: na ? "#6E6A5F" : "#A8A498",
          whiteSpace: "nowrap",
        }}
      >
        não se aplica
      </button>
    </div>
  );
}

function Controle({
  p,
  valor,
  onResponder,
  onAlternarValor,
  onAlternarOpcao,
  onLimpar,
}: {
  p: Pergunta;
  /** Só para desenhar o que está marcado — nenhuma decisão sai daqui. */
  valor: ValorResposta | undefined;
  onResponder: (v: ValorResposta) => void;
  onAlternarValor: (v: ValorResposta) => void;
  onAlternarOpcao: (o: string) => void;
  onLimpar: () => void;
}) {
  if (p.tipo === "texto") {
    return (
      <textarea
        className="dash-field dash-field-sm"
        value={typeof valor === "string" ? valor : ""}
        onChange={(e) => (e.target.value ? onResponder(e.target.value) : onLimpar())}
        rows={2}
        style={{ width: "100%", resize: "vertical", lineHeight: 1.5 }}
      />
    );
  }

  if (p.tipo === "numero") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          className="dash-field dash-field-sm"
          inputMode="decimal"
          value={typeof valor === "number" ? String(valor).replace(".", ",") : ""}
          onChange={(e) => {
            const t = e.target.value.replace(/\./g, "").replace(",", ".");
            const n = parseFloat(t);
            if (!e.target.value.trim()) onLimpar();
            else if (Number.isFinite(n) && n >= 0) onResponder(n);
          }}
          style={{ width: 110, textAlign: "right", ...NUM }}
        />
        {p.unidade && <span style={{ fontSize: "13px", color: "#6E6A5F" }}>{p.unidade}</span>}
      </div>
    );
  }

  if (p.tipo === "simNao") {
    return (
      <div className="dash-brief-chips">
        {[
          ["Sim", true],
          ["Não", false],
        ].map(([rotulo, v]) => (
          <button
            key={String(v)}
            // Tocar de novo na opção já marcada desmarca — corrigir um toque
            // errado no meio da conversa não pode custar mais que um toque.
            onClick={() => onAlternarValor(v as boolean)}
            style={pillStyle(valor === v)}
          >
            {rotulo as string}
          </button>
        ))}
      </div>
    );
  }

  if (p.tipo === "escolha") {
    return (
      <div className="dash-brief-chips">
        {(p.opcoes ?? []).map((o) => (
          <button
            key={o}
            onClick={() => onAlternarValor(o)}
            style={pillStyle(valor === o)}
          >
            {o}
          </button>
        ))}
      </div>
    );
  }

  // multipla
  const marcadas = Array.isArray(valor) ? valor : [];
  return (
    <div className="dash-brief-chips">
      {(p.opcoes ?? []).map((o) => {
        const ativa = marcadas.includes(o);
        return (
          <button
            key={o}
            onClick={() => onAlternarOpcao(o)}
            style={pillStyle(ativa)}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export type { Progresso };
