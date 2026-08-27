// Editor de texto tolerante a CRLF: normaliza tudo para \n, aplica as trocas e
// devolve o arquivo com o fim de linha que ele já usava.
const fs = require("fs");
module.exports = function editar(caminho, pares) {
  const original = fs.readFileSync(caminho, "utf8");
  const crlf = original.includes("\r\n");
  let s = original.replace(/\r\n/g, "\n");
  let n = 0;
  for (const [de, para] of pares) {
    const d = de.replace(/\r\n/g, "\n");
    if (!s.includes(d)) throw new Error(caminho + " — não achei:\n" + d.slice(0, 120));
    s = s.split(d).join(para.replace(/\r\n/g, "\n"));
    n++;
  }
  fs.writeFileSync(caminho, crlf ? s.replace(/\n/g, "\r\n") : s);
  return n;
};
