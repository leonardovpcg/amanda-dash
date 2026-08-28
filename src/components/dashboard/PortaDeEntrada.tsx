"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Porta de entrada.

   As policies do banco são `to authenticated` com `dono = auth.uid()`: sem
   sessão o dashboard não lê nem grava nada. Então a autenticação não é um
   enfeite que dá para deixar para depois — é pré-requisito de o app
   funcionar.

   Não há cadastro aqui, e é decisão: a conta é criada no painel do Supabase.
   Um formulário de "criar conta" num app de uso individual só serviria para
   estranho tentar entrar.

   O estado de "carregando" existe para a tela não piscar o login antes de
   descobrir que já havia sessão guardada, que é o caso comum de quem abre o
   dashboard todo dia.
   ═════════════════════════════════════════════════════════════════════════ */

import { useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { AVISO_SEM_SUPABASE, supabaseConfigurado } from "@/lib/supabase/cliente";
import {
  assinarSessao,
  entrar,
  lerSessao,
  lerSessaoNoServidor,
  recuperarSenha,
  trocarSenha,
} from "@/lib/supabase/sessao";
import { SimboloTerracota } from "./LogoTerracota";
import { MONO, mono } from "./ui";

export default function PortaDeEntrada({ children }: { children: ReactNode }) {
  const { sessao, carregando, recuperando } = useSyncExternalStore(
    assinarSessao,
    lerSessao,
    lerSessaoNoServidor,
  );

  if (carregando) return <Esperando />;
  // A recuperação vem antes da sessão de propósito: o link do e-mail já loga,
  // e sem esta ordem ela cairia no dashboard sem nunca trocar a senha.
  if (recuperando) return <NovaSenha />;
  if (!sessao) return <Entrar />;
  return <>{children}</>;
}

/** Fundo comum de todas as telas, para não piscar cor entre uma e outra. */
function Fundo({ children }: { children: ReactNode }) {
  return (
    <div className="dash-root dash-porta">
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

/** A marca empilhada e centralizada — o cartão é estreito e tem só uma coluna. */
function Marca() {
  return (
    <div className="dash-porta-marca">
      <SimboloTerracota size={46} />
      <div className="dash-porta-nome">TERRACOTA</div>
      <div className="dash-porta-tag">Móveis Planejados</div>
    </div>
  );
}

function Rotulo({ children, htmlFor }: { children: ReactNode; htmlFor: string }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{ ...mono(10, "#9A9689", { ls: "0.08em", upper: true }), display: "block" }}
    >
      {children}
    </label>
  );
}

function Recado({ texto, tom }: { texto: string; tom: "erro" | "ok" }) {
  return (
    <div
      role={tom === "erro" ? "alert" : "status"}
      style={{
        fontFamily: MONO,
        fontSize: "11.5px",
        color: tom === "erro" ? "#9C2B22" : "#6B7040",
        marginTop: 14,
        lineHeight: 1.5,
      }}
    >
      {texto}
    </div>
  );
}

function SemBanco() {
  return (
    <Fundo>
      <div className="dash-porta-cartao">
        <Marca />
        <div
          style={{
            marginTop: 26,
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
      </div>
    </Fundo>
  );
}

function Entrar() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [esqueceu, setEsqueceu] = useState(false);

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

  if (!supabaseConfigurado) return <SemBanco />;
  // O e-mail já digitado viaja para a recuperação: ela não redigita.
  if (esqueceu) return <Recuperar emailInicial={email} onVoltar={() => setEsqueceu(false)} />;

  return (
    <Fundo>
      <div className="dash-porta-cartao">
        <Marca />

        <form onSubmit={enviar} style={{ marginTop: 30 }}>
          <Rotulo htmlFor="email">E-mail</Rotulo>
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

          <div style={{ marginTop: 16 }}>
            <Rotulo htmlFor="senha">Senha</Rotulo>
          </div>
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

          {erro && <Recado texto={erro} tom="erro" />}

          <button
            type="submit"
            className="dash-btn-terra"
            disabled={enviando}
            style={{
              width: "100%",
              marginTop: 24,
              borderRadius: 999,
              padding: "14px 20px",
              fontSize: "13.5px",
              opacity: enviando ? 0.6 : 1,
            }}
          >
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 18 }}>
          <button
            className="dash-btn-link"
            onClick={() => setEsqueceu(true)}
            style={{ fontSize: "12.5px", color: "#6E6A5F" }}
          >
            Esqueci minha senha
          </button>
        </div>
      </div>
    </Fundo>
  );
}

