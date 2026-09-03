"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   O modelo da proposta.

   Guarda só o que **não** muda de projeto para projeto. A divisão veio dela:
   "muda cor e acessórios; ferragem normalmente mantém". Então material e
   acessórios ficam no ambiente, e ferragens vem daqui — junto com as
   observações, as condições de pagamento e o fecho, que ela escreve uma vez e
   esquece.

   Mesmo formato do catálogo, do roteiro e das regras: um documento JSONB em
   `configuracoes`, com escrita otimista. É o quarto do tipo, e o padrão já
   estava pronto.

   Os padrões de fábrica são o texto da proposta que ela envia hoje. Servem
   para a primeira impressão sair inteira mesmo antes de ela abrir a tela de
   Ajustes — proposta pela metade é pior que proposta genérica.
   ═════════════════════════════════════════════════════════════════════════ */

import { criarArmazemDeDocumento } from "@/lib/supabase/documento";

export type ModeloDaProposta = {
  /** Repetido em todo ambiente — o único dos três blocos que não varia. */
  ferragens: string;
  /** As observações da página de condições, uma por linha. */
  observacoes: string[];
  pagamento: string;
  garantia: string;
  prazo: string;
  /**
   * Quanto tempo a proposta vale.
   *
   * Prazo diferente de "prazo de entrega": este é a validade do preço, e o
   * de entrega é quando o móvel fica pronto. Sai embaixo de "Prazo de
   * entrega" na página de condições, como ela pediu.
   */
  validade: string;
  /** O texto de "Nossa empresa", na segunda página. */
  empresa: string;
  /** O fecho: quem responde pela proposta e como falar com a loja. */
  despedida: string;
  proprietario: string;
  /** Ao lado do nome, não no rodapé: é por ali que o cliente liga. */
  telefoneProprietario: string;
  consultora: string;
  telefoneConsultora: string;
  contato: string;
};

export const MODELO_PADRAO: ModeloDaProposta = {
  ferragens: "Corrediças e dobradiças com amortecimento · Marca FGVTN",
  observacoes: [
    "O presente orçamento segue o projeto executivo. Não estão inclusos iluminação, vidraçaria e puxadores.",
    "Consideramos todas as corrediças e dobradiças com amortecimento da marca FGVTN.",
    "As bases dos armários são confeccionadas em MDF Ultra Resistente (Água).",
  ],
  pagamento: "Em até 10 vezes sem juros no cartão de crédito. À vista, 5% de desconto.",
  garantia: "5 anos",
  prazo: "A definir",
  validade: "15 dias a partir da data de emissão",
  empresa:
    "A Planejados Terracota atua no mercado de Campo Grande (MS) com uma equipe de " +
    "designers dedicados à criação de projetos exclusivos, e marceneiros experientes, " +
    "responsáveis por produzir móveis planejados de alta qualidade e acabamento refinado. " +
    "Oferecemos móveis planejados para residências de alto padrão e também para empresas, " +
    "como hotéis, hospitais, clínicas e escritórios.",
  despedida:
    "Esperamos poder atender suas necessidades. Qualquer dúvida, favor entrar em contato.",
  proprietario: "Hugo Dias",
  telefoneProprietario: "(67) 99916-1155",
  consultora: "Amanda Lourenço",
  telefoneConsultora: "(67) 99227-4043",
  contato: "R. Cotegipe · Paquetá · Campo Grande, MS · @planejados.terracota",
};

/**
 * Lê o que veio do banco sem confiar nele.
 *
 * Campo faltando cai no padrão, do mesmo jeito que o catálogo faz: um modelo
 * gravado por uma versão antiga do app continua abrindo depois de a gente
 * acrescentar campo novo, e a proposta não sai com um buraco no meio.
 */
function interpretar(bruto: unknown): ModeloDaProposta {
  if (!bruto || typeof bruto !== "object") return MODELO_PADRAO;
  const m = bruto as Partial<ModeloDaProposta>;
  const texto = (v: unknown, padrao: string) => (typeof v === "string" ? v : padrao);
  return {
    ferragens: texto(m.ferragens, MODELO_PADRAO.ferragens),
    // Lista vazia é escolha válida — ela pode não querer observação nenhuma —,
    // então só cai no padrão quando não é lista.
    observacoes: Array.isArray(m.observacoes)
      ? m.observacoes.filter((o): o is string => typeof o === "string")
      : MODELO_PADRAO.observacoes,
    pagamento: texto(m.pagamento, MODELO_PADRAO.pagamento),
    garantia: texto(m.garantia, MODELO_PADRAO.garantia),
    prazo: texto(m.prazo, MODELO_PADRAO.prazo),
    validade: texto(m.validade, MODELO_PADRAO.validade),
    empresa: texto(m.empresa, MODELO_PADRAO.empresa),
    despedida: texto(m.despedida, MODELO_PADRAO.despedida),
    proprietario: texto(m.proprietario, MODELO_PADRAO.proprietario),
    telefoneProprietario: texto(m.telefoneProprietario, MODELO_PADRAO.telefoneProprietario),
    consultora: texto(m.consultora, MODELO_PADRAO.consultora),
    telefoneConsultora: texto(m.telefoneConsultora, MODELO_PADRAO.telefoneConsultora),
    contato: texto(m.contato, MODELO_PADRAO.contato),
  };
}

const armazem = criarArmazemDeDocumento<ModeloDaProposta>(
  "proposta",
  MODELO_PADRAO,
  interpretar,
);

export const lerModelo = armazem.ler;
export const lerModeloNoServidor = armazem.lerNoServidor;
export const assinarModelo = armazem.assinar;
export const guardarModelo = armazem.guardar;
export const restaurarModelo = armazem.restaurar;
export const lerStatusModelo = armazem.lerStatus;
export const lerStatusModeloNoServidor = armazem.lerStatusNoServidor;
export const assinarStatusModelo = armazem.assinarStatus;

/** `true` quando ela já mexeu — o sinal de "editado" na tela de Ajustes. */
export const modeloEditado = (m: ModeloDaProposta) =>
  JSON.stringify(m) !== JSON.stringify(MODELO_PADRAO);
