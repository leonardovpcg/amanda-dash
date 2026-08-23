"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { prepararFoto, type Perfil } from "@/lib/dashboard/perfil";
import Avatar from "./Avatar";
import { MONO, mono } from "./ui";

export default function PerfilModal({
  perfil,
  onClose,
  onSave,
}: {
  perfil: Perfil;
  onClose: () => void;
  onSave: (p: Perfil) => void;
}) {
  const [nome, setNome] = useState(perfil.nome);
  const [foto, setFoto] = useState<string | null>(perfil.foto);
  const [erro, setErro] = useState<string | null>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);

  const escolherFoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite reescolher o mesmo arquivo depois
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErro("Escolha um arquivo de imagem.");
      return;
    }
    try {
      setFoto(await prepararFoto(file));
      setErro(null);
    } catch {
      setErro("Não consegui ler essa imagem. Tente outra.");
    }
  };

  const salvar = () => {
    const limpo = nome.trim();
    if (!limpo) {
      setErro("O nome não pode ficar vazio.");
      return;
    }
    onSave({ nome: limpo, foto });
  };

  return (
    <div
      className="dash-modal-wrap"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 70,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(38,42,38,.34)",
        backdropFilter: "blur(5px)",
      }}
    >
      <div
        className="dash-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          border: "1px solid rgba(255,255,255,.9)",
          background:
            "linear-gradient(160deg, rgba(252,251,248,.97) 0%, rgba(240,244,240,.97) 100%)",
          boxShadow: "0 40px 90px rgba(38,42,38,.32)",
          maxWidth: 520,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 20,
            padding: "32px 34px 0",
          }}
        >
          <div>
            <div style={mono(10.5, "#8C887C", { ls: "0.09em", upper: true })}>Sua conta</div>
            <h2
              style={{
                fontSize: "27px",
                fontWeight: 500,
                letterSpacing: "-0.03em",
                margin: "12px 0 0",
              }}
            >
              Editar perfil
            </h2>
          </div>
          <button
            className="dash-btn-ghost"
            onClick={onClose}
            style={{
              borderRadius: 999,
              width: 36,
              height: 36,
              fontSize: "15px",
              color: "#6E6A5F",
              flex: "none",
            }}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {/* ── foto ─────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            padding: "26px 34px 0",
            flexWrap: "wrap",
          }}
        >
          <Avatar perfil={{ nome, foto }} size={84} fontSize={30} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="dash-btn-outline"
                onClick={() => arquivoRef.current?.click()}
                style={{ borderRadius: 999, padding: "9px 16px", fontSize: "12.5px" }}
              >
                {foto ? "Trocar foto" : "Adicionar foto"}
              </button>
              {foto && (
                <button
                  className="dash-btn-ghost"
                  onClick={() => setFoto(null)}
                  style={{ borderRadius: 999, padding: "9px 16px", fontSize: "12.5px" }}
                >
                  Remover
                </button>
              )}
            </div>
            <div style={{ fontFamily: MONO, fontSize: "10.5px", color: "#A8A498", lineHeight: 1.55 }}>
              cortada no centro e reduzida a 256px
            </div>
          </div>
          <input
            ref={arquivoRef}
            type="file"
            accept="image/*"
            onChange={escolherFoto}
            style={{ display: "none" }}
          />
        </div>

        {/* ── nome ─────────────────────────────────────────────────────── */}
        <div style={{ padding: "24px 34px 0" }}>
          <div style={mono(10, "#9A9689", { ls: "0.08em", upper: true })}>Nome</div>
          <input
            className="dash-field"
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              setErro(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") salvar();
            }}
            placeholder="Amanda Lourenço"
            style={{ width: "100%", marginTop: 8 }}
          />
          <div style={{ fontFamily: MONO, fontSize: "10.5px", color: "#A8A498", marginTop: 8 }}>
            aparece no topo e na saudação
          </div>
        </div>

        {/* ── e-mail, ainda sem conta ──────────────────────────────────── */}
        <div style={{ padding: "20px 34px 0" }}>
          <div style={mono(10, "#9A9689", { ls: "0.08em", upper: true })}>E-mail de acesso</div>
          <div
            style={{
              marginTop: 8,
              border: "1px dashed #E2DED4",
              borderRadius: 14,
              padding: "14px 16px",
              fontSize: "14px",
              color: "#A8A498",
              background: "rgba(255,255,255,.4)",
            }}
          >
            definido quando o login entrar
          </div>
        </div>

        {erro && (
          <div
            style={{
              margin: "18px 34px 0",
              border: "1px solid #EEDDD2",
              background: "#FAF0EA",
              color: "#A85C3C",
              borderRadius: 14,
              padding: "12px 16px",
              fontSize: "13px",
            }}
          >
            {erro}
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            marginTop: 26,
            padding: "22px 34px 28px",
            borderTop: "1px solid #EAE7DF",
            background: "rgba(255,255,255,.45)",
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: "10.5px", color: "#A8A498" }}>
            salvo neste navegador
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="dash-btn-ghost"
              onClick={onClose}
              style={{ borderRadius: 999, padding: "12px 20px", fontSize: "13px" }}
            >
              Cancelar
            </button>
            <button
              className="dash-btn-dark"
              onClick={salvar}
              style={{ borderRadius: 999, padding: "12px 24px", fontSize: "13px" }}
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
