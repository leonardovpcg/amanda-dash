/* ═══════════════════════════════════════════════════════════════════════════
   Cliente do Supabase.

   Um só, no navegador. O dashboard inteiro é componente de cliente e não faz
   busca no servidor, então não há necessidade de `@supabase/ssr`, cookies
   nem middleware — a sessão vive no localStorage e o próprio SDK a renova.

   A chave anônima é pública por natureza: o Next embute qualquer
   `NEXT_PUBLIC_*` no bundle. Quem protege os dados é a RLS, e é por isso que
   toda tabela do schema tem policy `dono = auth.uid()`.
   ═════════════════════════════════════════════════════════════════════════ */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * `null` quando as variáveis não estão configuradas.
 *
 * Devolver null em vez de estourar é deliberado: sem isso, clonar o
 * repositório e rodar `npm run dev` sem `.env.local` dá tela branca sem
 * explicação. Assim o app abre, avisa o que falta e continua funcionando com
 * os padrões locais.
 */
export const supabase: SupabaseClient | null =
  url && chave
    ? createClient(url, chave, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // Ela abre o dashboard todo dia; expirar a sessão por inatividade
          // só criaria atrito num app de uso pessoal.
          detectSessionInUrl: true,
        },
      })
    : null;

export const supabaseConfigurado = supabase !== null;

/** Mensagem única para quando falta configuração, para não repetir texto. */
export const AVISO_SEM_SUPABASE =
  "Supabase não configurado: copie .env.example para .env.local e preencha as duas variáveis.";
