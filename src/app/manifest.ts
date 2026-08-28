import type { MetadataRoute } from "next";

/* ═══════════════════════════════════════════════════════════════════════════
   Manifesto do app.

   É o que faz "adicionar à tela de início" virar aplicativo em vez de atalho
   de navegador: ícone próprio, abertura sem barra de endereço e tela de
   carregamento com a cor certa.

   Os PNGs vêm de `scripts/gerar-icones.mjs`, derivados de `icon.svg`. O SVG
   sozinho não serve aqui — ver o comentário do script.
   ═════════════════════════════════════════════════════════════════════════ */

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Amanda Dash · Terracota Móveis Planejados",
    // O que cabe embaixo do ícone na tela de início. Passando de ~12
    // caracteres o Android corta com reticências.
    short_name: "Amanda Dash",
    description: "Painel comercial e de projetos de arquitetura",
    lang: "pt-BR",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    // `standalone` tira a barra de endereço. `browser` deixaria um atalho
    // comum, que é justamente o que se quer evitar.
    display: "standalone",
    // A cor do body: a tela de carregamento e a barra de status ficam do
    // mesmo tom do app, sem a faixa que denuncia que é site.
    background_color: "#CFC7BF",
    theme_color: "#CFC7BF",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Sem uma versão `maskable`, o Android desenha o ícone dentro de um
      // quadrado branco em vez de recortá-lo na forma do sistema — é o que
      // mais entrega que não é app nativo.
      {
        src: "/icone-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
