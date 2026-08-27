"use client";

import { useEffect, useRef } from "react";

/* Números escolhidos para o gesto só valer quando for claramente intencional.
   A versão anterior decidia apenas no `touchend`, olhando o deslocamento
   total — e aí uma rolagem vertical com deriva lateral trocava de aba no meio
   da leitura. Agora a decisão acontece durante o gesto. */

/** Distância horizontal para valer como deslize. */
const DISTANCIA_MINIMA = 90;
/** Depois de andar isto na vertical, o gesto é rolagem e não vira mais aba. */
const TOLERANCIA_VERTICAL = 30;
/** Horizontal precisa ser o dobro da vertical no fim das contas. */
const PROPORCAO_MINIMA = 2;
/** Deslize é um movimento rápido; arrastar devagar é outra intenção. */
const TEMPO_MAXIMO = 700;
/** Faixa de borda reservada ao gesto de voltar do próprio navegador. */
const MARGEM_DA_BORDA = 28;
/** A partir daqui o gesto se declara horizontal e a rolagem não o cancela. */
const TRAVA_HORIZONTAL = 26;

/**
 * Deslizar na horizontal troca de aba, no celular.
 *
 * Três guardas, em ordem de importância:
 *
 * 1. **Rolou na vertical, acabou.** Assim que o dedo anda mais de 30px para
 *    cima ou para baixo sem ter firmado horizontal, o gesto é descartado —
 *    é o caso que trocava de aba sozinho enquanto ela lia a tela.
 * 2. **Começou dentro de algo que rola na horizontal?** O gesto pertence
 *    àquele elemento: o kanban do funil, as tabelas de materiais, a faixa de
 *    abas.
 * 3. **Começou na borda da tela?** É provável que seja o gesto de voltar do
 *    navegador, não um pedido de trocar de aba.
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
    let t0 = 0;
    let valendo = false;
    /** Ficou horizontal o bastante para a rolagem não conseguir mais cancelar. */
    let horizontal = false;

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
      valendo = false;
      horizontal = false;
      if (e.touches.length !== 1) return;

      const t = e.touches[0];
      const larguraTela = window.innerWidth;
      if (t.clientX < MARGEM_DA_BORDA || t.clientX > larguraTela - MARGEM_DA_BORDA) return;
      if (dentroDeAlgoQueRola(e.target)) return;

      valendo = true;
      x0 = t.clientX;
      y0 = t.clientY;
      t0 = e.timeStamp;
    };

    const mover = (e: TouchEvent) => {
      if (!valendo || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - x0;
      const dy = e.touches[0].clientY - y0;

      if (horizontal) return;

      // Firmou horizontal antes de rolar: a partir daqui o gesto é do deslize.
      if (Math.abs(dx) > TRAVA_HORIZONTAL && Math.abs(dx) > Math.abs(dy) * PROPORCAO_MINIMA) {
        horizontal = true;
        return;
      }

      // Rolou. Não é deslize, e não adianta o dedo voltar para a horizontal
      // depois — quem estava lendo a tela não queria trocar de aba.
      if (Math.abs(dy) > TOLERANCIA_VERTICAL) valendo = false;
    };

    const fim = (e: TouchEvent) => {
      const valia = valendo && horizontal;
      valendo = false;
      horizontal = false;
      if (!valia) return;

      const t = e.changedTouches[0];
      if (!t) return;
      if (e.timeStamp - t0 > TEMPO_MAXIMO) return;

      const dx = t.clientX - x0;
      const dy = t.clientY - y0;
      if (Math.abs(dx) < DISTANCIA_MINIMA) return;
      if (Math.abs(dx) < Math.abs(dy) * PROPORCAO_MINIMA) return;
      aoDeslizar(dx < 0 ? 1 : -1);
    };

    const cancelar = () => {
      valendo = false;
      horizontal = false;
    };

    // passive: só leio as coordenadas, nunca chamo preventDefault — assim a
    // rolagem vertical continua fluida
    raiz.addEventListener("touchstart", inicio, { passive: true });
    raiz.addEventListener("touchmove", mover, { passive: true });
    raiz.addEventListener("touchend", fim, { passive: true });
    raiz.addEventListener("touchcancel", cancelar, { passive: true });
    return () => {
      raiz.removeEventListener("touchstart", inicio);
      raiz.removeEventListener("touchmove", mover);
      raiz.removeEventListener("touchend", fim);
      raiz.removeEventListener("touchcancel", cancelar);
    };
  }, [aoDeslizar, ativo]);

  return ref;
}
