'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/* Piezas de movimiento de la portada, sacadas del video de referencia (TAG Heuer, Geospace, Good Dog, Spaidra).
   Todas respetan «reducir movimiento»: si la persona lo pidió, se ven quietas y completas. */

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/** Texto que aparece «revuelto» y se ordena letra por letra al entrar en pantalla (como los títulos de TAG Heuer). */
export function TextoRevuelto({ texto, className, duracion = 900 }: { texto: string; className?: string; duracion?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const visto = useInView(ref, { once: true, margin: '-40px' })
  const reducir = useReducedMotion()
  const [mostrado, setMostrado] = useState<string | null>(null)

  useEffect(() => {
    if (!visto || reducir) return
    let cuadro = 0
    const inicio = performance.now()
    const paso = (ahora: number) => {
      const avance = Math.min(1, (ahora - inicio) / duracion)
      const fijas = Math.floor(avance * texto.length)
      if (avance >= 1) {
        setMostrado(null)
        return
      }
      setMostrado(
        texto
          .split('')
          .map((c, i) => (i < fijas || c === ' ' ? c : LETRAS[Math.floor(Math.random() * LETRAS.length)]))
          .join(''),
      )
      cuadro = requestAnimationFrame(paso)
    }
    cuadro = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(cuadro)
  }, [visto, reducir, texto, duracion])

  // Mientras se ordena, el texto real queda para lectores de pantalla y el revuelto solo se ve.
  return (
    <span ref={ref} className={className}>
      {mostrado === null ? (
        texto
      ) : (
        <>
          <span className="sr-only">{texto}</span>
          <span aria-hidden>{mostrado}</span>
        </>
      )}
    </span>
  )
}

/** Texto que gira en círculo alrededor de algo (como el disco de Spaidra). */
export function TextoCircular({ texto, className }: { texto: string; className?: string }) {
  const reducir = useReducedMotion()
  return (
    <motion.svg
      aria-hidden
      viewBox="0 0 200 200"
      className={cn('pointer-events-none', className)}
      animate={reducir ? undefined : { rotate: 360 }}
      transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
    >
      <defs>
        <path id="circulo-texto" d="M100,100 m-88,0 a88,88 0 1,1 176,0 a88,88 0 1,1 -176,0" />
      </defs>
      <text className="font-display" fontSize="11.5" fontWeight="700" letterSpacing="3.2" fill="currentColor">
        <textPath href="#circulo-texto">{texto}</textPath>
      </text>
    </motion.svg>
  )
}

/** Una línea de letras gigantes que se desliza de lado mientras bajas (como el título del artículo en Geospace). */
export function FranjaGigante({ texto, className, haciaLaDerecha = false }: { texto: string; className?: string; haciaLaDerecha?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const reducir = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const desde = haciaLaDerecha ? '-30%' : '0%'
  const hasta = haciaLaDerecha ? '0%' : '-30%'
  const x = useTransform(scrollYProgress, [0, 1], reducir ? ['-15%', '-15%'] : [desde, hasta])
  return (
    <div ref={ref} aria-hidden className={cn('overflow-hidden', className)}>
      <motion.p style={{ x }} className="font-display whitespace-nowrap text-[18vw] font-bold uppercase leading-[0.9] md:text-[13vw]">
        {texto}
      </motion.p>
    </div>
  )
}

/** Carrusel horizontal con flechas y barra de avance (como los de Good Dog). Se puede deslizar con el dedo. */
export function Carrusel({ etiqueta, children, claro = false }: { etiqueta: string; children: React.ReactNode; claro?: boolean }) {
  const pista = useRef<HTMLUListElement>(null)
  const [avance, setAvance] = useState(0)
  const [bordes, setBordes] = useState({ inicio: true, fin: false })

  const medir = () => {
    const el = pista.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setAvance(max > 0 ? el.scrollLeft / max : 1)
    setBordes({ inicio: el.scrollLeft < 4, fin: el.scrollLeft > max - 4 })
  }
  useEffect(() => {
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [])

  const mover = (dir: 1 | -1) => {
    const el = pista.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  const flecha = cn(
    'grid h-12 w-12 place-items-center rounded-full ring-1 transition disabled:opacity-35',
    claro ? 'text-white ring-white/30 hover:bg-white/10' : 'text-ink ring-ink/15 hover:bg-sand',
  )
  return (
    <div>
      <ul
        ref={pista}
        onScroll={medir}
        aria-label={etiqueta}
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>
      <div className="mt-6 flex items-center gap-5">
        <span className={cn('h-1 flex-1 overflow-hidden rounded-full', claro ? 'bg-white/15' : 'bg-ink/10')} aria-hidden>
          <motion.span className={cn('block h-full rounded-full', claro ? 'bg-brand-300' : 'bg-vino')} style={{ width: `${Math.max(12, avance * 100)}%` }} />
        </span>
        <div className="flex gap-2">
          <button type="button" aria-label="Anterior" onClick={() => mover(-1)} disabled={bordes.inicio} className={flecha}>
            <ArrowLeft size={20} aria-hidden />
          </button>
          <button type="button" aria-label="Siguiente" onClick={() => mover(1)} disabled={bordes.fin} className={flecha}>
            <ArrowRight size={20} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}

/** Fichas en abanico, en 3D, que pasan una tras otra (como el carrusel de Spaidra). Tocar la de adelante muestra la siguiente. */
export function Abanico({ fichas, etiqueta }: { fichas: Array<{ id: string; contenido: React.ReactNode }>; etiqueta: string }) {
  const reducir = useReducedMotion()
  const [frente, setFrente] = useState(0)
  const [pausa, setPausa] = useState(false)
  const n = fichas.length

  useEffect(() => {
    if (reducir || pausa) return
    const t = setInterval(() => setFrente((f) => (f + 1) % n), 3200)
    return () => clearInterval(t)
  }, [reducir, pausa, n])

  return (
    <div
      className="relative mx-auto h-[380px] w-full max-w-[300px] [perspective:1200px]"
      onMouseEnter={() => setPausa(true)}
      onMouseLeave={() => setPausa(false)}
    >
      {fichas.map((t, i) => {
        const pos = (i - frente + n) % n // 0 = adelante
        return (
          <motion.div
            key={t.id}
            aria-hidden={pos !== 0}
            className="absolute inset-x-0 top-0 mx-auto w-[240px] origin-bottom"
            animate={{
              rotate: pos === 0 ? 0 : pos === 1 ? 9 : -9,
              x: pos === 0 ? 0 : pos === 1 ? 46 : -46,
              y: pos === 0 ? 0 : 18,
              scale: pos === 0 ? 1 : 0.9,
              rotateY: pos === 0 ? 0 : pos === 1 ? -18 : 18,
              zIndex: n - pos,
            }}
            transition={{ type: 'spring', stiffness: 160, damping: 20 }}
          >
            {t.contenido}
          </motion.div>
        )
      })}
      <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1" role="group" aria-label={etiqueta}>
        {fichas.map((t, i) => (
          <button
            key={t.id}
            type="button"
            aria-label={`Ver ficha ${i + 1} de ${n}`}
            aria-pressed={frente === i}
            onClick={() => {
              setFrente(i)
              setPausa(true)
            }}
            className="grid h-11 w-11 place-items-center"
          >
            <span className={cn('block h-2.5 rounded-full transition-all', frente === i ? 'w-7 bg-vino' : 'w-2.5 bg-ink/25')} />
          </button>
        ))}
      </div>
    </div>
  )
}

/** Pestañas con una línea que se desliza debajo de la elegida (como «45 MM / 40 MM» en TAG Heuer). */
export function PestanasSubrayadas<T extends string>({
  opciones,
  valor,
  onCambio,
  etiqueta,
  id,
}: {
  opciones: Array<{ v: T; t: string }>
  valor: T
  onCambio: (v: T) => void
  etiqueta: string
  id: string
}) {
  return (
    <div role="tablist" aria-label={etiqueta} className="flex gap-6 border-b border-ink/10">
      {opciones.map((o) => (
        <button
          key={o.v}
          type="button"
          role="tab"
          id={`${id}-tab-${o.v}`}
          aria-selected={valor === o.v}
          aria-controls={`${id}-panel`}
          onClick={() => onCambio(o.v)}
          className={cn(
            'font-display relative min-h-12 text-[16px] font-bold uppercase tracking-[0.12em] transition-colors md:text-[18px]',
            valor === o.v ? 'text-ink' : 'text-ink-soft hover:text-ink',
          )}
        >
          {o.t}
          {valor === o.v && <motion.span layoutId={`${id}-linea`} className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-brand-600" />}
        </button>
      ))}
    </div>
  )
}
