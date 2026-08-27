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
};

const SEM_SESSAO: EstadoDaSessao = { sessao: null, carregando: true };
const DESCONECTADO: EstadoDaSessao = { sessao: null, carregando: false };

let estado: EstadoDaSessao = SEM_SESSAO;
const ouvintes = new Set<() => void>();
let iniciado = false;

function avisar() {
  ouvintes.forEach((fn) => fn());
}

function definir(sessao: Session | null) {
  // Mesma referência quando nada muda: o React entra em laço se o snapshot
  // trocar de identidade a cada render.
  if (!estado.carregando && estado.sessao?.access_token === sessao?.access_token) return;
  estado = sessao ? { sessao, carregando: false } : DESCONECTADO;
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
  supabase.auth.onAuthStateChange((_evento, sessao) => definir(sessao));
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
