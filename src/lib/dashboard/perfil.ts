"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Perfil da usuária: nome e foto.

   Morava no localStorage — paliativo declarado enquanto não havia banco.
   Agora fica em `configuracoes`, junto com catálogo, roteiro e regras: é o
   mesmo tipo de dado, um documento só que ela edita inteiro e esquece. Sair
   do localStorage é o que faz o nome e a foto acompanharem ela do
   computador da loja para o celular.

   O nome **não** tem padrão inventado. Antes vinha "Amanda Lourenço" escrito
   no código, o que ficava certo por acaso e erraria com qualquer outra conta.
   Sem nome cadastrado, cai no e-mail do login — que é dado real.
   ═════════════════════════════════════════════════════════════════════════ */

import { criarArmazemDeDocumento } from "@/lib/supabase/documento";

export type Perfil = {
  nome: string;
  /** data URL da foto já reduzida, ou null para cair nas iniciais */
  foto: string | null;
};

export const PERFIL_PADRAO: Perfil = { nome: "", foto: null };

function interpretar(bruto: unknown): Perfil {
  if (!bruto || typeof bruto !== "object") return PERFIL_PADRAO;
  const p = bruto as Partial<Perfil>;
  return {
    nome: typeof p.nome === "string" ? p.nome : "",
    foto: typeof p.foto === "string" ? p.foto : null,
  };
}

const armazem = criarArmazemDeDocumento<Perfil>("perfil", PERFIL_PADRAO, interpretar);

export const lerPerfil = armazem.ler;
export const lerPerfilNoServidor = armazem.lerNoServidor;
export const assinarPerfil = armazem.assinar;
export const guardarPerfil = armazem.guardar;
export const lerStatusPerfil = armazem.lerStatus;
export const lerStatusPerfilNoServidor = armazem.lerStatusNoServidor;
export const assinarStatusPerfil = armazem.assinarStatus;

/**
 * O nome a mostrar.
 *
 * Cai no e-mail do login enquanto ela não cadastrar o nome: "vicentep.leo"
 * vira "Vicentep Leo". Feio, mas é ela — e some no minuto em que ela
 * preencher o perfil.
 */
export function nomeExibido(perfil: Perfil, email?: string | null): string {
  if (perfil.nome.trim()) return perfil.nome.trim();
  const local = (email ?? "").split("@")[0];
  if (!local) return "";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
}

/** Iniciais do nome, no máximo duas letras — "Amanda Lourenço" vira "AL". */
export function iniciais(nome: string): string {
  const partes = nome
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 1 || /[A-Za-zÀ-ÿ]/.test(p));
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/** Primeiro nome, para a saudação. */
export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] || "";
}

/**
 * Reduz a imagem escolhida a um quadrado de `lado` px, cortado pelo centro,
 * e devolve como data URL JPEG.
 *
 * Continua obrigatório com o banco no lugar do localStorage: a foto vai
 * dentro de uma linha JSONB, e uma foto de celular de 4 MB em base64 passaria
 * de 5 MB numa coluna que é lida a cada abertura do app.
 */
export async function prepararFoto(file: File, lado = 256): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = lado;
  canvas.height = lado;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas indisponível");
  const min = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - min) / 2;
  const sy = (bitmap.height - min) / 2;
  ctx.drawImage(bitmap, sx, sy, min, min, 0, 0, lado, lado);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}