/** Pede o e-mail e dispara o link de recuperação. */
function Recuperar({
  emailInicial,
  onVoltar,
}: {
  emailInicial: string;
  onVoltar: () => void;
}) {
  const [email, setEmail] = useState(emailInicial);
  const [estado, setEstado] = useState<"formulario" | "enviado">("formulario");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    setErro(null);
    setEnviando(true);
    const falha = await recuperarSenha(email);
    setEnviando(false);
    if (falha) setErro(falha);
    else setEstado("enviado");
  };

  return (
    <Fundo>
      <div className="dash-porta-cartao">
        <Marca />

        <h1 className="dash-porta-titulo">Recuperar senha</h1>

        {estado === "enviado" ? (
          <>
            <p className="dash-porta-texto">
              Se existe conta com esse e-mail, o link de recuperação já está a caminho. Ele abre
              o dashboard direto na tela de senha nova.
            </p>
            <button
              className="dash-btn-outline"
              onClick={onVoltar}
              style={{
                width: "100%",
                marginTop: 24,
                borderRadius: 999,
                padding: "13px 20px",
                fontSize: "13px",
              }}
            >
              Voltar para entrar
            </button>
          </>
        ) : (
          <form onSubmit={enviar} style={{ marginTop: 22 }}>
            <Rotulo htmlFor="email-recuperar">E-mail da conta</Rotulo>
            <input
              id="email-recuperar"
              className="dash-field"
              type="email"
              autoComplete="username"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", marginTop: 7 }}
            />

            {erro && <Recado texto={erro} tom="erro" />}

            <button
              type="submit"
              className="dash-btn-terra"
              disabled={enviando}
              style={{
                width: "100%",
                marginTop: 24,
                borderRadius: 999,
                padding: "14px 20px",
                fontSize: "13.5px",
                opacity: enviando ? 0.6 : 1,
              }}
            >
              {enviando ? "Enviando…" : "Enviar link"}
            </button>

            <div style={{ textAlign: "center", marginTop: 18 }}>
              <button
                type="button"
                className="dash-btn-link"
                onClick={onVoltar}
                style={{ fontSize: "12.5px", color: "#6E6A5F" }}
              >
                Voltar
              </button>
            </div>
          </form>
        )}
      </div>
    </Fundo>
  );
}

/** Depois do link do e-mail: grava a senha nova antes de liberar o dashboard. */
function NovaSenha() {
  const [senha, setSenha] = useState("");
  const [repetida, setRepetida] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    // Conferidas aqui as duas regras que o Supabase não checa do jeito que
    // ajuda: a repetição e um mínimo que não seja ridículo.
    if (senha.length < 8) {
      setErro("A senha precisa de pelo menos 8 caracteres.");
      return;
    }
    if (senha !== repetida) {
      setErro("As duas senhas não conferem.");
      return;
    }
    setErro(null);
    setEnviando(true);
    const falha = await trocarSenha(senha);
    setEnviando(false);
    // Sucesso derruba a tela: a store sai do modo de recuperação e o
    // dashboard aparece, já logada.
    if (falha) setErro(falha);
  };

  return (
    <Fundo>
      <div className="dash-porta-cartao">
        <Marca />

        <h1 className="dash-porta-titulo">Nova senha</h1>
        <p className="dash-porta-texto">
          Escolha a senha que vai usar daqui em diante. Você já está entrando por este link.
        </p>

        <form onSubmit={enviar} style={{ marginTop: 22 }}>
          <Rotulo htmlFor="nova">Senha nova</Rotulo>
          <input
            id="nova"
            className="dash-field"
            type="password"
            autoComplete="new-password"
            required
            autoFocus
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={{ width: "100%", marginTop: 7 }}
          />

          <div style={{ marginTop: 16 }}>
            <Rotulo htmlFor="repetida">Repita a senha</Rotulo>
          </div>
          <input
            id="repetida"
            className="dash-field"
            type="password"
            autoComplete="new-password"
            required
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
            style={{ width: "100%", marginTop: 7 }}
          />

          {erro && <Recado texto={erro} tom="erro" />}

          <button
            type="submit"
            className="dash-btn-terra"
            disabled={enviando}
            style={{
              width: "100%",
              marginTop: 24,
              borderRadius: 999,
              padding: "14px 20px",
              fontSize: "13.5px",
              opacity: enviando ? 0.6 : 1,
            }}
          >
            {enviando ? "Salvando…" : "Salvar e entrar"}
          </button>
        </form>
      </div>
    </Fundo>
  );
}
