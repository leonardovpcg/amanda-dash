"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Porta de entrada.

   As policies do banco são `to authenticated` com `dono = auth.uid()`: sem
   sessão o dashboard não lê nem grava nada. Então a autenticação não é um
   enfeite que dá para deixar para depois — é pré-requisito de o app
   funcionar.

   O estado de "carregando" existe para a tela não piscar o login antes de
   descobrir que já havia sessão guardada, que é o caso comum de quem abre o
   dashboard todo dia.
   ═════════════════════════════════════════════════════════════════════════ */

import { useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { AVISO_SEM_SUPABASE, supabaseConfigurado } from "@/lib/supabase/cliente";
import { assinarSessao, entrar, lerSessao, lerSessaoNoServidor } from "@/lib/supabase/sessao";
import LogoTerracota from "./LogoTerracota";
import { MONO, mono, panel } from "./ui";

export default function PortaDeEntrada({ children }: { children: ReactNode }) {
  const { sessao, carregando } = useSyncExternalStore(
    assinarSessao,
    lerSessao,
    lerSessaoNoServidor,
  );

  if (carregando) return <Esperando />;
  if (!sessao) return <Entrar />;
  return <>{children}</>;
}

/** Fundo comum das duas telas, para não piscar cor entre uma e outra. */
function Fundo({ children }: { children: ReactNode }) {
  return (
    <div
      className="dash-root"
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      {children}
    </div>
  );
}

function Esperando() {
  return (
    <Fundo>
      <div style={{ ...mono(11, "#8C887C", { ls: "0.08em", upper: true }) }}>abrindo…</div>
    </Fundo>
  );
}

function Entrar() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    setErro(null);
    setEnviando(true);
    const falha = await entrar(email.trim(), senha);
    setEnviando(false);
    // Sucesso não precisa de tratamento: a mudança de sessão derruba esta
    // tela sozinha, porque o dashboard escuta a store.
    if (falha) setErro(falha);
  };

  return (
    <Fundo>
      <div style={{ ...panel, padding: "34px 32px", width: "100%", maxWidth: 380 }}>
        <LogoTerracota />

        <h1
          style={{
            fontSize: "21px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            margin: "26px 0 0",
          }}
        >
          Entrar
        </h1>
        <p style={{ fontSize: "13px", color: "#6E6A5F", margin: "6px 0 0", lineHeight: 1.5 }}>
          O dashboard só abre com a conta: os dados são privados e o banco não
          entrega nada sem ela.
        </p>

        {!supabaseConfigurado ? (
          <div
            style={{
              marginTop: 22,
              padding: "14px 16px",
              borderRadius: 14,
              background: "#FAEAE7",
              border: "1px solid #F1D6D1",
              fontSize: "12.5px",
              color: "#9C2B22",
              lineHeight: 1.5,
            }}
          >
            {AVISO_SEM_SUPABASE}
          </div>
        ) : (
          <form onSubmit={enviar} style={{ marginTop: 22 }}>
            <label style={mono(10, "#9A9689", { ls: "0.08em", upper: true })} htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              className="dash-field"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", marginTop: 7 }}
            />

            <label
              style={{ ...mono(10, "#9A9689", { ls: "0.08em", upper: true }), display: "block", marginTop: 16 }}
              htmlFor="senha"
            >
              Senha
            </label>
            <input
              id="senha"
              className="dash-field"
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              style={{ width: "100%", marginTop: 7 }}
            />

            {erro && (
              <div
                role="alert"
                style={{ fontFamily: MONO, fontSize: "11.5px", color: "#9C2B22", marginTop: 14, lineHeight: 1.5 }}
              >
                {erro}
              </div>
            )}

            <button
              type="submit"
              className="dash-btn-terra"
              disabled={enviando}
              style={{
                width: "100%",
                marginTop: 22,
                borderRadius: 999,
                padding: "13px 20px",
                fontSize: "13.5px",
                opacity: enviando ? 0.6 : 1,
              }}
            >
              {enviando ? "Entrando…" : "Entrar"}
            </button>
          </form>
        )}
      </div>
    </Fundo>
  );
}
