// Perfil da usuária.
//
// Enquanto não existe Supabase, o perfil vive no localStorage do navegador.
// É um paliativo deliberado, não a solução: quando o login entrar, nome, foto
// e e-mail passam a vir da conta e este módulo vira uma camada fina sobre ela.

export type Perfil = {
  nome: string;
  /** data URL da foto já reduzida, ou null para cair nas iniciais */
  foto: string | null;
};

export const PERFIL_PADRAO: Perfil = { nome: "Amanda Lourenço", foto: null };

const CHAVE = "amanda-dash:perfil";

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

function interpretar(bruto: string | null): Perfil {
  if (!bruto) return PERFIL_PADRAO;
  try {
    const p = JSON.parse(bruto) as Partial<Perfil>;
    if (typeof p.nome !== "string" || !p.nome.trim()) return PERFIL_PADRAO;
    return { nome: p.nome, foto: typeof p.foto === "string" ? p.foto : null };
  } catch {
    return PERFIL_PADRAO;
  }
}

// ── fonte externa para useSyncExternalStore ────────────────────────────────
// O perfil vive fora do React (localStorage), então é lido como store externa
// em vez de copiado para o estado num efeito. Isso evita render em cascata e
// resolve a hidratação: o servidor sempre entrega PERFIL_PADRAO e o React
// troca sozinho depois de hidratar.

const ouvintes = new Set<() => void>();
let brutoEmCache: string | null = null;
let perfilEmCache: Perfil = PERFIL_PADRAO;

/** Precisa devolver a MESMA referência enquanto nada mudar, senão o React
 *  entra em laço infinito de renderização. Daí o cache pelo texto cru. */
export function lerPerfil(): Perfil {
  let bruto: string | null = null;
  try {
    bruto = localStorage.getItem(CHAVE);
  } catch {
    return perfilEmCache;
  }
  if (bruto !== brutoEmCache) {
    brutoEmCache = bruto;
    perfilEmCache = interpretar(bruto);
  }
  return perfilEmCache;
}

/** No servidor não há navegador: sempre o padrão. */
export function lerPerfilNoServidor(): Perfil {
  return PERFIL_PADRAO;
}

export function assinarPerfil(aoMudar: () => void): () => void {
  ouvintes.add(aoMudar);
  // `storage` dispara em outras abas do mesmo site
  window.addEventListener("storage", aoMudar);
  return () => {
    ouvintes.delete(aoMudar);
    window.removeEventListener("storage", aoMudar);
  };
}

export function guardarPerfil(p: Perfil): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(p));
  } catch {
    // localStorage cheio ou bloqueado — o perfil vale só nesta sessão
    brutoEmCache = null;
    perfilEmCache = p;
  }
  ouvintes.forEach((fn) => fn());
}

/**
 * Reduz a imagem escolhida a um quadrado de `lado` px, cortado pelo centro,
 * e devolve como data URL JPEG. Sem isso, uma foto de celular de 4 MB não
 * caberia no localStorage nem faria sentido para um avatar de 30px.
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
