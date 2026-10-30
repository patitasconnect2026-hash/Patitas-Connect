'use client'

import { useEffect, useRef, useState } from 'react'
import { animate, motion, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, useVelocity, type MotionValue } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PawMark } from './Logo'

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
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
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

/* ------------------------------------------------------------------ */
/* Movimiento al bajar (como BAO London): secciones que se apilan como cartas, textos que se encienden, cifras que cuentan */
/* ------------------------------------------------------------------ */

/** Una sección con forma de carta: al llegar a la pantalla sube, se ensancha y redondea menos sus esquinas (como BAO London).
 *  No se queda pegada ni tapa a nadie: cada carta deja un margen abajo para que la siguiente se apoye solo sobre ese margen,
 *  así al subir o bajar todo el texto se ve completo. Con «reducir movimiento» queda quieta. */
export function Capa({
  children,
  className,
  primera = false,
  ultima = false,
}: {
  children: React.ReactNode
  className?: string
  primera?: boolean
  ultima?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reducir = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start 30%'] })
  const escala = useTransform(scrollYProgress, [0, 1], reducir ? [1, 1] : [0.94, 1])
  const radio = useTransform(scrollYProgress, [0, 1], reducir ? [40, 40] : [80, 36])
  const estilo = primera ? undefined : { scale: escala, borderTopLeftRadius: radio, borderTopRightRadius: radio, transformOrigin: '50% 0%' }
  return (
    <motion.div
      ref={ref}
      style={estilo}
      className={cn(
        'relative overflow-clip',
        !primera && '-mt-10 shadow-[0_-24px_48px_-28px_rgba(46,16,20,.4)] md:-mt-12',
        !ultima && 'pb-10 md:pb-12',
        className,
      )}
    >
      {children}
    </motion.div>
  )
}

function PalabraQueSeEnciende({ progreso, desde, hasta, children }: { progreso: MotionValue<number>; desde: number; hasta: number; children: string }) {
  const opacidad = useTransform(progreso, [desde, hasta], [0.16, 1])
  const y = useTransform(progreso, [desde, hasta], [8, 0])
  return (
    <>
      <motion.span style={{ opacity: opacidad, y }} className="inline-block">
        {children}
      </motion.span>{' '}
    </>
  )
}

/** Un párrafo grande cuyas palabras se encienden una por una mientras bajas. */
export function TextoQueSeEnciende({ texto, className, resaltar = [] }: { texto: string; className?: string; resaltar?: string[] }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const reducir = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 85%', 'end 50%'],
  })
  const palabras = texto.split(' ')
  return (
    <p ref={ref} className={className}>
      {reducir
        ? texto
        : palabras.map((p, i) => (
            <span key={i} className={resaltar.includes(p) ? 'text-brand-600' : undefined}>
              <PalabraQueSeEnciende progreso={scrollYProgress} desde={i / palabras.length} hasta={(i + 1) / palabras.length}>
                {p}
              </PalabraQueSeEnciende>
            </span>
          ))}
    </p>
  )
}

/** Un número que cuenta desde 0 cuando aparece en pantalla. Solo para cifras reales. */
export function Contador({ hasta, className }: { hasta: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const visto = useInView(ref, { once: true, margin: '-40px' })
  const reducir = useReducedMotion()
  const valor = useMotionValue(hasta)
  const redondo = useTransform(valor, (v) => Math.round(v))
  useEffect(() => {
    if (reducir) return
    if (!visto) {
      valor.set(0)
      return
    }
    const c = animate(valor, hasta, { duration: 1.4, ease: [0.22, 1, 0.36, 1] })
    return () => c.stop()
  }, [visto, reducir, hasta, valor])
  return (
    <motion.span ref={ref} className={cn('tabular-nums', className)}>
      {redondo}
    </motion.span>
  )
}

const HUELLAS = [
  { x: '4%', y: '12%', t: 56, v: 1.2, g: -18 },
  { x: '88%', y: '8%', t: 40, v: 0.7, g: 22 },
  { x: '78%', y: '62%', t: 72, v: 1.5, g: -8 },
  { x: '12%', y: '78%', t: 44, v: 0.9, g: 30 },
  { x: '50%', y: '92%', t: 34, v: 1.1, g: 12 },
]

function Huella({ progreso, h }: { progreso: MotionValue<number>; h: (typeof HUELLAS)[number] }) {
  const y = useTransform(progreso, [0, 1], [h.v * 120, -h.v * 120])
  const rotate = useTransform(progreso, [0, 1], [h.g, h.g + h.v * 40])
  return (
    <motion.span className="absolute" style={{ left: h.x, top: h.y, y, rotate, width: h.t, height: h.t }}>
      <PawMark className="h-full w-full" />
    </motion.span>
  )
}

/** Huellas sueltas que suben a distinta velocidad al bajar (profundidad). Van detrás del texto y muy suaves. */
export function HuellasFlotantes({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const reducir = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  return (
    <div ref={ref} aria-hidden className={cn('pointer-events-none absolute inset-0 hidden overflow-hidden md:block', className)}>
      {!reducir && HUELLAS.map((h, i) => <Huella key={i} progreso={scrollYProgress} h={h} />)}
    </div>
  )
}

/** Inclinación según la velocidad con que bajas: la marquesina se «estira» al bajar rápido. */
export function useInclinacionPorVelocidad(max = 7) {
  const { scrollY } = useScroll()
  const velocidad = useSpring(useVelocity(scrollY), {
    damping: 50,
    stiffness: 400,
  })
  return useTransform(velocidad, [-2500, 0, 2500], [max, 0, -max], {
    clamp: true,
  })
}

/** Algo que entra desde un lado (y un poco girado) mientras su sección sube a la pantalla. */
export function useEntradaLateral<T extends HTMLElement>(lado: 1 | -1) {
  const ref = useRef<T>(null)
  const reducir = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'start 45%'],
  })
  const x = useTransform(scrollYProgress, [0, 1], reducir ? [0, 0] : [lado * 90, 0])
  const rotate = useTransform(scrollYProgress, [0, 1], reducir ? [0, 0] : [lado * 5, 0])
  const opacity = useTransform(scrollYProgress, [0, 0.6], reducir ? [1, 1] : [0.2, 1])
  return { ref, style: { x, rotate, opacity } }
}
