"use client";

import { useEffect, useRef } from "react";

const DISTANCIA_MINIMA = 60; // px — abaixo disso é toque, não deslize
const PROPORCAO_MINIMA = 1.4; // dx precisa ser 1.4x dy, senão foi rolagem vertical

/**
 * Deslizar na horizontal troca de aba, no celular.
 *
 * O cuidado que faz isso não atrapalhar: se o dedo começou dentro de algo que
 * já rola na horizontal — o kanban do funil, as tabelas de materiais e de
 * comissão — o gesto pertence àquele elemento e o deslize é ignorado. Sem
 * isso, arrastar o kanban trocaria de aba no meio do caminho.
 */
export function useDeslizarAbas({
  aoDeslizar,
  ativo,
}: {
  /** 1 = próxima aba (dedo para a esquerda), -1 = anterior */
  aoDeslizar: (direcao: 1 | -1) => void;
  /** desligado enquanto houver modal, drawer ou menu aberto */
  ativo: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raiz = ref.current;
    if (!raiz || !ativo) return;

    let x0 = 0;
    let y0 = 0;
    let valendo = false;

    const dentroDeAlgoQueRola = (alvo: EventTarget | null) => {
      let no = alvo instanceof Element ? alvo : null;
      while (no && no !== raiz) {
        if (no.scrollWidth > no.clientWidth + 4) {
          const overflow = getComputedStyle(no).overflowX;
          if (overflow === "auto" || overflow === "scroll") return true;
        }
        no = no.parentElement;
      }
      return false;
    };

    const inicio = (e: TouchEvent) => {
      if (e.touches.length !== 1 || dentroDeAlgoQueRola(e.target)) {
        valendo = false;
        return;
      }
      valendo = true;
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
    };

    const fim = (e: TouchEvent) => {
      if (!valendo) return;
      valendo = false;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - x0;
      const dy = t.clientY - y0;
      if (Math.abs(dx) < DISTANCIA_MINIMA) return;
      if (Math.abs(dx) < Math.abs(dy) * PROPORCAO_MINIMA) return;
      aoDeslizar(dx < 0 ? 1 : -1);
    };

    const cancelar = () => {
      valendo = false;
    };

    // passive: só leio as coordenadas, nunca chamo preventDefault — assim a
    // rolagem vertical continua fluida
    raiz.addEventListener("touchstart", inicio, { passive: true });
    raiz.addEventListener("touchend", fim, { passive: true });
    raiz.addEventListener("touchcancel", cancelar, { passive: true });
    return () => {
      raiz.removeEventListener("touchstart", inicio);
      raiz.removeEventListener("touchend", fim);
      raiz.removeEventListener("touchcancel", cancelar);
    };
  }, [aoDeslizar, ativo]);

  return ref;
}
