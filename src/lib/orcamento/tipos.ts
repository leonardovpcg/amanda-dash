/* ═══════════════════════════════════════════════════════════════════════════
   Tipos do orçamento quantitativo.

   Vieram da planilha `Modelo_orçamentoquantitativo.xlsx`, onde cada ambiente é
   uma aba com quatro blocos: chapas, fita de borda, acessórios e mão de obra.
   Aqui os quatro viram arrays — sem faixa fixa de linhas, que era a origem de
   metade dos erros da planilha (soma que começava na linha errada, bloco de
   sete linhas somando só cinco).

   As linhas guardam **id de catálogo**, nunca o nome digitado: na planilha o
   nome era texto livre e "DOBRADIÇA " com espaço no fim já quebrou uma conta.
   ═════════════════════════════════════════════════════════════════════════ */

/** Espessuras de chapa cotadas na tabela de valores, em milímetros. */
export type Espessura = 6 | 15 | 18;

export const ESPESSURAS: Espessura[] = [6, 15, 18];

/** Uma cor de chapa e seu preço por espessura. Nem toda cor tem as três. */
export type CorChapa = {
  id: string;
  nome: string;
  fabricante: string;
  precos: Partial<Record<Espessura, number>>;
};

/** Item do catálogo de acessórios (ferragem, puxador, trilho…). */
export type Acessorio = {
  id: string;
  nome: string;
  /** Unidade de cobrança — "un", "par", "3 m"… Só rótulo. */
  unidade: string;
  custo: number;
  /**
   * Markup próprio do item. Sem ele vale o do bloco.
   *
   * Existe porque nem toda ferragem sai pelo mesmo multiplicador: puxador de
   * grife e dobradiça comum não têm a mesma margem. Opcional para o catálogo
   * não precisar de uma revisão inteira só por causa disso.
   */
  markup?: number;
};

/**
 * Serviço de mão de obra.
 *
 * Na planilha a mão de obra não tinha custo separado: ou era um preço final
 * digitado à mão, ou uma fórmula com o custo escondido dentro (`=80*G18*3`).
 * Aqui todo serviço tem custo unitário e markup próprios.
 */
export type ServicoMaoDeObra = {
  id: string;
  nome: string;
  unidade: string;
  custo: number;
  markup: number;
  /**
   * `true` quando a planilha só registrava o preço fechado e o custo real
   * nunca foi anotado. Nesses casos `custo` é o próprio preço e `markup` é 1 —
   * o total continua exato, e o campo fica marcado para ela preencher depois.
   */
  custoDesconhecido?: boolean;
};

export type LinhaChapa = { corId: string; espessura: Espessura; qnt: number };
export type LinhaFita = { corId: string; metros: number };
/**
 * Custo e markup que valem só nesta linha, deste projeto.
 *
 * "varia muito", nas palavras dela — o valor da mão de obra muda de obra para
 * obra, e o catálogo não consegue ser a verdade de todas. Ausente significa
 * "usa o do catálogo"; ausente e zero são coisas diferentes, e é por isso que
 * são opcionais em vez de terem zero como padrão.
 */
export type ValorProprio = {
  custo?: number;
  markup?: number;
};

export type LinhaAcessorio = { acessorioId: string; qnt: number } & ValorProprio;
export type LinhaMaoDeObra = { servicoId: string; qnt: number } & ValorProprio;

export type OrcamentoAmbiente = {
  id: string;
  nome: string;
  /**
   * O que a proposta do cliente mostra deste ambiente.
   *
   * `descritivo` é o texto dos módulos que ela escreve no cartão — "01 UN ·
   * Armário roupeiro com porta de giro em MDF Greige". Os três viajam junto
   * com o orçamento porque é a tela do orçamento que imprime a proposta, e
   * antes eles ficavam para trás no caminho.
   */
  descritivo?: string;
  material?: string;
  /** Texto de proposta — não confundir com o bloco `acessorios`, que é lista. */
  acessoriosTexto?: string;
  /** Ferragem só deste ambiente. Vazio cai no padrão do modelo da proposta. */
  ferragens?: string;
  /**
   * Ambiente do briefing que originou este, quando veio da ponte.
   *
   * Vínculo explícito em vez de casar por nome: os dois lados são editáveis,
   * e sem isso reaplicar a ponte depois de renomear duplicaria o ambiente.
   */
  origemBriefing?: string;
  chapas: LinhaChapa[];
  fita: LinhaFita[];
  acessorios: LinhaAcessorio[];
  maoDeObra: LinhaMaoDeObra[];
};

export type BlocoId = "chapas" | "fita" | "acessorios" | "maoDeObra";

/** Multiplicadores custo → venda. Um lugar só, valem para todos os ambientes. */
export type Markups = {
  chapas: number;
  fita: number;
  acessorios: number;
  /** ART (Anotação de Responsabilidade Técnica): acréscimo sobre o total. */
  art: number;
};

/* ── saída do cálculo ────────────────────────────────────────────────────── */

export type CodigoAlerta =
  /** Item escolhido mas quantidade em branco — some do total em silêncio. */
  | "sem-quantidade"
  /** Id que não existe mais no catálogo. */
  | "item-desconhecido"
  /** A cor existe, mas não é cotada naquela espessura. */
  | "sem-preco";

export type Alerta = {
  bloco: BlocoId;
  linha: number;
  codigo: CodigoAlerta;
  texto: string;
};

export type LinhaCalculada = {
  nome: string;
  detalhe: string;
  qnt: number;
  unidade: string;
  custoUnitario: number;
  custo: number;
  /**
   * O que esta linha vende: custo × markup × quantidade.
   *
   * Nasce na linha, e não no fim do bloco, porque acessórios e mão de obra
   * têm markup por item — o bloco não tem um multiplicador único para
   * aplicar. E porque a tela precisa mostrar o número: antes a linha dizia
   * "markup 3×" e só exibia custo, então a multiplicação parecia não estar
   * acontecendo.
   */
  venda: number;
};

export type BlocoCalculado = {
  id: BlocoId;
  titulo: string;
  linhas: LinhaCalculada[];
  custo: number;
  markup: number;
  venda: number;
};

export type AmbienteCalculado = {
  id: string;
  nome: string;
  blocos: Record<BlocoId, BlocoCalculado>;
  custoTotal: number;
  total: number;
  totalComArt: number;
  alertas: Alerta[];
};

export type ProjetoCalculado = {
  ambientes: AmbienteCalculado[];
  custoTotal: number;
  total: number;
  totalComArt: number;
  /** Quantos alertas somados em todos os ambientes. */
  alertas: number;
};
