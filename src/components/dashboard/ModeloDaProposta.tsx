"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   O modelo da proposta — o que ela escreve uma vez e esquece.

   Tudo aqui é texto que sai igual em toda proposta: ferragens, as observações
   do rodapé, as condições comerciais, o institucional e o fecho. O que muda
   de ambiente para ambiente (itens, material, acessórios) fica no cartão do
   ambiente, dentro do projeto — não aqui.

   Grava a cada tecla, como o catálogo e o roteiro: é um documento só, a
   escrita é otimista, e um botão "salvar" numa tela de texto corrido é um
   convite a perder o que foi digitado.
   ═════════════════════════════════════════════════════════════════════════ */

import { useSyncExternalStore } from "react";
import {
  assinarModelo,
  assinarStatusModelo,
  guardarModelo,
  lerModelo,
  lerModeloNoServidor,
  lerStatusModelo,
  lerStatusModeloNoServidor,
  modeloEditado,
  restaurarModelo,
  type ModeloDaProposta,
} from "@/lib/proposta/modelo";
import SinalDeArmazem from "./StatusDoArmazem";
import { cardTitle, colLabel, panel, sectionTitle } from "./ui";

/** Os campos de uma linha só, na ordem em que aparecem na proposta. */
const CURTOS: [keyof ModeloDaProposta, string, string][] = [
  ["ferragens", "Ferragens", "Uma por linha · padrão da loja, que o ambiente pode trocar"],
  ["pagamento", "Forma de pagamento", ""],
  ["garantia", "Garantia", ""],
  ["prazo", "Prazo de entrega", ""],
  ["validade", "Validade da proposta", "Quanto tempo o preço vale"],
];

const LONGOS: [keyof ModeloDaProposta, string, string][] = [
  ["empresa", "Nossa empresa", "Abre a proposta, logo abaixo do cliente"],
  ["despedida", "Despedida", ""],
];

/** Nome e telefone de quem responde pela proposta, lado a lado no fecho. */
const ASSINATURA: [keyof ModeloDaProposta, keyof ModeloDaProposta, string][] = [
  ["proprietario", "telefoneProprietario", "Proprietário"],
  ["consultora", "telefoneConsultora", "Consultora"],
];

export default function ModeloEditor() {
  const modelo = useSyncExternalStore(assinarModelo, lerModelo, lerModeloNoServidor);
  const editado = modeloEditado(modelo);

  const trocar = (campo: keyof ModeloDaProposta, v: string | string[]) =>
    guardarModelo({ ...modelo, [campo]: v });

  // As observações são lista, e a lista é editada como texto: uma por linha.
  // Botão de "+ observação" para três frases que quase nunca mudam seria mais
  // clique do que digitar.
  const obs = modelo.observacoes.join("\n");

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <div>
          <h2 style={sectionTitle}>Modelo da proposta</h2>
          <p style={{ fontSize: "13px", color: "#8C887C", margin: "6px 0 0", maxWidth: 620 }}>
            O que sai igual em toda proposta. Itens, material e acessórios de cada ambiente
            ficam dentro do projeto — e a ferragem daqui vale para todo ambiente que não
            tiver a sua.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <SinalDeArmazem
            assinar={assinarStatusModelo}
            ler={lerStatusModelo}
            lerNoServidor={lerStatusModeloNoServidor}
            rotuloPadrao="modelo padrão"
            rotuloEditado="editado"
            editado={editado}
          />
          <button
            className="dash-btn"
            onClick={restaurarModelo}
            disabled={!editado}
            style={{
              borderRadius: 999,
              padding: "9px 16px",
              fontSize: "12.5px",
              opacity: editado ? 1 : 0.45,
            }}
          >
            Restaurar padrão
          </button>
        </div>
      </div>

      <div style={{ ...panel, padding: "22px 24px", display: "grid", gap: 18 }}>
        <h3 style={cardTitle}>Condições</h3>
        {CURTOS.map(([campo, rotulo, dica]) => (
          <Campo
            key={campo}
            rotulo={rotulo}
            dica={dica}
            valor={modelo[campo] as string}
            onChange={(v) => trocar(campo, v)}
          />
        ))}
        <Campo
          rotulo="Observações"
          dica="Uma por linha — saem numeradas na página de condições"
          valor={obs}
          linhas={Math.max(3, modelo.observacoes.length + 1)}
          onChange={(v) => trocar("observacoes", v.split("\n"))}
        />
      </div>

      <div style={{ ...panel, padding: "22px 24px", display: "grid", gap: 18, marginTop: 16 }}>
        <h3 style={cardTitle}>Texto e fecho</h3>
        {LONGOS.map(([campo, rotulo, dica]) => (
          <Campo
            key={campo}
            rotulo={rotulo}
            dica={dica}
            valor={modelo[campo] as string}
            linhas={4}
            onChange={(v) => trocar(campo, v)}
          />
        ))}
        {ASSINATURA.map(([campo, tel, rotulo]) => (
          <div key={campo} style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 14 }}>
            <Campo
              rotulo={rotulo}
              valor={modelo[campo] as string}
              onChange={(v) => trocar(campo, v)}
            />
            <Campo
              rotulo="Telefone"
              valor={modelo[tel] as string}
              onChange={(v) => trocar(tel, v)}
            />
          </div>
        ))}
        <Campo
          rotulo="Endereço e contato"
          dica="Fecha a última página, abaixo das assinaturas"
          valor={modelo.contato}
          onChange={(v) => trocar("contato", v)}
        />
      </div>
    </>
  );
}

function Campo({
  rotulo,
  dica,
  valor,
  linhas,
  onChange,
}: {
  rotulo: string;
  dica?: string;
  valor: string;
  linhas?: number;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div style={colLabel()}>{rotulo}</div>
      {dica ? (
        <div style={{ fontSize: "11.5px", color: "#9A9689", marginTop: 2 }}>{dica}</div>
      ) : null}
      <textarea
        className="dash-inline"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        rows={linhas ?? Math.max(1, valor.split("\n").length)}
        style={{
          fontSize: "13.5px",
          lineHeight: 1.55,
          width: "100%",
          marginTop: 5,
          resize: "vertical",
        }}
      />
    </div>
  );
}
