'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { NOMBRE_APP } from '@/lib/config'
import { FOTOS_PERROS, type FotoPerro } from '@/lib/fotosPerros'
import { cn } from '@/lib/utils'

/* Portada de entrada (como Spaidra): el nombre gigante con la letra del logotipo (Cinzel) y fotos de perros alrededor.
   Al cargar (como el video de Lightspark): muchas fotos desenfocadas llenan la pantalla, las de sobra se van hacia afuera
   y las siete del diseño viajan hasta su lugar y se enfocan. Recién entonces aparece el nombre.
   Las fotos nunca pasan por encima de las letras, así el nombre se lee completo.
   Un brillo sigue al mouse por las letras y las fotos se mueven un poco (quieto con «reducir movimiento»). */

/** `ix`, `iy`: dónde está el centro de la foto al empezar la intro, antes de acomodarse. */
type Foto = { f: FotoPerro; x: number; y: number; w: number; h: number; capa: number; ix: number; iy: number }
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
    { f: 'lab', x: 150, y: 14, w: 156, h: 226, capa: 1, ix: 620, iy: 380 },
    { f: 'playa', x: 690, y: 8, w: 160, h: 222, capa: 0.6, ix: 1020, iy: 560 },
    { f: 'pelusa', x: 1170, y: 36, w: 290, h: 192, capa: 1.2, ix: 360, iy: 250 },
    { f: 'corriendo', x: 24, y: 520, w: 258, h: 172, capa: 1.1, ix: 1230, iy: 420 },
    { f: 'beagle', x: 430, y: 690, w: 230, h: 172, capa: 0.8, ix: 800, iy: 300 },
    { f: 'orejas', x: 960, y: 694, w: 250, h: 166, capa: 1, ix: 420, iy: 640 },
    { f: 'cachorro', x: 1340, y: 500, w: 160, h: 236, capa: 0.7, ix: 1050, iy: 180 },
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
    { f: 'lab', x: 22, y: 24, w: 100, h: 146, capa: 1, ix: 260, iy: 330 },
    { f: 'playa', x: 150, y: 50, w: 100, h: 146, capa: 0.6, ix: 110, iy: 420 },
    { f: 'pelusa', x: 272, y: 20, w: 112, h: 76, capa: 1.2, ix: 90, iy: 250 },
    { f: 'beagle', x: 272, y: 116, w: 112, h: 84, capa: 0.8, ix: 200, iy: 560 },
    { f: 'cachorro', x: 40, y: 190, w: 76, h: 90, capa: 0.7, ix: 300, iy: 470 },
    { f: 'corriendo', x: 16, y: 470, w: 160, h: 106, capa: 1.1, ix: 250, iy: 150 },
    { f: 'orejas', x: 200, y: 500, w: 180, h: 120, capa: 1, ix: 140, iy: 330 },
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

      {/* 1. Las fotos empiezan regadas y desenfocadas por toda la pantalla, viajan a su lugar y se enfocan. */}
      {fotos(0, `url(#${id}-sombra)`).map((g, i) => {
        const p = d.fotos[i]
        const dx = p.ix - (p.x + p.w / 2)
        const dy = p.iy - (p.y + p.h / 2)
        return (
          <motion.g
            key={i}
            initial={reducir ? false : { opacity: 0, x: dx, y: dy, scale: 1.25, filter: 'blur(14px)' }}
            animate={
              reducir
                ? undefined
                : { opacity: [0, 1, 1], x: [dx, dx * 0.88, 0], y: [dy, dy * 0.88, 0], scale: [1.25, 1.15, 1], filter: ['blur(14px)', 'blur(9px)', 'blur(0px)'] }
            }
            transition={{ duration: 2.3, times: [0, 0.42, 1], delay: 0.1 + i * 0.06, ease: [0.65, 0, 0.35, 1] }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          >
            {g}
          </motion.g>
        )
      })}

      {/* 2. Cuando las fotos ya están en su sitio, aparece el nombre encima, con un brillo que sigue al mouse. */}
      <motion.g
        initial={reducir ? false : { opacity: 0, y: 40, filter: 'blur(12px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 1, delay: 2.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <g filter={`url(#${id}-sombra)`}>{d.lineas.map((l) => linea(l, { fill: l.color }))}</g>
      </motion.g>
      <motion.g
        initial={reducir ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 3.1 }}
        clipPath={`url(#${id}-letras-0)`}
      >
        <circle ref={brillo} cx={d.ancho / 2} cy={d.alto / 2} r={d.ancho * 0.15} fill={`url(#${id}-luz)`} style={{ mixBlendMode: 'screen' }} />
      </motion.g>
    </svg>
  )
}

