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
import { SimboloTerracota } from "./LogoTerracota";
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

/** Texto de proposta partido em linhas, sem as vazias nem os espaços à toa. */
function emLinhas(texto: string): string[] {
  return texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Uma categoria: o rótulo na coluna da esquerda, uma linha por item. */
function Bloco({ rotulo, linhas }: { rotulo: string; linhas: string[] }) {
  return (
    <div className="dash-proposta-espec">
      <span className="dash-proposta-rot-bloco">{rotulo}</span>
      <ul className="dash-proposta-itens">
        {linhas.map((linha, i) => (
          <li key={i}>{linha}</li>
        ))}
      </ul>
    </div>
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

  return createPortal(
    <CorpoDaProposta
      projeto={projeto}
      proj={proj}
      ambientes={ambientes}
      modelo={modelo}
      comArt={comArt}
      modo={modo}
    />,
    document.body,
  );
}

/**
 * O documento em si, sem o portal nem a leitura do armazém.
 *
 * Separado para poder ser montado fora do navegador — é o que permite provar
 * o que sai impresso sem depender de uma sessão aberta.
 */
export function CorpoDaProposta({
  projeto,
  proj,
  ambientes,
  modelo,
  comArt,
  modo,
}: {
  projeto: { nome: string; cliente: string; endereco: string };
  proj: ProjetoCalculado;
  ambientes: OrcamentoAmbiente[];
  modelo: ModeloDaProposta;
  comArt: boolean;
  modo: "cliente" | "interna";
}) {
  const paraCliente = modo === "cliente";

  return (
    <div className="dash-proposta">
      <header className="dash-proposta-topo">
        <div className="dash-proposta-marca-bloco">
          <SimboloTerracota size={40} />
          <div>
            <div className="dash-proposta-marca">TERRACOTA</div>
            <div className="dash-proposta-marca-sub">Móveis Planejados</div>
          </div>
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
    </div>
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
  /* Os quatro blocos na mesma grade rótulo → conteúdo, e **todos** quebrados
     por linha. Antes só Itens era: Material e Acessórios saíam num parágrafo
     corrido, e dois acessórios encostavam um no outro sem nada entre eles —
     "…separação de resíduos - Tramontina Puxador Seixo P Gold - Zen" não tem
     onde o leitor saiba que um acabou e o outro começou.

     Categoria de uma linha só continua saindo como sempre: uma lista de um
     item é indistinguível de uma linha de texto. */
  const blocos: [string, string[]][] = [];
  for (const [rotulo, texto] of [
    ["Itens", bruto?.descritivo ?? ""],
    ["Material", bruto?.material ?? ""],
    // A do ambiente ganha da do modelo; vazio cai no padrão da loja.
    ["Ferragens", (bruto?.ferragens ?? "").trim() || modelo.ferragens],
    ["Acessórios", bruto?.acessoriosTexto ?? ""],
  ] as const) {
    const linhas = emLinhas(texto);
    // Bloco sem texto não vira rótulo órfão: a proposta é o que o cliente lê,
    // e "Acessórios" com nada embaixo parece esquecimento.
    if (linhas.length > 0) blocos.push([rotulo, linhas]);
  }

  return (
    <section className="dash-proposta-amb">
      <div className="dash-proposta-amb-topo">
        <h2>{a.nome}</h2>
        <div className="dash-proposta-amb-valor">{brl(totalFinal(a, comArt))}</div>
      </div>

      {blocos.length === 0 ? (
        <div className="dash-proposta-vazio">
          Descritivo a preencher no cartão do ambiente.
        </div>
      ) : (
        blocos.map(([rotulo, linhas]) => (
          <Bloco key={rotulo} rotulo={rotulo} linhas={linhas} />
        ))
      )}
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
    // "Prazo de entrega" fala do móvel pronto na obra; validade fala da
    // proposta em si — dois prazos diferentes, um embaixo do outro na mesma
    // página como ela pediu.
    ["Validade da proposta", modelo.validade.trim()],
  ];
  const observacoes = modelo.observacoes.map((o) => o.trim()).filter(Boolean);

  return (
    <section className="dash-proposta-fecho">
      <h2>Condições comerciais</h2>

      {/* Mesma marcação dos outros blocos — `dash-proposta-itens`, com o
          número na frente do texto em vez de vir do `<ol>`. A `<ol>` trazia
          a numeração num recuo próprio, com cor e tamanho diferentes; a lista
          padrão do documento não tem esse recuo, então as observações
          destoavam do resto. */}
      {observacoes.length > 0 && (
        <div className="dash-proposta-espec">
          <span className="dash-proposta-rot-bloco">Observações</span>
          <ul className="dash-proposta-itens">
            {observacoes.map((o, i) => (
              <li key={i}>
                {i + 1}. {o}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* O fecho passa pelo mesmo caminho: condição de várias linhas também
          sai uma por linha, e no mesmo alinhamento dos ambientes. */}
      {condicoes
        .map(([rotulo, texto]) => [rotulo, emLinhas(texto)] as const)
        .filter(([, linhas]) => linhas.length > 0)
        .map(([rotulo, linhas]) => (
          <Bloco key={rotulo} rotulo={rotulo} linhas={linhas} />
        ))}

      {/* Só o número, com ou sem ART. `totalFinal` já embute a ART quando ela
          está ligada — a linha "R$ X + ART" embaixo abria a conta para o
          cliente, que é justamente o que a proposta não faz. A decomposição
          continua na via interna, que é onde ela confere. */}
      <div className="dash-proposta-total">
        <div>
          <div className="dash-proposta-rot">Valor total</div>
          <div className="dash-proposta-total-num">{brl(totalFinal(proj, comArt))}</div>
        </div>
      </div>

      {modelo.despedida.trim() && (
        <p className="dash-proposta-despedida">{modelo.despedida}</p>
      )}

      <div className="dash-proposta-assina">
        {(
          [
            [modelo.proprietario, "Proprietário", modelo.telefoneProprietario],
            [modelo.consultora, "Consultora", modelo.telefoneConsultora],
          ] as const
        )
          .filter(([nome]) => nome.trim())
          .map(([nome, papel, telefone]) => (
            <div key={papel} className="dash-proposta-cartao">
              <div className="dash-proposta-papel">{papel}</div>
              <div className="dash-proposta-nome">{nome}</div>
              {telefone.trim() && <div className="dash-proposta-tel">{telefone}</div>}
            </div>
          ))}
      </div>

      {modelo.contato.trim() && (
        <div className="dash-proposta-contato">{modelo.contato}</div>
      )}
    </section>
  );
}
