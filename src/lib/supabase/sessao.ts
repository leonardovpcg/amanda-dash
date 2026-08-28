"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Sessão — quem está logado.

   Lida como store externa, igual ao perfil e ao catálogo. A escuta é iniciada
   preguiçosamente na primeira inscrição: efeito não roda no servidor, então
   isso garante que nada toque em armazenamento do navegador durante a
   renderização no Node.
   ═════════════════════════════════════════════════════════════════════════ */

import type { Session } from "@supabase/supabase-js";
import { supabase } from "./cliente";

export type EstadoDaSessao = {
  sessao: Session | null;
  /** `true` até a primeira resposta do Supabase. Sem isso a tela pisca o
   *  login antes de descobrir que já havia sessão guardada. */
  carregando: boolean;
  /**
   * Ela chegou pelo link de recuperação de senha.
   *
   * Precisa de bandeira própria porque o link **abre uma sessão válida**: sem
   * isso o app mostraria o dashboard e ela nunca chegaria a trocar a senha —
   * entraria com o link e continuaria sem saber a senha nova.
   */
  recuperando: boolean;
};

const SEM_SESSAO: EstadoDaSessao = { sessao: null, carregando: true, recuperando: false };
const DESCONECTADO: EstadoDaSessao = { sessao: null, carregando: false, recuperando: false };

let estado: EstadoDaSessao = SEM_SESSAO;
const ouvintes = new Set<() => void>();
let iniciado = false;

function avisar() {
  ouvintes.forEach((fn) => fn());
}

function definir(sessao: Session | null, recuperando = estado.recuperando) {
  // Mesma referência quando nada muda: o React entra em laço se o snapshot
  // trocar de identidade a cada render.
  if (
    !estado.carregando &&
    estado.sessao?.access_token === sessao?.access_token &&
    estado.recuperando === recuperando
  ) {
    return;
  }
  estado = sessao
    ? { sessao, carregando: false, recuperando }
    : recuperando
      ? { sessao: null, carregando: false, recuperando }
      : DESCONECTADO;
  avisar();
}

function iniciar() {
  if (iniciado) return;
  iniciado = true;
  if (!supabase) {
    estado = DESCONECTADO;
    return;
  }
  supabase.auth.getSession().then(({ data }) => definir(data.session));
  supabase.auth.onAuthStateChange((evento, sessao) => {
    // `PASSWORD_RECOVERY` chega junto com a sessão criada pelo link do e-mail.
    // Sair da recuperação é decisão da tela, quando a senha nova for gravada.
    definir(sessao, evento === "PASSWORD_RECOVERY" ? true : estado.recuperando);
  });
}

export function assinarSessao(aoMudar: () => void): () => void {
  iniciar();
  ouvintes.add(aoMudar);
  return () => ouvintes.delete(aoMudar);
}

export function lerSessao(): EstadoDaSessao {
  // Sem Supabase configurado não há o que esperar: devolver "carregando" aqui
  // prenderia a tela num "abrindo…" eterno, porque o React lê o snapshot antes
  // de assinar e nada mais o acordaria.
  if (!supabase) return DESCONECTADO;
  return estado;
}

/** No servidor ninguém está logado, e ainda estamos "carregando". */
export function lerSessaoNoServidor(): EstadoDaSessao {
  return SEM_SESSAO;
}

export async function entrar(email: string, senha: string): Promise<string | null> {
  if (!supabase) return "Supabase não configurado.";
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (!error) return null;
  // A mensagem do SDK vem em inglês e genérica de propósito (não revela se o
  // e-mail existe). Traduzida, mas sem acrescentar informação que ela esconde.
  return error.message === "Invalid login credentials"
    ? "E-mail ou senha não conferem."
    : error.message;
}

export async function sair(): Promise<void> {
  await supabase?.auth.signOut();
}

/**
 * Manda o e-mail com o link de recuperação.
 *
 * A resposta é a mesma para e-mail cadastrado e não cadastrado, de propósito:
 * uma tela que diz "esse e-mail não existe" conta a estranhos quem tem conta.
 * Por isso a mensagem de sucesso é "se existe conta, o link foi enviado".
 *
 * `redirectTo` precisa estar na lista de URLs permitidas do painel do Supabase
 * (Authentication › URL Configuration). Sem isso o link do e-mail cai no site
 * padrão e a troca de senha não acontece.
 */
export async function recuperarSenha(email: string): Promise<string | null> {
  if (!supabase) return "Supabase não configurado.";
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: window.location.origin,
  });
  return error ? error.message : null;
}

/** Grava a senha nova e encerra o modo de recuperação. */
export async function trocarSenha(nova: string): Promise<string | null> {
  if (!supabase) return "Supabase não configurado.";
  const { error } = await supabase.auth.updateUser({ password: nova });
  if (error) {
    return error.message === "New password should be different from the old password."
      ? "A senha nova precisa ser diferente da atual."
      : error.message;
  }
  const { data } = await supabase.auth.getSession();
  definir(data.session, false);
  return null;
}
