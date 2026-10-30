'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { NOMBRE_APP } from '@/lib/config'
import { FOTOS_PERROS, type FotoPerro } from '@/lib/fotosPerros'
import { cn } from '@/lib/utils'

/* Portada de entrada (como Spaidra): el logotipo oficial gigante y centrado, con fotos de perros alrededor.
   Las fotos quedan detrás y no tapan las letras. Un brillo recorre las letras siguiendo al mouse
   y las fotos se mueven un poco (todo quieto con «reducir movimiento»). */

/** Dónde va cada foto: en celular arriba y abajo del logotipo; en computadora, alrededor. `capa` = cuánto se mueve con el mouse. */
const FOTOS: Array<{ f: FotoPerro; clase: string; capa: number }> = [
  { f: 'lab', clase: 'left-[4%] top-[3%] w-[27%] aspect-[2/3] md:left-[7%] md:top-[5%] md:w-[11%]', capa: 1 },
  { f: 'playa', clase: 'left-[36%] top-[1%] w-[28%] aspect-[2/3] md:left-[42%] md:top-[1%] md:w-[10%]', capa: 0.6 },
  { f: 'pelusa', clase: 'right-[3%] top-[8%] w-[30%] aspect-[3/2] md:right-[7%] md:top-[9%] md:w-[15%]', capa: 1.2 },
  { f: 'beagle', clase: 'hidden md:block md:left-[1.5%] md:top-[40%] md:w-[11%] md:aspect-[4/3]', capa: 0.8 },
  { f: 'corriendo', clase: 'left-[3%] bottom-[6%] w-[34%] aspect-[3/2] md:left-[12%] md:bottom-[4%] md:w-[15%]', capa: 1.1 },
  { f: 'cachorro', clase: 'right-[5%] bottom-[3%] w-[25%] aspect-[2/3] md:right-[10%] md:bottom-[3%] md:w-[10%]', capa: 0.7 },
  { f: 'orejas', clase: 'left-[40%] bottom-[1%] w-[30%] aspect-[3/2] md:left-[44%] md:bottom-[2%] md:w-[14%]', capa: 1 },
]

// El logotipo sirve de máscara para que el brillo solo se vea sobre las letras.
const MASCARA = {
  WebkitMaskImage: 'url(/marca/logotipo.png)',
  maskImage: 'url(/marca/logotipo.png)',
  WebkitMaskSize: '100% 100%',
  maskSize: '100% 100%',
} as const

/** Primera pantalla de la web: el logotipo centrado, gigante, con fotos de perros. Debajo empieza la portada de siempre. */
export function Entrada() {
  const reducir = useReducedMotion()
  const zona = useRef<HTMLElement>(null)

  // El mouse mueve unas variables CSS: --px/--py (-1 a 1) para las fotos y --mx/--my (en %) para el brillo.
  useEffect(() => {
    const el = zona.current
    if (!el || reducir) return
    let cuadro = 0
    const mover = (e: PointerEvent) => {
      cancelAnimationFrame(cuadro)
      cuadro = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const x = (e.clientX - r.left) / r.width
        const y = (e.clientY - r.top) / r.height
        el.style.setProperty('--px', (x * 2 - 1).toFixed(3))
        el.style.setProperty('--py', (y * 2 - 1).toFixed(3))
        const logo = el.querySelector<HTMLElement>('[data-logotipo]')?.getBoundingClientRect()
        if (logo) {
          el.style.setProperty('--mx', `${(((e.clientX - logo.left) / logo.width) * 100).toFixed(1)}%`)
          el.style.setProperty('--my', `${(((e.clientY - logo.top) / logo.height) * 100).toFixed(1)}%`)
        }
        el.style.setProperty('--brillo', '1')
      })
    }
    const salir = () => {
      el.style.setProperty('--px', '0')
      el.style.setProperty('--py', '0')
      el.style.setProperty('--brillo', '0')
    }
    el.addEventListener('pointermove', mover)
    el.addEventListener('pointerleave', salir)
    return () => {
      cancelAnimationFrame(cuadro)
      el.removeEventListener('pointermove', mover)
      el.removeEventListener('pointerleave', salir)
    }
  }, [reducir])

  return (
    <section
      ref={zona}
      aria-label={`Bienvenida a ${NOMBRE_APP}`}
      className="relative flex h-[calc(100svh-4rem)] min-h-[560px] flex-col overflow-hidden bg-canvas md:h-[calc(100svh-5rem)]"
      style={{ '--px': 0, '--py': 0, '--mx': '50%', '--my': '50%', '--brillo': 0 } as React.CSSProperties}
    >
      <div className="relative min-h-0 flex-1">
        {/* Fotos alrededor, apareciendo una por una. */}
        {FOTOS.map((p, i) => (
          <motion.div
            key={p.f}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className={cn('absolute', p.clase)}
          >
            <div
              className="relative h-full w-full overflow-hidden shadow-[0_18px_40px_-18px_rgba(46,16,20,.55)] transition-transform duration-500 ease-out"
              style={{ transform: `translate(calc(var(--px) * ${-18 * p.capa}px), calc(var(--py) * ${-14 * p.capa}px))` }}
            >
              <Image src={FOTOS_PERROS[p.f].src} alt="" fill sizes="(min-width: 768px) 16vw, 34vw" className="object-cover" priority={i < 3} />
            </div>
          </motion.div>
        ))}

        {/* Luz suave detrás del logotipo, para que las letras siempre se lean. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 50% 30% at 50% 50%, rgba(251,246,238,.97) 0%, rgba(251,246,238,.9) 55%, rgba(251,246,238,0) 100%)',
          }}
        />

        {/* El logotipo oficial, centrado. */}
        <div className="absolute inset-0 grid place-items-center px-3">
          <motion.div
            data-logotipo
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-[min(94vw,880px)] drop-shadow-[0_14px_22px_rgba(91,34,41,.18)]"
          >
            <Image
              src="/marca/logotipo.png"
              alt={`Logotipo de ${NOMBRE_APP}`}
              width={1000}
              height={396}
              priority
              sizes="(min-width: 960px) 880px, 94vw"
              className="h-auto w-full"
            />
            {/* Brillo que sigue al mouse, solo sobre las letras. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 transition-opacity duration-300"
              style={{
                ...MASCARA,
                opacity: 'var(--brillo)',
                mixBlendMode: 'screen',
                background: 'radial-gradient(circle 160px at var(--mx) var(--my), rgba(255,236,222,.9), rgba(243,190,166,.35) 45%, transparent 75%)',
              }}
            />
            {/* Un destello que cruza las letras una vez al entrar. */}
            {!reducir && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  ...MASCARA,
                  mixBlendMode: 'screen',
                  backgroundImage: 'linear-gradient(105deg, transparent 35%, rgba(255,240,228,.85) 50%, transparent 65%)',
                  backgroundSize: '250% 100%',
                }}
                initial={{ backgroundPosition: '120% 0' }}
                animate={{ backgroundPosition: '-20% 0' }}
                transition={{ duration: 1.6, delay: 1.1, ease: 'easeInOut' }}
              />
            )}
          </motion.div>
        </div>
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
