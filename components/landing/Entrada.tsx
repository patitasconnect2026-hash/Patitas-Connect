'use client'

import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { NOMBRE_APP } from '@/lib/config'
import { FOTOS_PERROS, type FotoPerro } from '@/lib/fotosPerros'

/* Portada de entrada (como Spaidra): el nombre gigante, con fotos de perros alrededor.
   Donde una foto pasa por detrás de una letra, la letra la muestra teñida en terracota y vino.
   Un brillo sigue al mouse por las letras y las fotos se mueven un poco (quieto con «reducir movimiento»). */

type Foto = { f: FotoPerro; x: number; y: number; w: number; h: number; capa: number }
type Diseno = {
  ancho: number
  alto: number
  letra: number
  largo: number
  lineas: [number, number]
  fotos: Foto[]
}

const COMPUTADORA: Diseno = {
  ancho: 1600,
  alto: 900,
  letra: 270,
  largo: 1380,
  lineas: [430, 700],
  fotos: [
    { f: 'lab', x: 150, y: 70, w: 220, h: 330, capa: 1 },
    { f: 'playa', x: 660, y: 10, w: 240, h: 300, capa: 0.6 },
    { f: 'pelusa', x: 1180, y: 160, w: 300, h: 200, capa: 1.2 },
    { f: 'beagle', x: 600, y: 380, w: 320, h: 240, capa: 0.8 },
    { f: 'corriendo', x: 90, y: 560, w: 300, h: 200, capa: 1.1 },
    { f: 'cachorro', x: 1230, y: 500, w: 210, h: 310, capa: 0.7 },
    { f: 'orejas', x: 880, y: 720, w: 270, h: 170, capa: 1 },
  ],
}

const CELULAR: Diseno = {
  ancho: 400,
  alto: 680,
  letra: 84,
  largo: 376,
  lineas: [318, 412],
  fotos: [
    { f: 'lab', x: 22, y: 30, w: 112, h: 168, capa: 1 },
    { f: 'playa', x: 236, y: 10, w: 124, h: 186, capa: 0.6 },
    { f: 'pelusa', x: 256, y: 196, w: 126, h: 84, capa: 1.2 },
    { f: 'beagle', x: 136, y: 360, w: 132, h: 99, capa: 0.8 },
    { f: 'corriendo', x: 10, y: 430, w: 138, h: 92, capa: 1.1 },
    { f: 'cachorro', x: 270, y: 420, w: 108, h: 162, capa: 0.7 },
    { f: 'orejas', x: 120, y: 540, w: 168, h: 112, capa: 1 },
  ],
}

function Lienzo({ d, id, className }: { d: Diseno; id: string; className?: string }) {
  const reducir = useReducedMotion()
  const svg = useRef<SVGSVGElement>(null)
  const brillo = useRef<SVGCircleElement>(null)
  const halo = useRef<SVGCircleElement>(null)
  const capas = useRef<Array<SVGGElement | null>>([])
  const [primera, segunda] = NOMBRE_APP.toUpperCase().split(' ')

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
      brillo.current?.setAttribute('cx', String(ahora.x))
      brillo.current?.setAttribute('cy', String(ahora.y))
      halo.current?.setAttribute('cx', String(ahora.x))
      halo.current?.setAttribute('cy', String(ahora.y))
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

  const texto = (
    <>
      <text x={d.ancho / 2} y={d.lineas[0]} textAnchor="middle" fontSize={d.letra} textLength={d.largo} lengthAdjust="spacingAndGlyphs">
        {primera}
      </text>
      <text x={d.ancho / 2} y={d.lineas[1]} textAnchor="middle" fontSize={d.letra} textLength={d.largo} lengthAdjust="spacingAndGlyphs">
        {segunda}
      </text>
    </>
  )
  const fotos = (tenidas: boolean) =>
    d.fotos.map((p, i) => (
      <g key={p.f} ref={(g) => void (capas.current[i + (tenidas ? d.fotos.length : 0)] = g)}>
        <image
          href={FOTOS_PERROS[p.f].src}
          x={p.x}
          y={p.y}
          width={p.w}
          height={p.h}
          preserveAspectRatio="xMidYMid slice"
          filter={tenidas ? `url(#${id}-tono)` : undefined}
        />
      </g>
    ))

  return (
    <svg ref={svg} viewBox={`0 0 ${d.ancho} ${d.alto}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={NOMBRE_APP} className={className}>
      <defs>
        {/* Tiñe la foto de vino (sombras) a terracota claro (luces): solo se ve dentro de las letras. */}
        <filter id={`${id}-tono`} colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="table" tableValues="0.357 0.953" />
            <feFuncG type="table" tableValues="0.133 0.745" />
            <feFuncB type="table" tableValues="0.161 0.651" />
          </feComponentTransfer>
        </filter>
        <clipPath id={`${id}-letras`} className="font-display" style={{ fontWeight: 700 }}>
          {texto}
        </clipPath>
        <radialGradient id={`${id}-luz`}>
          <stop offset="0%" stopColor="#fdf3ee" stopOpacity="0.95" />
          <stop offset="35%" stopColor="#e99672" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#cd4f27" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-halo`}>
          <stop offset="0%" stopColor="#f3bea6" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#f3bea6" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Halo suave detrás de todo, que también sigue al mouse. */}
      <circle ref={halo} cx={d.ancho / 2} cy={d.alto / 2} r={d.ancho * 0.28} fill={`url(#${id}-halo)`} />

      {/* Las fotos aparecen una por una. */}
      <motion.g initial="oculto" animate="visible" transition={{ staggerChildren: 0.08, delayChildren: 0.1 }}>
        {fotos(false).map((g, i) => (
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

      {/* Las letras: vino sólido, la foto teñida donde se cruzan y el brillo encima. */}
      <motion.g initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}>
        <g className="font-display" fill="#5b2229" style={{ fontWeight: 700 }}>
          {texto}
        </g>
        <g clipPath={`url(#${id}-letras)`}>
          {fotos(true)}
          <circle ref={brillo} cx={d.ancho / 2} cy={d.alto / 2} r={d.ancho * 0.16} fill={`url(#${id}-luz)`} style={{ mixBlendMode: 'screen' }} />
        </g>
      </motion.g>
    </svg>
  )
}

/** Primera pantalla de la web: el nombre centrado, gigante, con fotos de perros. Debajo empieza la portada de siempre. */
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
      <div className="relative flex flex-col items-center gap-2 pb-6 text-center">
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
