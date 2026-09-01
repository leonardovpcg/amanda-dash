"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Documentos de configuração — catálogo, roteiro e regras.

   Os três já eram tratados como documento: a tela edita o objeto inteiro, o
   motor carrega o objeto inteiro, ninguém consulta uma cor solta. No banco
   viraram linhas de `configuracoes` com um JSONB, e aqui a troca é só de
   onde vem o texto — de `localStorage` para o Supabase.

   O contrato para quem consome não mudou: continua `useSyncExternalStore`
   com leitura síncrona. Isso importa porque o cálculo do orçamento indexa o
   catálogo por identidade, e uma referência nova a cada render colocaria o
   React em laço.

   A escrita é otimista: o cache muda na hora e a gravação vai atrás. Numa
   tela onde ela digita preço, esperar a rede a cada tecla seria intolerável.
   O que a rede pode fazer é falhar — e aí o erro aparece em vez de sumir.
   ═════════════════════════════════════════════════════════════════════════ */

import { supabase } from "./cliente";
import { assinarSessao, lerSessao } from "./sessao";

export type ChaveDeConfiguracao = "catalogo" | "roteiro" | "regras" | "perfil" | "proposta";

export type StatusDoArmazem = {
  /** `true` até a primeira resposta do banco. */
  carregando: boolean;
  /** Mensagem da última falha de gravação, ou `null`. */
  erro: string | null;
};

export type ArmazemDeDocumento<T> = {
  ler: () => T;
  lerNoServidor: () => T;
  assinar: (aoMudar: () => void) => () => void;
  guardar: (valor: T) => void;
  restaurar: () => void;
  /** `true` quando o valor em uso não é mais o padrão de fábrica. */
  foiEditado: (valor: T) => boolean;
  lerStatus: () => StatusDoArmazem;
  lerStatusNoServidor: () => StatusDoArmazem;
  assinarStatus: (aoMudar: () => void) => () => void;
};

const CARREGANDO: StatusDoArmazem = { carregando: true, erro: null };
const PRONTO: StatusDoArmazem = { carregando: false, erro: null };

export function criarArmazemDeDocumento<T>(
  chave: ChaveDeConfiguracao,
  padrao: T,
  interpretar: (bruto: unknown) => T,
): ArmazemDeDocumento<T> {
  let valor: T = padrao;
  let status: StatusDoArmazem = CARREGANDO;
  const ouvintes = new Set<() => void>();
  let iniciado = false;
  /** Descarta resposta de uma busca que já foi superada por outra. */
  let geracao = 0;

  const avisar = () => ouvintes.forEach((fn) => fn());

  const definirStatus = (novo: StatusDoArmazem) => {
    if (status.carregando === novo.carregando && status.erro === novo.erro) return;
    status = novo;
    avisar();
  };

  async function buscar() {
    const minhaGeracao = ++geracao;
    if (!supabase || !lerSessao().sessao) {
      // Sem sessão não há o que ler: a RLS devolveria vazio de qualquer jeito.
      valor = padrao;
      definirStatus(PRONTO);
      avisar();
      return;
    }
    const { data, error } = await supabase
      .from("configuracoes")
      .select("valor")
      .eq("chave", chave)
      .maybeSingle();

    if (minhaGeracao !== geracao) return;

    if (error) {
      definirStatus({ carregando: false, erro: "Não foi possível carregar: " + error.message });
      return;
    }
    // Linha ausente é estado normal: significa "nunca editou, vale o padrão".
    valor = data ? interpretar(data.valor) : padrao;
    definirStatus(PRONTO);
    avisar();
  }

  function iniciar() {
    if (iniciado) return;
    iniciado = true;
    // Refaz a busca a cada troca de sessão: entrar carrega, sair devolve ao
    // padrão em vez de deixar na tela o que era da conta anterior.
    assinarSessao(() => {
      if (lerSessao().carregando) return;
      void buscar();
    });
    if (!lerSessao().carregando) void buscar();
  }

  return {
    ler: () => valor,
    lerNoServidor: () => padrao,
    assinar(aoMudar) {
      iniciar();
      ouvintes.add(aoMudar);
      return () => ouvintes.delete(aoMudar);
    },

    guardar(novo) {
      valor = novo;
      definirStatus(PRONTO);
      avisar();

      const dono = lerSessao().sessao?.user.id;
      if (!supabase || !dono) return;
      void supabase
        .from("configuracoes")
        // `dono` explícito e não só pelo default: o default `auth.uid()` só
        // resolve dentro de uma sessão, e nomear a coluna é o que faz o
        // upsert casar com a chave primária (dono, chave).
        .upsert({ dono, chave, valor: novo }, { onConflict: "dono,chave" })
        .then(({ error }) => {
          if (error) definirStatus({ carregando: false, erro: "Não foi possível salvar: " + error.message });
        });
    },

    restaurar() {
      valor = padrao;
      definirStatus(PRONTO);
      avisar();

      const dono = lerSessao().sessao?.user.id;
      if (!supabase || !dono) return;
      // Apagar a linha, em vez de gravar o padrão: assim "nunca editou" e
      // "editou de volta para o padrão" continuam sendo o mesmo estado.
      void supabase
        .from("configuracoes")
        .delete()
        .eq("chave", chave)
        .then(({ error }) => {
          if (error) definirStatus({ carregando: false, erro: "Não foi possível restaurar: " + error.message });
        });
    },

    foiEditado: (v) => v !== padrao,
    lerStatus: () => status,
    lerStatusNoServidor: () => CARREGANDO,
    assinarStatus(aoMudar) {
      iniciar();
      ouvintes.add(aoMudar);
      return () => ouvintes.delete(aoMudar);
    },
  };
}
