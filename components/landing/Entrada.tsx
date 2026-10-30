'use client'

import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { NOMBRE_APP } from '@/lib/config'
import { FOTOS_PERROS, type FotoPerro } from '@/lib/fotosPerros'

/* Portada de entrada (como Spaidra): el nombre gigante con la letra del logotipo (Cinzel) y fotos de perros alrededor.
   Las fotos nunca pasan por encima de las letras, así el nombre se lee completo.
   Un brillo sigue al mouse por las letras y las fotos se mueven un poco (quieto con «reducir movimiento»). */

type Foto = { f: FotoPerro; x: number; y: number; w: number; h: number; capa: number }
type Linea = { texto: string; y: number; letra: number; largo: number; color: string }
type Diseno = { ancho: number; alto: number; lineas: [Linea, Linea]; fotos: Foto[] }

const [PRIMERA, SEGUNDA] = NOMBRE_APP.toUpperCase().split(' ')

// Terracota y vino de la marca.
const TERRACOTA = { color: '#cd4f27' }
const VINO = { color: '#5b2229' }

const COMPUTADORA: Diseno = {
  ancho: 1600,
  alto: 900,
  lineas: [
    { texto: PRIMERA, y: 480, letra: 300, largo: 1320, ...TERRACOTA },
    { texto: SEGUNDA, y: 660, letra: 124, largo: 960, ...VINO },
  ],
  // Las fotos van alrededor del nombre, nunca encima de las letras.
  fotos: [
    { f: 'lab', x: 150, y: 14, w: 156, h: 226, capa: 1 },
    { f: 'playa', x: 690, y: 8, w: 160, h: 222, capa: 0.6 },
    { f: 'pelusa', x: 1170, y: 36, w: 290, h: 192, capa: 1.2 },
    { f: 'corriendo', x: 24, y: 520, w: 258, h: 172, capa: 1.1 },
    { f: 'beagle', x: 430, y: 690, w: 230, h: 172, capa: 0.8 },
    { f: 'orejas', x: 960, y: 694, w: 250, h: 166, capa: 1 },
    { f: 'cachorro', x: 1340, y: 500, w: 160, h: 236, capa: 0.7 },
  ],
}

const CELULAR: Diseno = {
  ancho: 400,
  alto: 700,
  lineas: [
    { texto: PRIMERA, y: 372, letra: 96, largo: 376, ...TERRACOTA },
    { texto: SEGUNDA, y: 432, letra: 42, largo: 300, ...VINO },
  ],
  fotos: [
    { f: 'lab', x: 22, y: 24, w: 100, h: 146, capa: 1 },
    { f: 'playa', x: 150, y: 50, w: 100, h: 146, capa: 0.6 },
    { f: 'pelusa', x: 272, y: 20, w: 112, h: 76, capa: 1.2 },
    { f: 'beagle', x: 272, y: 116, w: 112, h: 84, capa: 0.8 },
    { f: 'cachorro', x: 40, y: 190, w: 76, h: 90, capa: 0.7 },
    { f: 'corriendo', x: 16, y: 470, w: 160, h: 106, capa: 1.1 },
    { f: 'orejas', x: 200, y: 500, w: 180, h: 120, capa: 1 },
  ],
}

