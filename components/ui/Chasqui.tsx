/**
 * Chasqui: la mascota de Patitas Connect.
 * Un perro dorado con chullo (el gorro andino). Los chasquis eran los mensajeros que
 * corrían los caminos del Tahuantinsuyo: un perro que lleva y trae noticias de tu mascota.
 */

export const INK = '#0f172a'
export const FUR = '#f4b04a'
export const FUR_D = '#e08a1e'
export const EAR = '#b45309'
export const MUZ = '#fde7b8'
export const ORG = '#cd4f27'
export const ORG_D = '#8a2f16'
export const CREAM = '#fff4ea'
const PINK = '#fb7185'

/** Siluetas de la cabeza. Se dibujan dos veces: una en tinta gruesa (contorno) y otra con color. */
function HeadShapes({ fill, stroke, sw, hat }: { fill: string; stroke?: string; sw?: number; hat: boolean }) {
  const p = { fill, stroke, strokeWidth: sw, strokeLinejoin: 'round' as const }
  return (
    <>
      <ellipse cx="24" cy="72" rx="13" ry="27" transform="rotate(12 24 72)" {...p} />
      <ellipse cx="96" cy="72" rx="13" ry="27" transform="rotate(-12 96 72)" {...p} />
      <ellipse cx="60" cy="70" rx="33" ry="31" {...p} />
      {hat && (
        <>
          <path d="M26 52 C26 26 42 10 60 6 C78 10 94 26 94 52Z" {...p} />
          <circle cx="60" cy="6" r="9" {...p} />
        </>
      )}
    </>
  )
}

/** Cabeza de Chasqui (con o sin chullo). */
export function ChasquiHead({ hat = true, className }: { hat?: boolean; className?: string }) {
  const zig = Array.from({ length: 9 }, (_, i) => `${i === 0 ? 'M' : 'L'}${30 + i * 7.5} ${i % 2 ? 34 : 41}`).join(' ')
  const band = Array.from({ length: 9 }, (_, i) => `M${25 + i * 8.2} 58 l4.1 -10 l4.1 10Z`).join(' ')
  return (
    <svg viewBox="-4 -8 128 128" className={className} aria-hidden>
      <HeadShapes fill={INK} stroke={INK} sw={7} hat={hat} />
      {/* orejas y cabeza */}
      <ellipse cx="24" cy="72" rx="13" ry="27" transform="rotate(12 24 72)" fill={EAR} />
      <ellipse cx="96" cy="72" rx="13" ry="27" transform="rotate(-12 96 72)" fill={EAR} />
      <ellipse cx="60" cy="70" rx="33" ry="31" fill={FUR} />
      <ellipse cx="46" cy="52" rx="10" ry="6" fill="#fff" opacity=".22" transform="rotate(-20 46 52)" />
      {/* hocico */}
      <ellipse cx="60" cy="84" rx="18" ry="13.5" fill={MUZ} />
      <path d="M54 93 Q60 108 66 93Z" fill={PINK} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M51 75 Q60 68 69 75 Q67 83 60 84 Q53 83 51 75Z" fill={INK} />
      <ellipse cx="56" cy="74" rx="2.2" ry="1.2" fill="#fff" opacity=".5" />
      <path d="M60 84 V90 M60 90 Q53 96 47 91 M60 90 Q67 96 73 91" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {/* ojos */}
      <circle cx="46" cy="64" r="4.6" fill={INK} />
      <circle cx="74" cy="64" r="4.6" fill={INK} />
      <circle cx="47.6" cy="62.4" r="1.6" fill="#fff" />
      <circle cx="75.6" cy="62.4" r="1.6" fill="#fff" />
      {hat && (
        <>
          {/* chullo */}
          <path d="M26 52 C26 26 42 10 60 6 C78 10 94 26 94 52Z" fill={ORG} />
          <path d={zig} fill="none" stroke={CREAM} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M30 27 C42 17 52 14 60 13" stroke="#fff" strokeOpacity=".28" strokeWidth="3" fill="none" strokeLinecap="round" />
          <rect x="24" y="48" width="72" height="12" rx="3" fill={ORG_D} stroke={INK} strokeWidth="1.6" />
          <path d={band} fill={CREAM} />
          <circle cx="60" cy="6" r="9" fill={CREAM} />
          <circle cx="57" cy="3" r="3" fill="#fff" opacity=".7" />
          {/* orejeras del chullo */}
          <path d="M26 60 Q18 76 24 92 L34 88 Q31 74 34 60Z" fill={ORG} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M94 60 Q102 76 96 92 L86 88 Q89 74 86 60Z" fill={ORG} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
          <circle cx="29" cy="94" r="4" fill={CREAM} stroke={INK} strokeWidth="2" />
          <circle cx="91" cy="94" r="4" fill={CREAM} stroke={INK} strokeWidth="2" />
        </>
      )}
    </svg>
  )
}

