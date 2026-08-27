"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Armazém de coleção — uma lista que vem do banco.

   Irmão do armazém de documento, para o caso em que o dado não é um objeto
   só (catálogo, roteiro) e sim uma lista que muda com o uso: leads, clientes,
   projetos.

   Mesma escolha de sempre: leitura síncrona por `useSyncExternalStore`, com
   a lista em cache. A diferença é que aqui a escrita **não** é otimista —
   criar cliente ou mover etapa passa pelo banco e só então a lista recarrega.
   Numa lista, um item otimista que depois falha some da tela sem explicação,
   e isso é pior que meio segundo de espera.
   ═════════════════════════════════════════════════════════════════════════ */

import { assinarSessao, lerSessao } from "./sessao";

export type StatusDaColecao = {
  carregando: boolean;
  erro: string | null;
};

const CARREGANDO: StatusDaColecao = { carregando: true, erro: null };
const PRONTO: StatusDaColecao = { carregando: false, erro: null };

export type ArmazemDeColecao<T> = {
  ler: () => T[];
  lerNoServidor: () => T[];
  assinar: (aoMudar: () => void) => () => void;
  lerStatus: () => StatusDaColecao;
  lerStatusNoServidor: () => StatusDaColecao;
  /** Refaz a busca. Devolve quando a lista já está atualizada. */
  recarregar: () => Promise<void>;
  /**
   * Roda uma escrita e recarrega em seguida.
   * Devolve a mensagem de erro, ou `null` se deu certo.
   */
  escrever: (fn: () => Promise<{ error: { message: string } | null }>) => Promise<string | null>;
};

const VAZIO: never[] = [];

export function criarArmazemDeColecao<T>(
  buscar: () => Promise<{ dados: T[] | null; erro: string | null }>,
): ArmazemDeColecao<T> {
  let itens: T[] = VAZIO;
  let status: StatusDaColecao = CARREGANDO;
  const ouvintes = new Set<() => void>();
  let iniciado = false;
  let geracao = 0;

  const avisar = () => ouvintes.forEach((fn) => fn());

  async function recarregar() {
    const minha = ++geracao;
    if (!lerSessao().sessao) {
      // Sem sessão a RLS devolveria vazio; poupa a viagem e limpa o que era
      // da conta anterior.
      itens = VAZIO;
      status = PRONTO;
      avisar();
      return;
    }
    const { dados, erro } = await buscar();
    if (minha !== geracao) return;
    if (erro) {
      status = { carregando: false, erro };
      avisar();
      return;
    }
    itens = dados ?? VAZIO;
    status = PRONTO;
    avisar();
  }

  function iniciar() {
    if (iniciado) return;
    iniciado = true;
    assinarSessao(() => {
      if (lerSessao().carregando) return;
      void recarregar();
    });
    if (!lerSessao().carregando) void recarregar();
  }

  return {
    ler: () => itens,
    lerNoServidor: () => VAZIO,
    assinar(aoMudar) {
      iniciar();
      ouvintes.add(aoMudar);
      return () => ouvintes.delete(aoMudar);
    },
    lerStatus: () => status,
    lerStatusNoServidor: () => CARREGANDO,
    recarregar,
    async escrever(fn) {
      const { error } = await fn();
      if (error) {
        status = { carregando: false, erro: error.message };
        avisar();
        return error.message;
      }
      await recarregar();
      return null;
    },
  };
}