function Lienzo({ d, id, className }: { d: Diseno; id: string; className?: string }) {
  const reducir = useReducedMotion()
  const svg = useRef<SVGSVGElement>(null)
  const brillo = useRef<SVGCircleElement>(null)
  const halo = useRef<SVGCircleElement>(null)
  const capas = useRef<Array<SVGGElement | null>>([])

  // El brillo y las fotos siguen al puntero con un poco de retraso, para que se sienta suave.
  useEffect(() => {
    const el = svg.current
    if (!el || reducir) return
    const meta = { x: d.ancho / 2, y: d.alto / 2 }
    const ahora = { ...meta }
    let cuadro = 0
    const pintar = () => {
      ahora.x += (meta.x - ahora.x) * 0.12
      ahora.y += (meta.y - ahora.y) * 0.12
      for (const c of [brillo.current, halo.current]) {
        c?.setAttribute('cx', String(ahora.x))
        c?.setAttribute('cy', String(ahora.y))
      }
      const dx = (ahora.x - d.ancho / 2) / d.ancho
      const dy = (ahora.y - d.alto / 2) / d.alto
      capas.current.forEach((g, i) => {
        const c = d.fotos[i % d.fotos.length].capa
        g?.setAttribute('transform', `translate(${(-dx * 40 * c).toFixed(2)} ${(-dy * 30 * c).toFixed(2)})`)
      })
      cuadro = Math.abs(meta.x - ahora.x) + Math.abs(meta.y - ahora.y) > 0.5 ? requestAnimationFrame(pintar) : 0
    }
    const mover = (e: PointerEvent) => {
      const m = el.getScreenCTM()
      if (!m) return
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
      meta.x = p.x
      meta.y = p.y
      if (!cuadro) cuadro = requestAnimationFrame(pintar)
    }
    const salir = () => {
      meta.x = d.ancho / 2
      meta.y = d.alto / 2
      if (!cuadro) cuadro = requestAnimationFrame(pintar)
    }
    const zona = (el.parentElement ?? el) as HTMLElement
    zona.addEventListener('pointermove', mover)
    zona.addEventListener('pointerleave', salir)
    return () => {
      cancelAnimationFrame(cuadro)
      zona.removeEventListener('pointermove', mover)
      zona.removeEventListener('pointerleave', salir)
    }
  }, [d, reducir])

  const linea = (l: Linea, props: React.SVGProps<SVGTextElement> = {}) => (
    <text
      key={l.texto}
      x={d.ancho / 2}
      y={l.y}
      textAnchor="middle"
      fontSize={l.letra}
      textLength={l.largo}
      lengthAdjust="spacing"
      className="font-display"
      style={{ fontWeight: 700, letterSpacing: 0 }}
      {...props}
    >
      {l.texto}
    </text>
  )

  // Cada foto va en un grupo propio para poder moverla con el mouse; `n` separa las copias (normal y teñidas).
  const fotos = (n: number, filtro?: string) =>
    d.fotos.map((p, i) => (
      <g key={p.f} ref={(g) => void (capas.current[i + n * d.fotos.length] = g)}>
        <image href={FOTOS_PERROS[p.f].src} x={p.x} y={p.y} width={p.w} height={p.h} preserveAspectRatio="xMidYMid slice" filter={filtro} />
      </g>
    ))

  return (
    <svg ref={svg} viewBox={`0 0 ${d.ancho} ${d.alto}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={NOMBRE_APP} className={className}>
      <defs>
        <clipPath id={`${id}-letras-0`}>{linea(d.lineas[0])}</clipPath>
        <filter id={`${id}-sombra`} x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy={d.ancho / 160} stdDeviation={d.ancho / 120} floodColor="#ad3c1b" floodOpacity="0.22" />
        </filter>
        <radialGradient id={`${id}-luz`}>
          <stop offset="0%" stopColor="#fff4ea" stopOpacity="0.9" />
          <stop offset="40%" stopColor="#f6cbb6" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#f6cbb6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-halo`}>
          <stop offset="0%" stopColor="#f3bea6" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#f3bea6" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle ref={halo} cx={d.ancho / 2} cy={d.alto / 2} r={d.ancho * 0.3} fill={`url(#${id}-halo)`} />

      {/* 1. Las fotos alrededor del nombre, apareciendo una por una. */}
      <motion.g initial="oculto" animate="visible" transition={{ staggerChildren: 0.08, delayChildren: 0.3 }}>
        {fotos(0, `url(#${id}-sombra)`).map((g, i) => (
          <motion.g
            key={i}
            variants={{ oculto: { opacity: 0, scale: 0.92 }, visible: { opacity: 1, scale: 1 } }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          >
            {g}
          </motion.g>
        ))}
      </motion.g>

      {/* 2. El nombre encima de las fotos, con un brillo que sigue al mouse. */}
      <motion.g
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        filter={`url(#${id}-sombra)`}
      >
        {d.lineas.map((l) => linea(l, { fill: l.color }))}
      </motion.g>
      <g clipPath={`url(#${id}-letras-0)`}>
        <circle ref={brillo} cx={d.ancho / 2} cy={d.alto / 2} r={d.ancho * 0.15} fill={`url(#${id}-luz)`} style={{ mixBlendMode: 'screen' }} />
      </g>
    </svg>
  )
}

/** Primera pantalla de la web: el nombre centrado, gigante, con fotos de perros encima. Debajo empieza la portada de siempre. */
export function Entrada() {
  const reducir = useReducedMotion()
  return (
    <section
      aria-label={`Bienvenida a ${NOMBRE_APP}`}
      className="relative flex h-[calc(100svh-4rem)] min-h-[560px] flex-col overflow-hidden bg-canvas md:h-[calc(100svh-5rem)]"
    >
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 md:px-6">
        <Lienzo d={CELULAR} id="entrada-cel" className="h-full w-full md:hidden" />
        <Lienzo d={COMPUTADORA} id="entrada-pc" className="hidden h-full w-full md:block" />
      </div>
      <div className="relative flex flex-col items-center gap-2 px-4 pb-6 pt-2 text-center">
        <p className="font-display text-[15px] font-bold uppercase tracking-[0.18em] text-ink-soft md:text-[17px]">
          Paseos con cuidado · San Isidro y Jesús María
        </p>
        <a
          href="#inicio"
          className="inline-flex min-h-11 flex-col items-center justify-center gap-1.5 text-[13px] font-extrabold uppercase tracking-[0.2em] text-brand-700"
        >
          Desliza para descubrir
          <span className="relative block h-8 w-px overflow-hidden bg-ink/15" aria-hidden>
            <motion.span
              className="absolute left-0 top-0 block h-3 w-px bg-brand-700"
              animate={reducir ? undefined : { y: [-12, 32] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </span>
        </a>
      </div>
    </section>
  )
}