/** Busto de Chasqui (cabeza, cuello con chapita y pecho). El brazo levantado va aparte para animarlo. */
export function ChasquiBust({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 190 210" className={className} aria-hidden>
      {/* cuerpo */}
      <path d="M12 210 C12 150 44 126 95 126 C146 126 178 150 178 210Z" fill={INK} stroke={INK} strokeWidth="8" strokeLinejoin="round" />
      <path d="M12 210 C12 150 44 126 95 126 C146 126 178 150 178 210Z" fill={FUR} />
      <ellipse cx="95" cy="186" rx="34" ry="30" fill={MUZ} />
      <path d="M48 168 C34 176 28 192 28 210 L12 210 C12 188 24 172 48 168Z" fill={FUR_D} opacity=".5" />
      {/* collar con chapita */}
      <path d="M50 128 Q95 150 140 128 L146 142 Q95 166 44 142Z" fill={ORG} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M62 140 Q95 156 128 140" stroke={CREAM} strokeWidth="2" strokeDasharray="3 4" fill="none" />
      <circle cx="95" cy="160" r="9" fill="#ffd23f" stroke={INK} strokeWidth="2.6" />
      <circle cx="95" cy="160" r="3" fill={ORG_D} />
      {/* cabeza */}
      <g transform="translate(15 -2) scale(1.33)">
        <ChasquiHeadInner />
      </g>
    </svg>
  )
}

/** Contenido de la cabeza sin el <svg> contenedor, para anidarla en otras escenas. */
function ChasquiHeadInner() {
  const zig = Array.from({ length: 9 }, (_, i) => `${i === 0 ? 'M' : 'L'}${30 + i * 7.5} ${i % 2 ? 34 : 41}`).join(' ')
  const band = Array.from({ length: 9 }, (_, i) => `M${25 + i * 8.2} 58 l4.1 -10 l4.1 10Z`).join(' ')
  return (
    <g>
      <HeadShapes fill={INK} stroke={INK} sw={6} hat />
      <ellipse cx="24" cy="72" rx="13" ry="27" transform="rotate(12 24 72)" fill={EAR} />
      <ellipse cx="96" cy="72" rx="13" ry="27" transform="rotate(-12 96 72)" fill={EAR} />
      <ellipse cx="60" cy="70" rx="33" ry="31" fill={FUR} />
      <ellipse cx="46" cy="52" rx="10" ry="6" fill="#fff" opacity=".22" transform="rotate(-20 46 52)" />
      <ellipse cx="60" cy="84" rx="18" ry="13.5" fill={MUZ} />
      <path d="M54 93 Q60 108 66 93Z" fill={PINK} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M51 75 Q60 68 69 75 Q67 83 60 84 Q53 83 51 75Z" fill={INK} />
      <ellipse cx="56" cy="74" rx="2.2" ry="1.2" fill="#fff" opacity=".5" />
      <path d="M60 84 V90 M60 90 Q53 96 47 91 M60 90 Q67 96 73 91" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="46" cy="64" r="4.6" fill={INK} />
      <circle cx="74" cy="64" r="4.6" fill={INK} />
      <circle cx="47.6" cy="62.4" r="1.6" fill="#fff" />
      <circle cx="75.6" cy="62.4" r="1.6" fill="#fff" />
      <path d="M26 52 C26 26 42 10 60 6 C78 10 94 26 94 52Z" fill={ORG} />
      <path d={zig} fill="none" stroke={CREAM} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30 27 C42 17 52 14 60 13" stroke="#fff" strokeOpacity=".28" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="24" y="48" width="72" height="12" rx="3" fill={ORG_D} stroke={INK} strokeWidth="1.6" />
      <path d={band} fill={CREAM} />
      <circle cx="60" cy="6" r="9" fill={CREAM} />
      <circle cx="57" cy="3" r="3" fill="#fff" opacity=".7" />
      <path d="M26 60 Q18 76 24 92 L34 88 Q31 74 34 60Z" fill={ORG} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M94 60 Q102 76 96 92 L86 88 Q89 74 86 60Z" fill={ORG} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx="29" cy="94" r="4" fill={CREAM} stroke={INK} strokeWidth="2" />
      <circle cx="91" cy="94" r="4" fill={CREAM} stroke={INK} strokeWidth="2" />
    </g>
  )
}

