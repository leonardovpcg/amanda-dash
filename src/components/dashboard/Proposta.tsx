"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Proposta comercial impressa.

   O que o cliente recebe: os ambientes, o que entra em cada um e o preço. Sem
   custo de compra, sem markup, sem as pendências internas — isso é conversa do
   orçamento, não da proposta.

   Vai para fora da `.dash-root` por portal, para o `@media print` conseguir
   esconder o dashboard inteiro com um seletor só e não sobrar página em
   branco no fim da impressão.
   ═════════════════════════════════════════════════════════════════════════ */

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { brl } from "@/lib/orcamento/calculo";
import { totalFinal } from "@/lib/orcamento/derivar";
import type { AmbienteCalculado, BlocoId, ProjetoCalculado } from "@/lib/orcamento/tipos";

const BLOCOS: BlocoId[] = ["chapas", "fita", "acessorios", "maoDeObra"];

/**
 * Blocos cujo `detalhe` é conversa interna.
 *
 * O motor guarda ali o multiplicador da linha — "markup 3×", "preço fechado",
 * "deste projeto". É o que ela precisa ver ao reabrir o orçamento, e é
 * exatamente o que **não** pode sair numa proposta: é a margem da loja.
 *
 * Antes só a mão de obra carregava isso. Quando os acessórios ganharam markup
 * por item, o detalhe deles passou a carregar também — e teria vazado na
 * primeira proposta impressa, porque a regra estava escrita para um bloco só
 * em vez de para o motivo.
 */
const DETALHE_INTERNO = new Set<BlocoId>(["acessorios", "maoDeObra"]);

/**
 * As linhas de um ambiente como saem no papel.
 *
 * Função à parte, e exportada, porque é aqui que mora a regra que separa o
 * que o cliente pode ver do que é interno — e regra assim merece teste.
 */
export function linhasImpressas(a: AmbienteCalculado) {
  return BLOCOS.flatMap((id) =>
    a.blocos[id].linhas
      .filter((l) => l.qnt)
      .map((l) => ({
        titulo: a.blocos[id].titulo,
        nome: l.nome,
        detalhe: DETALHE_INTERNO.has(id) ? "" : l.detalhe,
        qtd: `${l.qnt.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${l.unidade}`,
      })),
  );
}

const hoje = () =>
  new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

/* "Já estou no navegador?" lido como store externa, do mesmo jeito que o
   perfil e o catálogo. Nada nunca muda depois de montar, então a inscrição é
   vazia — o que importa é o servidor devolver `false` e o cliente `true`. */
const semOuvintes = () => () => {};
const noCliente = () => true;
const noServidor = () => false;

export default function Proposta({
  projeto,
  proj,
  comArt,
  modo,
}: {
  projeto: { nome: string; cliente: string; endereco: string };
  proj: ProjetoCalculado;
  /** ART entra no total deste projeto. */
  comArt: boolean;
  /**
   * Para quem é esta impressão.
   *
   * "cliente" é a que sai da loja: ambiente, descritivo e preço. "interna" é
   * a que ela confere, com as quantidades de cada item. Nas palavras dela,
   * "quando envia para o cliente não se manda com quantitativo" — e a
   * proposta imprimia com quantitativo sempre, então não dava para enviar.
   */
  modo: "cliente" | "interna";
}) {
  // O portal só existe depois de montar: no servidor não há `document.body`.
  const montado = useSyncExternalStore(semOuvintes, noCliente, noServidor);
  if (!montado) return null;

  return createPortal(
    <div className="dash-proposta">
      <header className="dash-proposta-topo">
        <div>
          <div className="dash-proposta-marca">TERRACOTA</div>
          <div className="dash-proposta-marca-sub">Móveis Planejados</div>
        </div>
        <div className="dash-proposta-data">
          Proposta comercial
          <br />
          {hoje()}
        </div>
      </header>

      <h1 className="dash-proposta-titulo">{projeto.nome}</h1>
      <div className="dash-proposta-cliente">
        {projeto.cliente}
        {projeto.endereco ? " · " + projeto.endereco : ""}
      </div>

      {proj.ambientes.map((a) => (
        <AmbienteImpresso key={a.id} a={a} comArt={comArt} modo={modo} />
      ))}

      <div className="dash-proposta-total">
        <div>
          <div className="dash-proposta-rot">Valor total</div>
          <div className="dash-proposta-total-num">{brl(totalFinal(proj, comArt))}</div>
          {/* Sem ART não há segunda linha: repetir o mesmo número com um
              rótulo de decomposição só confundiria quem lê. */}
          {comArt && (
            <div className="dash-proposta-obs">
              {brl(proj.total)} + ART (Anotação de Responsabilidade Técnica)
            </div>
          )}
        </div>
      </div>

      <footer className="dash-proposta-rodape">
        Proposta válida por 15 dias. Valores sujeitos a confirmação de medidas em visita técnica.
        Prazo de produção e montagem acordado após a aprovação do projeto executivo.
      </footer>
    </div>,
    document.body,
  );
}

function AmbienteImpresso({
  a,
  comArt,
  modo,
}: {
  a: AmbienteCalculado;
  comArt: boolean;
  modo: "cliente" | "interna";
}) {
  // Só os blocos com lançamento aparecem — ambiente sem acessório não precisa
  // de uma seção "Acessórios" vazia na proposta do cliente.
  const linhas = linhasImpressas(a);

  return (
    <section className="dash-proposta-amb">
      <div className="dash-proposta-amb-topo">
        <h2>{a.nome}</h2>
        <div className="dash-proposta-amb-valor">{brl(totalFinal(a, comArt))}</div>
      </div>
      {linhas.length === 0 ? (
        <div className="dash-proposta-vazio">A detalhar em visita técnica.</div>
      ) : (
        <table className="dash-proposta-tabela">
          <tbody>
            {linhas.map((l, i) => (
              <tr key={i}>
                <td>{l.titulo}</td>
                <td>
                  {l.nome}
                  {l.detalhe && l.detalhe !== l.titulo.toLowerCase() ? (
                    <span className="dash-proposta-det"> · {l.detalhe}</span>
                  ) : null}
                </td>
                {/* A coluna de quantidade só na via interna. */}
                {modo === "interna" && <td className="dash-proposta-qtd">{l.qtd}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
