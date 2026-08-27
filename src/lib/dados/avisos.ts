"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Avisos.

   Não existe tabela de avisos, e é de propósito. Todo aviso aqui é uma
   condição que já está escrita em outro lugar: um lead parado, um prazo que
   passou, um contrato sem sinal. Guardar isso em linhas criaria a pergunta
   que não tem boa resposta — quem apaga o aviso quando a condição deixa de
   valer? Aqui ele some sozinho porque o motivo sumiu.

   Por isso também não há "marcar como lido": não é caixa de entrada, é o
   estado do dia. O que resolve um aviso é resolver o que ele aponta.
   ═════════════════════════════════════════════════════════════════════════ */

import { useSyncExternalStore } from "react";
import {
  assinarAgenda,
  assinarRetornos,
  horaDe,
  lerAgenda,
  lerAgendaNoServidor,
  lerRetornos,
  lerRetornosNoServidor,
  rotuloDoTipo,
} from "./agenda";
import {
  assinarContratos,
  lerContratos,
  lerContratosNoServidor,
} from "./contratos";
import {
  assinarAssistencias,
  assinarGarantias,
  lerAssistencias,
  lerAssistenciasNoServidor,
  lerGarantias,
  lerGarantiasNoServidor,
} from "./posvenda";
import { assinarRelogio, hojeISO, lerRelogio, lerRelogioNoServidor } from "./relogio";
import { money } from "@/lib/dashboard/data";

export type Aviso = {
  id: string;
  titulo: string;
  detalhe: string;
  quando: string;
  cor: string;
  /** Menor primeiro: é a ordem em que aparecem. */
  peso: number;
};

const VERMELHO = "#9C2B22";
const TERRA = "#A84B1C";
const OLIVA = "#6B7040";

/**
 * Monta a lista.
 *
 * Ordenada por urgência, não por data: o que já venceu vem antes do que
 * vence hoje, e o que vence hoje antes do que vence semana que vem. Numa
 * lista de quatro linhas visíveis, a ordem é o que decide o que ela vê.
 */
export function useAvisos(): Aviso[] {
  const agora = useSyncExternalStore(assinarRelogio, lerRelogio, lerRelogioNoServidor);
  const agenda = useSyncExternalStore(assinarAgenda, lerAgenda, lerAgendaNoServidor);
  const retornos = useSyncExternalStore(assinarRetornos, lerRetornos, lerRetornosNoServidor);
  const assistencias = useSyncExternalStore(
    assinarAssistencias,
    lerAssistencias,
    lerAssistenciasNoServidor,
  );
  const garantias = useSyncExternalStore(assinarGarantias, lerGarantias, lerGarantiasNoServidor);
  const contratos = useSyncExternalStore(assinarContratos, lerContratos, lerContratosNoServidor);

  const hoje = hojeISO(agora);
  const avisos: Aviso[] = [];

  // ── compromissos vencidos e de hoje ──────────────────────────────────
  for (const i of agenda) {
    if (i.situacao === "feito") continue;
    if (i.dia > hoje) continue;
    const atrasado = i.dia < hoje;
    const hora = horaDe(i);
    avisos.push({
      id: "agenda:" + i.id,
      titulo: atrasado
        ? `${rotuloDoTipo(i.tipo)} não marcada como feita`
        : `${rotuloDoTipo(i.tipo)} hoje${hora ? ` às ${hora}` : ""}`,
      detalhe: [i.titulo, i.cliente, i.local, i.nota].filter(Boolean).join(" · "),
      quando: atrasado ? `passou em ${diasEntre(i.dia, hoje)} dias` : "hoje",
      cor: atrasado ? VERMELHO : TERRA,
      peso: atrasado ? 0 : 1,
    });
  }

  // ── leads parados ────────────────────────────────────────────────────
  for (const r of retornos) {
    avisos.push({
      id: "retorno:" + r.id,
      titulo: `${r.nome} sem retorno`,
      detalhe:
        `Parado em ${r.etapa}` + (r.valorEstimado > 0 ? `, ${money(r.valorEstimado)} estimados.` : "."),
      quando: `há ${r.diasParado} dias`,
      cor: VERMELHO,
      peso: 2,
    });
  }

  // ── assistências com prazo estourado ─────────────────────────────────
  for (const a of assistencias) {
    if (a.situacao === "resolvida" || !a.prazo || a.prazo > hoje) continue;
    avisos.push({
      id: "assistencia:" + a.id,
      titulo: `Assistência de ${a.cliente} venceu o prazo`,
      detalhe: [a.sintoma, a.ambiente].filter(Boolean).join(" · "),
      quando: a.prazo === hoje ? "vence hoje" : `há ${diasEntre(a.prazo, hoje)} dias`,
      cor: VERMELHO,
      peso: 3,
    });
  }

  // ── contrato assinado sem nenhuma entrada ────────────────────────────
  // Sinal que não entrou é o furo mais caro do fluxo, e é silencioso: o
  // projeto anda normalmente sem ninguém notar que o dinheiro não veio.
  for (const c of contratos) {
    if (c.recebido > 0) continue;
    const dias = diasEntre(c.assinadoEm, hoje);
    if (dias < 7) continue;
    avisos.push({
      id: "sinal:" + c.id,
      titulo: `${c.cliente} sem nenhum pagamento`,
      detalhe: `Contrato de ${money(c.valor)} assinado e sem entrada registrada.`,
      quando: `assinado há ${dias} dias`,
      cor: VERMELHO,
      peso: 4,
    });
  }

  // ── garantias perto do fim ───────────────────────────────────────────
  for (const g of garantias) {
    if (g.diasRestantes > 60 || g.diasRestantes <= 0) continue;
    avisos.push({
      id: "garantia:" + g.projetoId,
      titulo: `Garantia de ${g.cliente} vence em breve`,
      detalhe: `${g.projeto} · última chance de revisão dentro da garantia.`,
      quando: `em ${g.diasRestantes} dias`,
      cor: OLIVA,
      peso: 5,
    });
  }

  // ── prazos de fábrica da semana ──────────────────────────────────────
  const emSete = somarDias(hoje, 7);
  for (const i of agenda) {
    if (i.situacao === "feito" || i.dia <= hoje || i.dia > emSete) continue;
    avisos.push({
      id: "prazo:" + i.id,
      titulo: `${rotuloDoTipo(i.tipo)} em ${diasEntre(hoje, i.dia)} dias`,
      detalhe: [i.titulo, i.cliente, i.projeto].filter(Boolean).join(" · "),
      quando: i.dia,
      cor: TERRA,
      peso: 6,
    });
  }

  return avisos.sort((a, b) => a.peso - b.peso || a.quando.localeCompare(b.quando));
}

/** Dias entre duas datas ISO. Sempre positivo quando `ate` vem depois. */
function diasEntre(de: string, ate: string): number {
  return Math.round((emMs(ate) - emMs(de)) / 86_400_000);
}

function somarDias(iso: string, n: number): string {
  const d = new Date(emMs(iso) + n * 86_400_000);
  const dd = (v: number) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${dd(d.getMonth() + 1)}-${dd(d.getDate())}`;
}

/** Meio-dia local, não meia-noite: fuso e horário de verão não viram um dia. */
function emMs(iso: string): number {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d, 12).getTime();
}