/**
 * Pata de PERRO levantada (apunta hacia arriba). Dedos anchos con uñas visibles, almohadilla grande
 * y pelo largo en la pierna: un gato tiene la pata más fina y esconde las uñas.
 */
export function DogPawArm({ className }: { className?: string }) {
  const toes = [
    { x: 24, y: 63, r: 9.5, rot: -22 },
    { x: 40, y: 51, r: 10.5, rot: -8 },
    { x: 60, y: 51, r: 10.5, rot: 8 },
    { x: 76, y: 63, r: 9.5, rot: 22 },
  ]
  const legD = 'M31 96 L69 96 L72 196 L28 196Z'
  const fringe = 'M31 104 l-9 7 l8 3 l-9 9 l9 3 l-8 9 l8 4 l-7 8 l8 3 l-6 8 L31 160Z'
  const fringeR = 'M69 104 l9 7 l-8 3 l9 9 l-9 3 l8 9 l-8 4 l7 8 l-8 3 l6 8 L69 160Z'
  return (
    <svg viewBox="0 0 100 150" preserveAspectRatio="xMidYMax meet" className={className} aria-hidden style={{ overflow: 'visible' }}>
      {/* contorno */}
      <g fill={INK} stroke={INK} strokeWidth="9" strokeLinejoin="round">
        <path d={legD} />
        <path d={fringe} />
        <path d={fringeR} />
        <ellipse cx="50" cy="80" rx="31" ry="26" />
        {toes.map((t, i) => (
          <circle key={i} cx={t.x} cy={t.y} r={t.r} />
        ))}
      </g>
      {/* pelo */}
      <path d={fringe} fill={FUR_D} />
      <path d={fringeR} fill={FUR_D} />
      <path d={legD} fill={FUR} />
      <path d="M56 96 L69 96 L72 196 L58 196Z" fill={FUR_D} opacity=".55" />
      <ellipse cx="50" cy="80" rx="31" ry="26" fill={FUR} />
      {toes.map((t, i) => (
        <circle key={i} cx={t.x} cy={t.y} r={t.r} fill={FUR} />
      ))}
      {/* separación de dedos */}
      <path d="M32 58 Q33 70 30 78" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M50 52 Q50 64 50 74" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M68 58 Q67 70 70 78" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {/* uñas */}
      {toes.map((t, i) => (
        <ellipse key={i} cx={t.x + (i < 2 ? -1 : 1)} cy={t.y - t.r + 0.5} rx="3.1" ry="4.6" transform={`rotate(${t.rot} ${t.x} ${t.y})`} fill={CREAM} stroke={INK} strokeWidth="2" />
      ))}
      {/* almohadillas */}
      <path d="M50 99 C36 99 29 88 36 80 C40 75 46 77 50 82 C54 77 60 75 64 80 C71 88 64 99 50 99Z" fill={ORG_D} />
      {toes.map((t, i) => (
        <ellipse key={i} cx={t.x} cy={t.y + 3} rx="4.2" ry="5.2" transform={`rotate(${t.rot} ${t.x} ${t.y})`} fill={ORG_D} />
      ))}
      <ellipse cx="42" cy="86" rx="3" ry="2" fill="#fff" opacity=".25" />
    </svg>
  )
}
