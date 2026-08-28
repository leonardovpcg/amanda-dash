import type { Metadata, Viewport } from "next";
import { Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// As duas faces do "Dashboard Arquitetura": Manrope no texto e IBM Plex Mono
// nos rótulos/valores. O design as puxava do Google Fonts por <link>; aqui vêm
// do next/font (self-hosted, sem request externo e sem layout shift).
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Amanda Dash",
  description: "Painel comercial e de projetos de arquitetura",
  // O iOS ignora o manifesto: quem manda no ícone da tela de início e no modo
  // sem barra de endereço são estas meta tags. O ícone em si é
  // `apple-icon.png`, que o Next liga sozinho por convenção de arquivo.
  appleWebApp: {
    capable: true,
    title: "Amanda Dash",
    // `default` deixa a barra de status clara com texto escuro, que combina
    // com o fundo do painel. `black-translucent` jogaria o conteúdo por baixo
    // do relógio.
    statusBarStyle: "default",
  },
  // O Next emite só o nome moderno, `mobile-web-app-capable`. O iOS antigo
  // não conhece esse — abriria com barra de endereço, que é exatamente o que
  // se quer evitar. A tag da Apple é obsoleta e ignorada por quem já lê o
  // manifesto, então repetir aqui não custa nada e cobre os aparelhos velhos.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  // Tinge a barra de status do Android com a cor do body, então a moldura do
  // sistema encosta no app sem faixa no meio. Mesma cor do manifesto.
  themeColor: "#CFC7BF",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${manrope.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
