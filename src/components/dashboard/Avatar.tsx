"use client";

import { iniciais, type Perfil } from "@/lib/dashboard/perfil";

/**
 * Avatar da usuária: a foto, ou as iniciais do nome.
 *
 * O anel terracota vem da marca e serve aos dois casos: emoldura a foto, que
 * pode ser de qualquer cor, e fecha o círculo das iniciais, que já é terracota
 * cheio. `border-box` para o anel caber dentro de `size` — sem ele o avatar
 * cresceria 4px e desalinharia do sino ao lado.
 */
export default function Avatar({
  perfil,
  /** O nome a exibir — cai no e-mail da conta enquanto ela não cadastrar. */
  nome,
  size = 40,
  fontSize = 16,
}: {
  perfil: Perfil;
  nome: string;
  size?: number;
  fontSize?: number;
}) {
  if (perfil.foto) {
    return (
      // next/image não ajuda aqui: a foto é uma data URL local, já reduzida a
      // 256px por prepararFoto(), sem origem remota para otimizar.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={perfil.foto}
        alt={nome}
        style={{
          width: size,
          height: size,
          borderRadius: 999,
          objectFit: "cover",
          display: "block",
          flex: "none",
          border: "2px solid #A84B1C",
          boxSizing: "border-box",
        }}
      />
    );
  }
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: "#A84B1C",
        border: "2px solid #A84B1C",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#F6F5F1",
        fontSize,
        fontWeight: 700,
        letterSpacing: "-0.02em",
        flex: "none",
      }}
    >
      {iniciais(nome)}
    </div>
  );
}
