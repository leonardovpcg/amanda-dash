"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Sinal de "carregando" e de falha ao gravar.

   As telas de Ajustes salvam a cada tecla, sem botão. Isso é bom para não
   perder reajuste por trocar de aba, mas cria um risco: se a gravação
   falhar, ela continuaria digitando achando que salvou. Este componente é o
   que impede o erro de sumir.
   ═════════════════════════════════════════════════════════════════════════ */

import { useSyncExternalStore } from "react";
import type { StatusDoArmazem } from "@/lib/supabase/documento";
import { MONO } from "./ui";

export default function SinalDeArmazem({
  assinar,
  ler,
  lerNoServidor,
  rotuloPadrao,
  rotuloEditado,
  editado,
}: {
  assinar: (fn: () => void) => () => void;
  ler: () => StatusDoArmazem;
  lerNoServidor: () => StatusDoArmazem;
  /** Texto quando está tudo certo e vale o padrão de fábrica. */
  rotuloPadrao: string;
  /** Texto quando está tudo certo e ela já editou. */
  rotuloEditado: string;
  editado: boolean;
}) {
  const { carregando, erro } = useSyncExternalStore(assinar, ler, lerNoServidor);

  const cor = erro ? "#9C2B22" : carregando ? "#9A9689" : editado ? "#A84B1C" : "#9A9689";
  const texto = erro
    ? erro
    : carregando
      ? "carregando…"
      : editado
        ? rotuloEditado
        : rotuloPadrao;

  return (
    <div
      role={erro ? "alert" : undefined}
      style={{ fontFamily: MONO, fontSize: "11px", color: cor, maxWidth: 320, lineHeight: 1.5 }}
    >
      {texto}
    </div>
  );
}
