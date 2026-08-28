/* ═══════════════════════════════════════════════════════════════════════════
   Exportação do orçamento para .xlsx.

   A fábrica e os fornecedores continuam trabalhando com planilha, então o
   dashboard precisa saber devolver uma. O arquivo sai no mesmo desenho da
   planilha antiga — aba "Resumo" mais uma aba por ambiente, com os quatro
   blocos lado a lado — só que com **valores**, não fórmulas: quem calcula
   agora é o dashboard, e reintroduzir as fórmulas seria reintroduzir os erros
   delas.

   Escrito na mão em vez de puxar uma biblioteca: um .xlsx é um zip com alguns
   XMLs, e o app não tem nenhuma dependência além do Next. O zip sai sem
   compressão (método "store"), que é legítimo pelo formato e dispensa
   implementar deflate.
   ═════════════════════════════════════════════════════════════════════════ */

import { calcularProjeto } from "./calculo";
import { CATALOGO_PADRAO, type Catalogo } from "./catalogo";
import { totalFinal } from "./derivar";
import type { AmbienteCalculado, BlocoId, OrcamentoAmbiente } from "./tipos";

/* ── zip ─────────────────────────────────────────────────────────────────── */

const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(dados: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < dados.length; i++) c = TABELA_CRC[(c ^ dados[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

type Arquivo = { nome: string; dados: Uint8Array };

/**
 * Monta um zip sem compressão.
 *
 * Só o necessário para o Excel abrir: cabeçalho local por arquivo, diretório
 * central e o registro de fim. Sem zip64, sem descritor de dados — um
 * orçamento não chega perto dos limites de 4 GB / 65535 entradas.
 */
function zipar(arquivos: Arquivo[]): Blob {
  const cod = new TextEncoder();
  // Anotados sobre ArrayBuffer (e não ArrayBufferLike) porque o Blob só aceita
  // buffer não compartilhado — `new Uint8Array(n)` já devolve assim.
  const locais: Uint8Array<ArrayBuffer>[] = [];
  const central: Uint8Array<ArrayBuffer>[] = [];
  let offset = 0;

  for (const a of arquivos) {
    const nome = cod.encode(a.nome);
    const crc = crc32(a.dados);
    const tam = a.dados.length;

    const local = new Uint8Array(30 + nome.length + tam);
    const vl = new DataView(local.buffer);
    vl.setUint32(0, 0x04034b50, true);
    vl.setUint16(4, 20, true); // versão necessária
    vl.setUint16(6, 0x0800, true); // nome de arquivo em UTF-8
    vl.setUint16(8, 0, true); // método: store
    vl.setUint16(10, 0, true); // hora
    vl.setUint16(12, 0x21, true); // data: 1980-01-01, o mínimo válido
    vl.setUint32(14, crc, true);
    vl.setUint32(18, tam, true);
    vl.setUint32(22, tam, true);
    vl.setUint16(26, nome.length, true);
    vl.setUint16(28, 0, true);
    local.set(nome, 30);
    local.set(a.dados, 30 + nome.length);
    locais.push(local);

    const dir = new Uint8Array(46 + nome.length);
    const vd = new DataView(dir.buffer);
    vd.setUint32(0, 0x02014b50, true);
    vd.setUint16(4, 20, true); // versão de quem escreveu
    vd.setUint16(6, 20, true);
    vd.setUint16(8, 0x0800, true);
    vd.setUint16(10, 0, true);
    vd.setUint16(12, 0, true);
    vd.setUint16(14, 0x21, true);
    vd.setUint32(16, crc, true);
    vd.setUint32(20, tam, true);
    vd.setUint32(24, tam, true);
    vd.setUint16(28, nome.length, true);
    vd.setUint32(42, offset, true);
    dir.set(nome, 46);
    central.push(dir);

    offset += local.length;
  }

  const tamCentral = central.reduce((s, c) => s + c.length, 0);
  const fim = new Uint8Array(22);
  const vf = new DataView(fim.buffer);
  vf.setUint32(0, 0x06054b50, true);
  vf.setUint16(8, arquivos.length, true);
  vf.setUint16(10, arquivos.length, true);
  vf.setUint32(12, tamCentral, true);
  vf.setUint32(16, offset, true);

  return new Blob([...locais, ...central, fim], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/* ── xml ─────────────────────────────────────────────────────────────────── */

/**
 * Escapa texto para XML.
 *
 * Sem regex de caractere de controle de propósito: o Excel recusa o arquivo
 * inteiro se um deles escapar, e a escapada em fonte já se perdeu uma vez na
 * ida e volta do arquivo. Filtrar por código é à prova disso.
 */
const esc = (s: string) =>
  Array.from(s)
    .filter((ch) => {
      const c = ch.charCodeAt(0);
      return c > 31 || c === 9 || c === 10 || c === 13;
    })
    .join("")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const CABECALHO = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

/** Estilo de célula: 0 normal, 1 negrito, 2 dinheiro, 3 dinheiro em negrito. */
type Estilo = 0 | 1 | 2 | 3;
type Celula = { v: string | number; s?: Estilo } | null;

const COLUNAS = "ABCDEFGH".split("");

function linha(n: number, celulas: Celula[]): string {
  const partes = celulas
    .map((c, i) => {
      if (c === null || c.v === "") return "";
      const ref = COLUNAS[i] + n;
      const s = c.s ? ` s="${c.s}"` : "";
      if (typeof c.v === "number") return `<c r="${ref}"${s}><v>${c.v}</v></c>`;
      return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(c.v)}</t></is></c>`;
    })
    .join("");
  return partes ? `<row r="${n}">${partes}</row>` : "";
}

function planilha(linhas: Celula[][], larguras: number[]): string {
  const cols = larguras
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
    .join("");
  const corpo = linhas.map((cs, i) => linha(i + 1, cs)).join("");
  return (
    CABECALHO +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<cols>${cols}</cols><sheetData>${corpo}</sheetData></worksheet>`
  );
}

const ESTILOS =
  CABECALHO +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;R$&quot;\\ #,##0.00"/></numFmts>' +
  '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>' +
  "<font><b/><sz val=\"11\"/><name val=\"Calibri\"/></font></fonts>" +
  '<fills count="2"><fill><patternFill patternType="none"/></fill>' +
  '<fill><patternFill patternType="gray125"/></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="4">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>' +
  "</cellXfs>" +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  "</styleSheet>";

/**
 * Nome de aba aceito pelo Excel: até 31 caracteres, sem `[]:*?/\`, e único no
 * arquivo. Ambientes com nome parecido ganham sufixo numérico.
 */
function nomeDeAba(bruto: string, usados: Set<string>): string {
  const base = (bruto.replace(/[[\]:*?/\\]/g, " ").trim() || "Ambiente").slice(0, 31);
  let nome = base;
  let i = 2;
  while (usados.has(nome.toLowerCase())) {
    const sufixo = " " + i++;
    nome = base.slice(0, 31 - sufixo.length) + sufixo;
  }
  usados.add(nome.toLowerCase());
  return nome;
}

/* ── conteúdo ────────────────────────────────────────────────────────────── */

const BLOCOS: BlocoId[] = ["chapas", "fita", "acessorios", "maoDeObra"];

/** Uma aba por ambiente, no desenho da planilha antiga. */
function abaDoAmbiente(a: AmbienteCalculado, comArt: boolean): Celula[][] {
  const ls: Celula[][] = [];
  const vazia = (): Celula[] => [];

  ls.push([{ v: a.nome, s: 1 }]);
  ls.push(vazia());

  for (const id of BLOCOS) {
    const b = a.blocos[id];
    ls.push([{ v: b.titulo, s: 1 }]);
    ls.push([
      { v: "ITEM", s: 1 },
      { v: "DETALHE", s: 1 },
      { v: "QNT", s: 1 },
      { v: "UNID", s: 1 },
      { v: "CUSTO UNIT", s: 1 },
      { v: "CUSTO TOTAL", s: 1 },
    ]);
    for (const l of b.linhas) {
      ls.push([
        { v: l.nome },
        { v: l.detalhe },
        { v: l.qnt },
        { v: l.unidade },
        { v: l.custoUnitario, s: 2 },
        { v: l.custo, s: 2 },
      ]);
    }
    ls.push([
      { v: "CUSTO " + b.titulo.toUpperCase(), s: 1 },
      null,
      null,
      null,
      null,
      { v: b.custo, s: 3 },
    ]);
    ls.push([
      {
        v:
          "VALOR DE VENDA " +
          b.titulo.toUpperCase() +
          (b.markup ? ` (${String(b.markup).replace(".", ",")}x)` : " (markup por item)"),
        s: 1,
      },
      null,
      null,
      null,
      null,
      { v: b.venda, s: 3 },
    ]);
    ls.push(vazia());
  }

  ls.push([{ v: "VALOR TOTAL DA VENDA", s: 1 }, null, null, null, null, { v: a.total, s: 3 }]);
  ls.push([
    { v: comArt ? "VALOR TOTAL DA VENDA COM ART" : "VALOR TOTAL DA VENDA", s: 1 },
    null,
    null,
    null,
    null,
    { v: totalFinal(a, comArt), s: 3 },
  ]);

  if (a.alertas.length) {
    ls.push([]);
    ls.push([{ v: "PENDÊNCIAS", s: 1 }]);
    for (const al of a.alertas) ls.push([{ v: al.texto }]);
  }

  return ls;
}

/** A aba "Resumo" — desta vez somada, não digitada. */
function abaResumo(
  nomeProjeto: string,
  cliente: string,
  ambientes: AmbienteCalculado[],
  totais: { custo: number; total: number; comArt: number },
  comArt: boolean,
): Celula[][] {
  const ls: Celula[][] = [];
  ls.push([{ v: nomeProjeto, s: 1 }]);
  ls.push([{ v: cliente }]);
  ls.push([
    {
      v:
        "Gerado pelo dashboard em " +
        new Date().toLocaleDateString("pt-BR") +
        " · valores calculados, sem fórmulas",
    },
  ]);
  ls.push([]);
  ls.push([
    { v: "AMBIENTE", s: 1 },
    { v: "CUSTO", s: 1 },
    { v: "VALOR SEM ART", s: 1 },
    { v: "VALOR COM ART", s: 1 },
  ]);
  for (const a of ambientes) {
    ls.push([
      { v: a.nome },
      { v: a.custoTotal, s: 2 },
      { v: a.total, s: 2 },
      { v: totalFinal(a, comArt), s: 2 },
    ]);
  }
  ls.push([
    { v: "TOTAL", s: 1 },
    { v: totais.custo, s: 3 },
    { v: totais.total, s: 3 },
    { v: totais.comArt, s: 3 },
  ]);
  return ls;
}

/* ── api ─────────────────────────────────────────────────────────────────── */

export function gerarXlsx(
  nomeProjeto: string,
  cliente: string,
  ambientes: OrcamentoAmbiente[],
  cat: Catalogo = CATALOGO_PADRAO,
  comArt = true,
): Blob {
  const proj = calcularProjeto(ambientes, cat);
  const cod = new TextEncoder();

  const usados = new Set<string>(["resumo"]);
  const abas: { nome: string; xml: string }[] = [
    {
      nome: "Resumo",
      xml: planilha(
        abaResumo(nomeProjeto, cliente, proj.ambientes, {
          custo: proj.custoTotal,
          total: proj.total,
          comArt: totalFinal(proj, comArt),
        }, comArt),
        [34, 16, 16, 16],
      ),
    },
    ...proj.ambientes.map((a) => ({
      nome: nomeDeAba(a.nome, usados),
      xml: planilha(abaDoAmbiente(a, comArt), [40, 16, 9, 9, 14, 14]),
    })),
  ];

  const rels = abas
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
    )
    .join("");

  const arquivos: Arquivo[] = [
    {
      nome: "[Content_Types].xml",
      dados: cod.encode(
        CABECALHO +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
          abas
            .map(
              (_, i) =>
                `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
            )
            .join("") +
          '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
          "</Types>",
      ),
    },
    {
      nome: "_rels/.rels",
      dados: cod.encode(
        CABECALHO +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
          "</Relationships>",
      ),
    },
    {
      nome: "xl/workbook.xml",
      dados: cod.encode(
        CABECALHO +
          '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
          abas
            .map((a, i) => `<sheet name="${esc(a.nome)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
            .join("") +
          "</sheets></workbook>",
      ),
    },
    {
      nome: "xl/_rels/workbook.xml.rels",
      dados: cod.encode(
        CABECALHO +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          rels +
          `<Relationship Id="rId${abas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
          "</Relationships>",
      ),
    },
    { nome: "xl/styles.xml", dados: cod.encode(ESTILOS) },
    ...abas.map((a, i) => ({
      nome: `xl/worksheets/sheet${i + 1}.xml`,
      dados: cod.encode(a.xml),
    })),
  ];

  return zipar(arquivos);
}

/** Nome de arquivo sem acento nem espaço, que sobrevive a qualquer sistema. */
export function nomeDeArquivo(nomeProjeto: string): string {
  const limpo = nomeProjeto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  const hoje = new Date().toISOString().slice(0, 10);
  return `orcamento-${limpo || "projeto"}-${hoje}.xlsx`;
}

/** Gera e entrega o arquivo ao navegador. */
export function baixarXlsx(
  nomeProjeto: string,
  cliente: string,
  ambientes: OrcamentoAmbiente[],
  cat: Catalogo = CATALOGO_PADRAO,
  comArt = true,
): void {
  const blob = gerarXlsx(nomeProjeto, cliente, ambientes, cat, comArt);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeDeArquivo(nomeProjeto);
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revogar na hora cancela o download em alguns navegadores; um tick basta.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
