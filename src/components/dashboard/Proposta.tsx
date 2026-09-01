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
import type {
  AmbienteCalculado,
  BlocoId,
  OrcamentoAmbiente,
  ProjetoCalculado,
} from "@/lib/orcamento/tipos";
import {
  assinarModelo,
  lerModelo,
  lerModeloNoServidor,
  type ModeloDaProposta,
} from "@/lib/proposta/modelo";

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
  ambientes,
  comArt,
  modo,
}: {
  projeto: { nome: string; cliente: string; endereco: string };
  proj: ProjetoCalculado;
  /** Os ambientes crus: é neles que mora o descritivo que o cliente lê. */
  ambientes: OrcamentoAmbiente[];
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
  const modelo = useSyncExternalStore(assinarModelo, lerModelo, lerModeloNoServidor);
  // O portal só existe depois de montar: no servidor não há `document.body`.
  const montado = useSyncExternalStore(semOuvintes, noCliente, noServidor);
  if (!montado) return null;
  const paraCliente = modo === "cliente";

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

      {paraCliente && modelo.empresa.trim() && (
        <p className="dash-proposta-empresa">{modelo.empresa}</p>
      )}

      {proj.ambientes.map((a) =>
        paraCliente ? (
          <AmbienteDoCliente
            key={a.id}
            a={a}
            bruto={ambientes.find((x) => x.id === a.id)}
            modelo={modelo}
            comArt={comArt}
          />
        ) : (
          <AmbienteImpresso key={a.id} a={a} comArt={comArt} modo={modo} />
        ),
      )}

      {paraCliente ? (
        <Fechamento modelo={modelo} proj={proj} comArt={comArt} />
      ) : (
        <>
          <div className="dash-proposta-total">
            <div>
              <div className="dash-proposta-rot">Valor total</div>
              <div className="dash-proposta-total-num">{brl(totalFinal(proj, comArt))}</div>
              {/* Sem ART não há segunda linha: repetir o mesmo número com um
                  rótulo de decomposição só confundiria quem lê. */}
              {comArt && (
                <div className="dash-proposta-obs-art">
                  {brl(proj.total)} + ART (Anotação de Responsabilidade Técnica)
                </div>
              )}
            </div>
          </div>

          <footer className="dash-proposta-rodape">
            Conferência interna · custo, markup e quantidades não saem na via do cliente.
          </footer>
        </>
      )}
    </div>,
    document.body,
  );
}

export function AmbienteImpresso({
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

/**
 * Um ambiente na via do cliente.
 *
 * Quatro blocos em prosa, como na proposta que ela envia hoje: os módulos que
 * ela descreve, a especificação de material, as ferragens (do modelo, porque
 * não mudam) e os acessórios. **Nenhum deles é a lista do orçamento** — era
 * ela que aparecia aqui antes, sem preço, e não é o que se manda ao cliente.
 *
 * O descritivo é quebrado por linha: ela escreve um módulo por linha na
 * caixinha do ambiente, e a proposta imprime como lista.
 */
export function AmbienteDoCliente({
  a,
  bruto,
  modelo,
  comArt,
}: {
  a: AmbienteCalculado;
  bruto: OrcamentoAmbiente | undefined;
  modelo: ModeloDaProposta;
  comArt: boolean;
}) {
  const itens = (bruto?.descritivo ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const blocos: [string, string][] = [
    ["Material", (bruto?.material ?? "").trim()],
    ["Ferragens", modelo.ferragens.trim()],
    ["Acessórios", (bruto?.acessoriosTexto ?? "").trim()],
  ];

  return (
    <section className="dash-proposta-amb">
      <div className="dash-proposta-amb-topo">
        <h2>{a.nome}</h2>
        <div className="dash-proposta-amb-valor">{brl(totalFinal(a, comArt))}</div>
      </div>

      {itens.length > 0 ? (
        <>
          <div className="dash-proposta-rot-bloco">Itens</div>
          <ul className="dash-proposta-itens">
            {itens.map((linha, i) => (
              <li key={i}>{linha}</li>
            ))}
          </ul>
        </>
      ) : (
        <div className="dash-proposta-vazio">
          Descritivo a preencher no cartão do ambiente.
        </div>
      )}

      {/* Bloco sem texto não vira título órfão: a proposta é o que o cliente
          lê, e "Acessórios" com nada embaixo parece esquecimento. */}
      {blocos
        .filter(([, texto]) => texto)
        .map(([rotulo, texto]) => (
          <div key={rotulo} className="dash-proposta-espec">
            <span className="dash-proposta-rot-bloco">{rotulo}</span>
            <span>{texto}</span>
          </div>
        ))}
    </section>
  );
}

/** A página de condições e o fecho — o que vem depois dos ambientes. */
function Fechamento({
  modelo,
  proj,
  comArt,
}: {
  modelo: ModeloDaProposta;
  proj: ProjetoCalculado;
  comArt: boolean;
}) {
  const condicoes: [string, string][] = [
    ["Forma de pagamento", modelo.pagamento.trim()],
    ["Garantia", modelo.garantia.trim()],
    ["Prazo de entrega", modelo.prazo.trim()],
  ];
  const observacoes = modelo.observacoes.map((o) => o.trim()).filter(Boolean);

  return (
    <section className="dash-proposta-fecho">
      {observacoes.length > 0 && (
        <ol className="dash-proposta-obs">
          {observacoes.map((o, i) => (
            <li key={i}>{o}</li>
          ))}
        </ol>
      )}

      {condicoes
        .filter(([, texto]) => texto)
        .map(([rotulo, texto]) => (
          <div key={rotulo} className="dash-proposta-espec">
            <span className="dash-proposta-rot-bloco">{rotulo}</span>
            <span>{texto}</span>
          </div>
        ))}

      <div className="dash-proposta-total">
        <div>
          <div className="dash-proposta-rot">Valor total</div>
          <div className="dash-proposta-total-num">{brl(totalFinal(proj, comArt))}</div>
          {comArt && (
            <div className="dash-proposta-obs-art">
              {brl(proj.total)} + ART (Anotação de Responsabilidade Técnica)
            </div>
          )}
        </div>
      </div>

      {modelo.despedida.trim() && (
        <p className="dash-proposta-despedida">{modelo.despedida}</p>
      )}

      <div className="dash-proposta-assina">
        {[modelo.proprietario, modelo.consultora].filter((n) => n.trim()).map((nome, i) => (
          <div key={i}>
            <div className="dash-proposta-linha-assina" />
            <div>{nome}</div>
            <div className="dash-proposta-papel">{i === 0 ? "Proprietário" : "Consultora"}</div>
          </div>
        ))}
      </div>

      {modelo.contato.trim() && (
        <div className="dash-proposta-contato">{modelo.contato}</div>
      )}
    </section>
  );
}
