"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Um bloco do projeto que recolhe.

   A tela do projeto tem oito blocos empilhados; preencher um projeto inteiro
   virou uma rolagem longa demais. Cada um passa a recolher, e o mesmo botão
   `−`/`+` do orçamento é reaproveitado — dois desenhos diferentes para o
   mesmo gesto seriam duas coisas para aprender.

   O resumo à direita é o que faz o bloco recolhido continuar servindo: "4
   ambientes · R$ 82.400" responde a pergunta sem abrir. Bloco fechado que não
   diz nada só esconde trabalho.
   ═════════════════════════════════════════════════════════════════════════ */

import { useSyncExternalStore, type ReactNode } from "react";
import {
  alternarSecao,
  assinarRecolhidas,
  lerRecolhidas,
  lerRecolhidasNoServidor,
  type SecaoDoProjeto,
} from "@/lib/dashboard/secoes";
import { MONO, cardTitle, panel } from "./ui";

/**
 * O mesmo estado, para os blocos que trazem painel próprio.
 *
 * Orçamento e Contrato são componentes inteiros, com cabeçalho e painel seus.
 * Envolvê-los daria painel dentro de painel — então eles põem o controle no
 * próprio cabeçalho, lendo daqui. O estado continua num lugar só.
 */
export function useSecaoAberta(id: SecaoDoProjeto): boolean {
  const recolhidas = useSyncExternalStore(
    assinarRecolhidas,
    lerRecolhidas,
    lerRecolhidasNoServidor,
  );
  return !recolhidas.includes(id);
}

/** O botão `−`/`+` com o título, para reaproveitar nesses cabeçalhos. */
export function AlvoDaSecao({
  id,
  titulo,
  aberta,
}: {
  id: SecaoDoProjeto;
  titulo: string;
  aberta: boolean;
}) {
  return (
    <button className="dash-secao-alvo" onClick={() => alternarSecao(id)} aria-expanded={aberta}>
      <span className="dash-btn-step dash-secao-sinal" aria-hidden>
        {aberta ? "−" : "+"}
      </span>
      <span style={cardTitle}>{titulo}</span>
    </button>
  );
}

export default function SecaoDobravel({
  id,
  titulo,
  resumo,
  acoes,
  children,
  padding = "28px 30px",
}: {
  id: SecaoDoProjeto;
  titulo: string;
  /** O que o bloco fechado ainda precisa dizer. */
  resumo?: ReactNode;
  /** Botões do cabeçalho — só aparecem com o bloco aberto. */
  acoes?: ReactNode;
  children: ReactNode;
  padding?: string;
}) {
  const recolhidas = useSyncExternalStore(
    assinarRecolhidas,
    lerRecolhidas,
    lerRecolhidasNoServidor,
  );
  const aberta = !recolhidas.includes(id);

  return (
    <div style={{ ...panel, padding, marginTop: 20 }}>
      <div className="dash-secao-topo">
        {/* O cabeçalho inteiro alterna, não só o botão: alvo de 26px é pequeno
            demais para o dedo, e o título é o que ela olha. */}
        <button
          className="dash-secao-alvo"
          onClick={() => alternarSecao(id)}
          aria-expanded={aberta}
        >
          <span
            className="dash-btn-step dash-secao-sinal"
            aria-hidden
          >
            {aberta ? "−" : "+"}
          </span>
          <span style={cardTitle}>{titulo}</span>
        </button>

        <div className="dash-secao-lado">
          {resumo && (
            <div style={{ fontFamily: MONO, fontSize: "11px", color: "#9A9689" }}>{resumo}</div>
          )}
          {aberta && acoes}
        </div>
      </div>

      {/* Desmontado, e não escondido com CSS: os blocos pesados — orçamento,
          materiais — deixam de calcular e de renderizar quando fechados. */}
      {aberta && children}
    </div>
  );
}