/** Fotos de sobra para la intro: llenan la pantalla desenfocadas y se van hacia afuera. `solo`: solo en pantallas grandes. */
const REVUELO = [
  { f: 'grupo', l: 9, t: 16, s: 10, b: 7, solo: false },
  { f: 'calle', l: 30, t: 9, s: 8, b: 10, solo: true },
  { f: 'sendero', l: 52, t: 22, s: 11, b: 6, solo: false },
  { f: 'abrazo', l: 74, t: 12, s: 9, b: 9, solo: true },
  { f: 'bosque', l: 92, t: 30, s: 10, b: 7, solo: false },
  { f: 'correa', l: 18, t: 46, s: 12, b: 8, solo: true },
  { f: 'cuatro', l: 40, t: 54, s: 9, b: 11, solo: false },
  { f: 'negro', l: 64, t: 48, s: 12, b: 7, solo: true },
  { f: 'pradera', l: 84, t: 66, s: 11, b: 9, solo: false },
  { f: 'cachorro-correa', l: 8, t: 80, s: 10, b: 10, solo: false },
  { f: 'calle', l: 34, t: 86, s: 9, b: 8, solo: true },
  { f: 'grupo', l: 58, t: 82, s: 10, b: 11, solo: true },
]

function Revuelo() {
  const reducir = useReducedMotion()
  const [fin, setFin] = useState(false)
  // Terminada la intro, se quitan del todo para no gastar memoria.
  useEffect(() => {
    if (reducir) return
    const t = setTimeout(() => setFin(true), 3300)
    return () => clearTimeout(t)
  }, [reducir])
  if (reducir || fin) return null
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {REVUELO.map((r, i) => {
        const dx = r.l - 50
        const dy = r.t - 50
        const n = Math.hypot(dx, dy) || 1
        return (
          <motion.div
            key={i}
            className={cn('absolute aspect-square w-[clamp(72px,var(--s),190px)]', r.solo && 'hidden md:block')}
            style={{ left: `${r.l}%`, top: `${r.t}%`, translate: '-50% -50%', '--s': `${r.s}vw` } as React.CSSProperties}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0.6, 1, 1.04, 0.5],
              x: [0, dx * 0.6, dx * 1.2, (dx / n) * 900],
              y: [0, dy * 0.6, dy * 1.2, (dy / n) * 700],
            }}
            transition={{ duration: 2.9, times: [0, 0.22, 0.55, 1], delay: i * 0.035, ease: 'easeInOut' }}
          >
            <Image
              src={`/fotos/aureola/${r.f}.jpg`}
              alt=""
              width={360}
              height={360}
              sizes="190px"
              priority={i < 4}
              className="h-full w-full rounded-[26%] object-cover shadow-[0_24px_48px_-20px_rgba(91,34,41,.45)]"
              style={{ filter: `blur(${r.b}px)` }}
            />
          </motion.div>
        )
      })}
    </div>
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
      <Revuelo />
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 md:px-6">
        <Lienzo d={CELULAR} id="entrada-cel" className="h-full w-full md:hidden" />
        <Lienzo d={COMPUTADORA} id="entrada-pc" className="hidden h-full w-full md:block" />
      </div>
      <motion.div
        initial={reducir ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 2.9 }}
        className="relative flex flex-col items-center gap-2 px-4 pb-6 pt-2 text-center"
      >
        <p className="font-display text-[15px] font-bold uppercase tracking-[0.18em] text-ink-soft md:text-[17px]">Paseos felices · Dueños tranquilos</p>
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
      </motion.div>
    </section>
  )
}
