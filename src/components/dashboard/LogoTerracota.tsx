/* ═══════════════════════════════════════════════════════════════════════════
   Marca da Terracota Móveis Planejados.

   O símbolo é redesenhado em SVG (e não o PNG da papelaria) para ficar nítido
   em qualquer tamanho e para poder herdar cor. Geometria: um octógono cortado
   em quatro braços iguais girados de 90 em 90 graus em torno do centro, com um
   losango vazado no meio; cada braço leva uma fresta branca paralela à aresta
   externa. Os dois tons alternam a cada braço, como na marca impressa.

   Se um dia a loja mandar o arquivo vetorial oficial, é só trocar o miolo do
   <svg> aqui — nada mais no dashboard conhece essas coordenadas.
   ═════════════════════════════════════════════════════════════════════════ */

/** Um braço do cata-vento, na posição superior-direita (giro 0). */
const CORPO = "M34.12 6 H57.5 L87.69 36.19 L76 47.88 Z";
/** A lasca separada pela fresta, junto da aresta externa do mesmo braço. */
const LASCA = "M62 6 H68 L92.94 30.94 L89.94 33.94 Z";

/** Giro de cada braço e o tom que ele recebe — claro e escuro se alternam. */
const BRACOS = [0, 90, 180, 270] as const;

export function SimboloTerracota({
  size = 34,
  escura = "#8E2C0B",
  clara = "#C0663C",
}: {
  size?: number;
  /** Tom queimado, nos braços superior-esquerdo e inferior-direito. */
  escura?: string;
  /** Tom alaranjado, nos outros dois. */
  clara?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden
      style={{ display: "block", flex: "none" }}
    >
      {BRACOS.map((giro, i) => (
        <g key={giro} transform={`rotate(${giro} 50 50)`} fill={i % 2 ? escura : clara}>
          <path d={CORPO} />
          <path d={LASCA} />
        </g>
      ))}
    </svg>
  );
}

/**
 * Símbolo + assinatura. O texto é tipografia do dashboard (Manrope), não a
 * fonte da papelaria: pareado com o símbolo ele lê como a marca, e num painel
 * de 13px não briga com o resto da interface.
 */
export default function LogoTerracota({ size = 34 }: { size?: number }) {
  return (
    <div className="dash-logo" role="img" aria-label="Terracota Móveis Planejados">
      <SimboloTerracota size={size} />
      <span className="dash-logo-texto" aria-hidden>
        <span className="dash-logo-nome">TERRACOTA</span>
        <span className="dash-logo-tag">Móveis Planejados</span>
      </span>
    </div>
  );
}
