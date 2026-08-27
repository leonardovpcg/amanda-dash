"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Tabela de valores — a aba de catálogo da planilha, editável.

   Na planilha, reajustar a fita de borda significava abrir 19 abas e corrigir
   a fórmula em cada uma, porque os R$ 2,00/m estavam escritos dentro dela.
   Aqui todo preço e todo markup ficam nesta tela, e cada tecla digitada já
   recalcula os orçamentos abertos.

   Salva a cada alteração, direto no catálogo — não tem botão "salvar" para
   ninguém perder o reajuste por trocar de aba.
   ═════════════════════════════════════════════════════════════════════════ */

import { useSyncExternalStore } from "react";
import { brl } from "@/lib/orcamento/calculo";
import {
  assinarCatalogo,
  assinarStatusCatalogo,
  catalogoEditado,
  guardarCatalogo,
  lerCatalogo,
  lerCatalogoNoServidor,
  lerStatusCatalogo,
  lerStatusCatalogoNoServidor,
  restaurarCatalogo,
  type Catalogo,
} from "@/lib/orcamento/catalogo";
import { ESPESSURAS, type Espessura } from "@/lib/orcamento/tipos";
import SinalDeArmazem from "./StatusDoArmazem";
import { MONO, NUM, cardTitle, colLabel, mono, panel, sectionTitle } from "./ui";

