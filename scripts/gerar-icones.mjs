/* ═══════════════════════════════════════════════════════════════════════════
   Gera os PNGs do ícone de app a partir de `src/app/icon.svg`.

   Por que PNG, se o ícone da aba já é SVG: nem o iOS nem o Android confiam em
   SVG para o ícone da tela de início. O `apple-touch-icon` do iOS não aceita
   SVG, e o Chrome no Android trata SVG no manifesto de forma irregular — o
   preço de errar é a inicial da página num quadradinho branco em vez do
   símbolo.

   O SVG continua sendo a única fonte da geometria. Estes arquivos são
   derivados; se o símbolo mudar, rode de novo:

       node scripts/gerar-icones.mjs

   Roda fora do Next de propósito: assim os PNGs ficam estáticos em `public/`,
   sem custo em nenhuma requisição, e o manifesto pode apontar para caminhos
   fixos.
   ═════════════════════════════════════════════════════════════════════════ */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { ImageResponse } from "next/og.js";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Creme do interior do painel — o fundo sobre o qual a logo vive no app. */
const FUNDO = "#F4F3EE";

const svg = await readFile(join(raiz, "src/app/icon.svg"), "utf8");
const svgUrl = "data:image/svg+xml;base64," + Buffer.from(svg, "utf8").toString("base64");

/**
 * Um ícone quadrado: fundo cheio e o símbolo centralizado.
 *
 * `proporcao` é quanto do lado o símbolo ocupa. Some para o ícone mascarável:
 * o Android recorta a arte em círculo, gota ou quadrado arredondado conforme o
 * aparelho, e só a área central é garantida. Com a proporção de sempre, o
 * moinho perderia as pontas no recorte redondo.
 */
async function gerar(arquivo, lado, proporcao) {
  const simbolo = Math.round(lado * proporcao);
  const resposta = new ImageResponse(
    createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: FUNDO,
        },
      },
      createElement("img", { src: svgUrl, width: simbolo, height: simbolo }),
    ),
    { width: lado, height: lado },
  );
  const bytes = Buffer.from(await resposta.arrayBuffer());
  const destino = join(raiz, arquivo);
  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, bytes);
  console.log(`${arquivo} · ${lado}×${lado} · ${(bytes.length / 1024).toFixed(1)} KB`);
}

// 0.72 deixa uma margem que o ícone comum pede para não encostar na borda.
await gerar("public/icone-192.png", 192, 0.72);
await gerar("public/icone-512.png", 512, 0.72);
// 0.52 mantém o moinho inteiro dentro do círculo seguro do Android.
await gerar("public/icone-maskable-512.png", 512, 0.52);
// O do iOS é arquivo de convenção do Next: vira <link rel="apple-touch-icon">.
await gerar("src/app/apple-icon.png", 180, 0.72);
