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
import type { AmbienteCalculado, BlocoId, ProjetoCalculado } from "@/lib/orcamento/tipos";

const BLOCOS: BlocoId[] = ["chapas", "fita", "acessorios", "maoDeObra"];

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
}: {
  projeto: { nome: string; cliente: string; endereco: string };
  proj: ProjetoCalculado;
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
        <AmbienteImpresso key={a.id} a={a} />
      ))}

      <div className="dash-proposta-total">
        <div>
          <div className="dash-proposta-rot">Valor total</div>
          <div className="dash-proposta-total-num">{brl(proj.totalComArt)}</div>
          <div className="dash-proposta-obs">
            {brl(proj.total)} + ART (Anotação de Responsabilidade Técnica)
          </div>
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

function AmbienteImpresso({ a }: { a: AmbienteCalculado }) {
  // Só os blocos com lançamento aparecem — ambiente sem acessório não precisa
  // de uma seção "Acessórios" vazia na proposta do cliente.
  const linhas = BLOCOS.flatMap((id) =>
    a.blocos[id].linhas
      .filter((l) => l.qnt)
      .map((l) => ({
        titulo: a.blocos[id].titulo,
        nome: l.nome,
        // O detalhe da mão de obra guarda o markup ("markup 3×", "preço
        // fechado") — conversa interna, não entra na proposta do cliente.
        detalhe: id === "maoDeObra" ? "" : l.detalhe,
        qtd: `${l.qnt.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${l.unidade}`,
      })),
  );

  return (
    <section className="dash-proposta-amb">
      <div className="dash-proposta-amb-topo">
        <h2>{a.nome}</h2>
        <div className="dash-proposta-amb-valor">{brl(a.totalComArt)}</div>
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
                <td className="dash-proposta-qtd">{l.qtd}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