/** Aceita "12", "1,5" e "1.250,5"; devolve `null` para campo vazio. */
const lerNumero = (s: string): number | null => {
  if (!s.trim()) return null;
  const n = parseFloat(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const paraCampo = (n: number | undefined) =>
  n === undefined ? "" : String(n).replace(".", ",");

export default function TabelaValores() {
  const cat = useSyncExternalStore(assinarCatalogo, lerCatalogo, lerCatalogoNoServidor);
  const editada = catalogoEditado(cat);

  const salvar = (fn: (c: Catalogo) => Catalogo) => guardarCatalogo(fn(cat));

  return (
    <>
      <div className="dash-ajustes-cabeca">
        <div>
          <h2 style={sectionTitle}>Tabela de valores</h2>
          <div style={{ fontSize: "13px", color: "#6E6A5F", marginTop: 6 }}>
            Preço de custo e multiplicador de venda. Vale para todos os orçamentos.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <SinalDeArmazem
            assinar={assinarStatusCatalogo}
            ler={lerStatusCatalogo}
            lerNoServidor={lerStatusCatalogoNoServidor}
            rotuloPadrao="valores da planilha"
            rotuloEditado="editada"
            editado={editada}
          />
          <button
            className="dash-btn-outline"
            onClick={restaurarCatalogo}
            disabled={!editada}
            style={{
              borderRadius: 999,
              padding: "9px 16px",
              fontSize: "12.5px",
              opacity: editada ? 1 : 0.45,
            }}
          >
            Restaurar da planilha
          </button>
        </div>
      </div>

      {/* ── multiplicadores ───────────────────────────────────────────── */}
      <div style={{ ...panel, padding: "28px 30px", marginTop: 22 }}>
        <div style={cardTitle}>Multiplicadores de venda</div>
        <div style={{ fontSize: "13px", color: "#6E6A5F", marginTop: 6 }}>
          Quanto o custo é multiplicado para virar preço. Mão de obra tem markup por serviço,
          na lista mais abaixo.
        </div>
        <div className="dash-tab-markups">
          <Campo
            rotulo="Chapas"
            valor={paraCampo(cat.markups.chapas)}
            sufixo="×"
            onChange={(v) =>
              salvar((c) => ({ ...c, markups: { ...c.markups, chapas: v ?? c.markups.chapas } }))
            }
          />
          <Campo
            rotulo="Fita de borda"
            valor={paraCampo(cat.markups.fita)}
            sufixo="×"
            onChange={(v) =>
              salvar((c) => ({ ...c, markups: { ...c.markups, fita: v ?? c.markups.fita } }))
            }
          />
          <Campo
            rotulo="Acessórios"
            valor={paraCampo(cat.markups.acessorios)}
            sufixo="×"
            onChange={(v) =>
              salvar((c) => ({
                ...c,
                markups: { ...c.markups, acessorios: v ?? c.markups.acessorios },
              }))
            }
          />
          <Campo
            rotulo="ART"
            valor={paraCampo(Math.round((cat.markups.art - 1) * 1000) / 10)}
            sufixo="%"
            ajuda="acréscimo sobre o total"
            onChange={(v) =>
              salvar((c) => ({
                ...c,
                markups: { ...c.markups, art: v === null ? c.markups.art : 1 + v / 100 },
              }))
            }
          />
          <Campo
            rotulo="Fita por metro"
            valor={paraCampo(cat.fitaPorMetro)}
            prefixo="R$"
            ajuda="custo, igual para toda cor"
            onChange={(v) => salvar((c) => ({ ...c, fitaPorMetro: v ?? c.fitaPorMetro }))}
          />
        </div>
      </div>

      {/* ── chapas ────────────────────────────────────────────────────── */}
      <div style={{ ...panel, padding: "28px 30px 14px", marginTop: 20 }}>
        <Cabecalho titulo="Chapas" contagem={`${cat.cores.length} cores`} />
        <div className="dash-scroll-x">
          <div>
            <div className="dash-tab-chapas dash-tab-head">
              <div style={colLabel()}>Cor</div>
              <div style={colLabel()}>Fabricante</div>
              {ESPESSURAS.map((e) => (
                <div key={e} style={colLabel("right")}>
                  {e} mm
                </div>
              ))}
              <div />
            </div>
            {cat.cores.map((cor, i) => (
              <div key={cor.id} className="dash-tab-chapas dash-tab-linha">
                <Texto
                  valor={cor.nome}
                  onChange={(v) =>
                    salvar((c) => ({
                      ...c,
                      cores: c.cores.map((x, k) => (k === i ? { ...x, nome: v } : x)),
                    }))
                  }
                />
                <Texto
                  valor={cor.fabricante}
                  onChange={(v) =>
                    salvar((c) => ({
                      ...c,
                      cores: c.cores.map((x, k) => (k === i ? { ...x, fabricante: v } : x)),
                    }))
                  }
                />
                {ESPESSURAS.map((esp) => (
                  <Preco
                    key={esp}
                    valor={paraCampo(cor.precos[esp])}
                    onChange={(v) =>
                      salvar((c) => ({
                        ...c,
                        cores: c.cores.map((x, k) => {
                          if (k !== i) return x;
                          const precos = { ...x.precos };
                          // Campo vazio significa "não é cotada nessa espessura",
                          // como a Argila em 6 mm na planilha — não é zero.
                          if (v === null) delete precos[esp as Espessura];
                          else precos[esp as Espessura] = v;
                          return { ...x, precos };
                        }),
                      }))
                    }
                  />
                ))}
                <Remover
                  rotulo={cor.nome}
                  onClick={() =>
                    salvar((c) => ({ ...c, cores: c.cores.filter((_, k) => k !== i) }))
                  }
                />
              </div>
            ))}
          </div>
        </div>
        <Adicionar
          rotulo="+ cor"
          onClick={() =>
            salvar((c) => ({
              ...c,
              cores: [
                ...c.cores,
                { id: "cor" + Date.now(), nome: "Nova cor", fabricante: "—", precos: {} },
              ],
            }))
          }
        />
      </div>

      {/* ── acessórios ────────────────────────────────────────────────── */}
      <div style={{ ...panel, padding: "28px 30px 14px", marginTop: 20 }}>
        <Cabecalho titulo="Acessórios" contagem={`${cat.acessorios.length} itens`} />
        <div className="dash-scroll-x">
          <div>
            <div className="dash-tab-acess dash-tab-head">
              <div style={colLabel()}>Item</div>
              <div style={colLabel()}>Unidade</div>
              <div style={colLabel("right")}>Custo</div>
              <div style={colLabel("right")}>Venda</div>
              <div />
            </div>
            {cat.acessorios.map((a, i) => (
              <div key={a.id} className="dash-tab-acess dash-tab-linha">
                <Texto
                  valor={a.nome}
                  onChange={(v) =>
                    salvar((c) => ({
                      ...c,
                      acessorios: c.acessorios.map((x, k) => (k === i ? { ...x, nome: v } : x)),
                    }))
                  }
                />
                <Texto
                  valor={a.unidade}
                  onChange={(v) =>
                    salvar((c) => ({
                      ...c,
                      acessorios: c.acessorios.map((x, k) => (k === i ? { ...x, unidade: v } : x)),
                    }))
                  }
                />
                <Preco
                  valor={paraCampo(a.custo)}
                  onChange={(v) =>
                    salvar((c) => ({
                      ...c,
                      acessorios: c.acessorios.map((x, k) => (k === i ? { ...x, custo: v ?? 0 } : x)),
                    }))
                  }
                />
                <Calculado valor={brl(a.custo * cat.markups.acessorios)} />
                <Remover
                  rotulo={a.nome}
                  onClick={() =>
                    salvar((c) => ({ ...c, acessorios: c.acessorios.filter((_, k) => k !== i) }))
                  }
                />
              </div>
            ))}
          </div>
        </div>
        <Adicionar
          rotulo="+ acessório"
          onClick={() =>
            salvar((c) => ({
              ...c,
              acessorios: [
                ...c.acessorios,
                { id: "ace" + Date.now(), nome: "Novo acessório", unidade: "un", custo: 0 },
              ],
            }))
          }
        />
      </div>

      {/* ── mão de obra ───────────────────────────────────────────────── */}
      <div style={{ ...panel, padding: "28px 30px 14px", marginTop: 20 }}>
        <Cabecalho titulo="Mão de obra" contagem={`${cat.maoDeObra.length} serviços`} />
        <div style={{ fontSize: "12.5px", color: "#8C887C", marginTop: 6 }}>
          Cada serviço tem markup próprio. Custo em branco vira pendência no orçamento que o usar.
        </div>
        <div className="dash-scroll-x">
          <div>
            <div className="dash-tab-mao dash-tab-head">
              <div style={colLabel()}>Serviço</div>
              <div style={colLabel()}>Unidade</div>
              <div style={colLabel("right")}>Custo</div>
              <div style={colLabel("right")}>Markup</div>
              <div style={colLabel("right")}>Venda</div>
              <div />
            </div>
            {cat.maoDeObra.map((s, i) => (
              <div key={s.id} className="dash-tab-mao dash-tab-linha">
                <div>
                  <Texto
                    valor={s.nome}
                    onChange={(v) =>
                      salvar((c) => ({
                        ...c,
                        maoDeObra: c.maoDeObra.map((x, k) => (k === i ? { ...x, nome: v } : x)),
                      }))
                    }
                  />
                  {s.custoDesconhecido && (
                    <div style={{ ...mono(10, "#9C2B22"), marginTop: 2 }}>custo a levantar</div>
                  )}
                </div>
                <Texto
                  valor={s.unidade}
                  onChange={(v) =>
                    salvar((c) => ({
                      ...c,
                      maoDeObra: c.maoDeObra.map((x, k) => (k === i ? { ...x, unidade: v } : x)),
                    }))
                  }
                />
                <Preco
                  valor={paraCampo(s.custo || undefined)}
                  onChange={(v) =>
                    salvar((c) => ({
                      ...c,
                      maoDeObra: c.maoDeObra.map((x, k) =>
                        k === i
                          ? // Preencher o custo tira a marca de "a levantar".
                            { ...x, custo: v ?? 0, custoDesconhecido: v === null ? true : undefined }
                          : x,
                      ),
                    }))
                  }
                />
                <Preco
                  valor={paraCampo(s.markup)}
                  sufixo="×"
                  onChange={(v) =>
                    salvar((c) => ({
                      ...c,
                      maoDeObra: c.maoDeObra.map((x, k) => (k === i ? { ...x, markup: v ?? 1 } : x)),
                    }))
                  }
                />
                <Calculado valor={brl(s.custo * s.markup)} />
                <Remover
                  rotulo={s.nome}
                  onClick={() =>
                    salvar((c) => ({ ...c, maoDeObra: c.maoDeObra.filter((_, k) => k !== i) }))
                  }
                />
              </div>
            ))}
          </div>
        </div>
        <Adicionar
          rotulo="+ serviço"
          onClick={() =>
            salvar((c) => ({
              ...c,
              maoDeObra: [
                ...c.maoDeObra,
                {
                  id: "mao" + Date.now(),
                  nome: "Novo serviço",
                  unidade: "un",
                  custo: 0,
                  markup: 2,
                  custoDesconhecido: true,
                },
              ],
            }))
          }
        />
      </div>
    </>
  );
}

/* ── peças da tela ────────────────────────────────────────────────────── */

function Cabecalho({ titulo, contagem }: { titulo: string; contagem: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
      <div style={cardTitle}>{titulo}</div>
      <div style={{ fontFamily: MONO, fontSize: "11px", color: "#9A9689" }}>{contagem}</div>
    </div>
  );
}

function Campo({
  rotulo,
  valor,
  prefixo,
  sufixo,
  ajuda,
  onChange,
}: {
  rotulo: string;
  valor: string;
  prefixo?: string;
  sufixo?: string;
  ajuda?: string;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <div style={mono(10, "#9A9689", { ls: "0.07em", upper: true })}>{rotulo}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
        {prefixo && <span style={{ fontSize: "14px", color: "#6E6A5F" }}>{prefixo}</span>}
        <input
          className="dash-field dash-field-sm"
          inputMode="decimal"
          value={valor}
          onChange={(e) => onChange(lerNumero(e.target.value))}
          style={{ width: 84, textAlign: "right", ...NUM }}
        />
        {sufixo && <span style={{ fontSize: "14px", color: "#6E6A5F" }}>{sufixo}</span>}
      </div>
      {ajuda && <div style={{ ...mono(10, "#A8A498"), marginTop: 6 }}>{ajuda}</div>}
    </div>
  );
}

function Texto({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  return (
    <input
      className="dash-inline"
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      style={{ fontSize: "13.5px", width: "100%", minWidth: 0 }}
    />
  );
}

function Preco({
  valor,
  sufixo,
  onChange,
}: {
  valor: string;
  sufixo?: string;
  onChange: (v: number | null) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
      <input
        className="dash-field dash-field-sm"
        inputMode="decimal"
        value={valor}
        placeholder="—"
        onChange={(e) => onChange(lerNumero(e.target.value))}
        style={{ width: "100%", minWidth: 0, textAlign: "right", ...NUM }}
      />
      {sufixo && <span style={{ fontSize: "12px", color: "#9A9689" }}>{sufixo}</span>}
    </div>
  );
}

function Calculado({ valor }: { valor: string }) {
  return (
    <div style={{ fontSize: "12.5px", textAlign: "right", fontWeight: 600, color: "#A84B1C", ...NUM }}>
      {valor}
    </div>
  );
}

function Remover({ rotulo, onClick }: { rotulo: string; onClick: () => void }) {
  return (
    <button
      className="dash-btn-step"
      onClick={onClick}
      aria-label={"Remover " + rotulo}
      style={{ borderRadius: 999, width: 24, height: 24, fontSize: "12px", lineHeight: 1 }}
    >
      ×
    </button>
  );
}

function Adicionar({ rotulo, onClick }: { rotulo: string; onClick: () => void }) {
  return (
    <button
      className="dash-btn-link"
      onClick={onClick}
      style={{ padding: "12px 0", fontSize: "12.5px", color: "#A84B1C" }}
    >
      {rotulo}
    </button>
  );
}
