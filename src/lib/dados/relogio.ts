"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   O relógio do dashboard.

   Havia uma string fixa — "Segunda, 24 de agosto de 2026" e "Bom dia" a
   qualquer hora. Agora vem do aparelho dela.

   Lido como store externa por um motivo específico do Next: o servidor
   renderiza um horário e o cliente outro, e a hidratação quebra. O snapshot
   do servidor devolve `null`, o cliente devolve a hora de verdade, e o React
   troca sozinho depois de hidratar — mesmo padrão da proposta impressa.

   Atenção à distinção que o schema já faz: **isto é o relógio da tela.** A
   data de negócio — o que conta para a meta do mês e para "parado há N dias"
   — vem do servidor no fuso da loja, via `hoje_local()`. Misturar os dois faz
   a mesma venda cair em meses diferentes conforme onde ela abrir o app.
   ═════════════════════════════════════════════════════════════════════════ */

const ouvintes = new Set<() => void>();
let agora: Date | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

function atualizar() {
  const novo = new Date();
  // Só avisa quando o minuto vira: a saudação e a data não mudam por segundo,
  // e re-renderizar o dashboard inteiro a cada segundo seria desperdício.
  if (agora && agora.getMinutes() === novo.getMinutes() && agora.getDate() === novo.getDate()) {
    return;
  }
  agora = novo;
  ouvintes.forEach((fn) => fn());
}

export function assinarRelogio(aoMudar: () => void): () => void {
  if (!agora) agora = new Date();
  ouvintes.add(aoMudar);
  if (!timer) timer = setInterval(atualizar, 20_000);
  return () => {
    ouvintes.delete(aoMudar);
    if (ouvintes.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export const lerRelogio = (): Date | null => agora;
/** No servidor não há hora do usuário — quem sabe é o navegador. */
export const lerRelogioNoServidor = (): Date | null => null;

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "Segunda, 24 de agosto de 2026". Vazio enquanto o servidor renderiza. */
export function dataPorExtenso(d: Date | null): string {
  if (!d) return "";
  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

/** Bom dia até meio-dia, boa tarde até as 18h, boa noite depois. */
export function saudacao(d: Date | null): string {
  if (!d) return "Olá";
  const h = d.getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

/**
 * Hoje no formato do banco e do campo de data: "2026-08-27".
 *
 * Montado dos componentes locais, nunca por `toISOString()`: às 21h de
 * Brasília o ISO em UTC já é o dia seguinte, e a data cairia um dia à frente.
 */
export function hojeISO(d: Date | null = agora): string {
  const base = d ?? new Date();
  const dd = (n: number) => String(n).padStart(2, "0");
  return `${base.getFullYear()}-${dd(base.getMonth() + 1)}-${dd(base.getDate())}`;
}

/** "2026-08" — o mês corrente, para casar com a meta. */
export function mesCorrente(d: Date | null): string {
  const base = d ?? new Date();
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}`;
}

export const nomeDoMes = (aaaaMm: string) => MESES[Number(aaaaMm.split("-")[1]) - 1] ?? "";
