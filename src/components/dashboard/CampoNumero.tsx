"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Campo de número que deixa digitar vírgula.

   O bug que a Amanda descreveu — "não estou conseguindo digitar a vírgula,
   nos valores principalmente" — vinha de o campo reformatar a cada tecla:

     value={paraCampo(qnt)}
     onChange={(e) => onQnt(lerNumero(e.target.value))}

   Ela digita "1", vira 1. Digita a vírgula, o campo mostra "1," por um
   instante, `lerNumero("1,")` devolve 1, o React redesenha com "1" — e a
   vírgula é apagada antes de ela conseguir digitar o decimal. Não dava para
   escrever 1,5 de jeito nenhum.

   Aqui o texto dela manda enquanto o campo está em foco, e o número sai dele.
   Ao sair do campo o texto é substituído pelo valor formatado — é o
   "já fica tudo certinho": ela pode digitar 1250,5 ou 1.250,5 ou 1250.5, e
   sai 1.250,5 nos três casos.
   ═════════════════════════════════════════════════════════════════════════ */

import { useState, type CSSProperties } from "react";

/**
 * Aceita o que o teclado brasileiro produz, e também o ponto decimal.
 *
 * "1.250,5" → 1250.5 (ponto é milhar, vírgula é decimal)
 * "1250,5"  → 1250.5
 * "1250.5"  → 1250.5 (ponto sozinho, sem vírgula, é decimal)
 *
 * O último caso importa porque o teclado numérico do celular às vezes só
 * oferece ponto, e recusá-lo faria o campo parecer quebrado.
 */
export function lerNumero(texto: string): number | null {
  const limpo = texto.trim();
  if (!limpo) return null;
  const temVirgula = limpo.includes(",");
  const normal = temVirgula
    ? limpo.replace(/\./g, "").replace(",", ".")
    : // Sem vírgula, um ponto só e com 1 ou 2 casas depois é decimal; mais de
      // um ponto, ou três casas, é separador de milhar.
      /^\d+\.\d{1,2}$/.test(limpo)
      ? limpo
      : limpo.replace(/\./g, "");
  const n = parseFloat(normal);
  return Number.isFinite(n) ? n : null;
}

/** 1250.5 → "1.250,5". Vazio para nulo, para o campo poder ficar em branco. */
export function paraTexto(n: number | null | undefined): string {
  if (n === null || n === undefined) return "";
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
}

export default function CampoNumero({
  valor,
  onChange,
  className = "dash-field dash-field-sm",
  style,
  placeholder,
  "aria-label": rotulo,
  title,
  onBlur,
}: {
  valor: number | null | undefined;
  /** Chamado a cada tecla, com o número já lido — os totais acompanham. */
  onChange: (v: number | null) => void;
  className?: string;
  style?: CSSProperties;
  placeholder?: string;
  "aria-label"?: string;
  title?: string;
  onBlur?: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [focado, setFocado] = useState(false);

  return (
    <input
      className={className}
      inputMode="decimal"
      // Em foco vale o que ela escreveu, letra por letra. Fora de foco vale o
      // número, formatado — inclusive quando ele mudou por outro caminho.
      value={focado ? texto : paraTexto(valor)}
      placeholder={placeholder}
      aria-label={rotulo}
      title={title}
      onFocus={(e) => {
        setTexto(paraTexto(valor));
        setFocado(true);
        // Seleciona tudo: trocar um valor é o caso comum, e apagar dígito a
        // dígito antes de digitar o novo é trabalho à toa.
        e.currentTarget.select();
      }}
      onChange={(e) => {
        setTexto(e.target.value);
        onChange(lerNumero(e.target.value));
      }}
      onBlur={() => {
        setFocado(false);
        onBlur?.();
      }}
      style={style}
    />
  );
}
