"use client";

import { iniciais, type Perfil } from "@/lib/dashboard/perfil";

/** Avatar da usuária: a foto, ou as iniciais do nome sobre o petróleo do design. */
export default function Avatar({
  perfil,
  size = 30,
  fontSize = 12.5,
}: {
  perfil: Perfil;
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
        alt={perfil.nome}
        style={{
          width: size,
          height: size,
          borderRadius: 999,
          objectFit: "cover",
          display: "block",
          flex: "none",
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
        background: "#1F5560",
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
      {iniciais(perfil.nome)}
    </div>
  );
}
