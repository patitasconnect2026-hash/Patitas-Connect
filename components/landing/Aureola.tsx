'use client'

import Image from 'next/image'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { Camera } from 'lucide-react'
import { NOMBRE_APP } from '@/lib/config'
import { cn } from '@/lib/utils'

/* La aureola de la portada: una corona de fotos de perros y paseadores (Unsplash, no son clientes),
   con el isotipo al centro girando como una moneda y los tres avisos encima.
   Las fotos se levantan hacia afuera al pasar el mouse, así nunca tapan el centro ni los avisos. */

const FOTOS = [
  'calle',
  'lab',
  'grupo',
  'beagle',
  'correa',
  'playa',
  'sendero',
  'abrazo',
  'cuatro',
  'pelusa',
  'cachorro-correa',
  'corriendo',
  'negro',
  'bosque',
  'cachorro',
  'pradera',
  'orejas',
]

// Los tres avisos van en las esquinas, fuera de la corona: así ninguna foto los tapa ni ellos tapan fotos.
const ESQUINAS = ['left-0 top-[1%]', 'right-0 top-[1%]', 'left-0 bottom-[1%]']

/** Lugares de la corona: 18 fotos, una cada 20°, con aire entre ellas. Tamaño y giro varían un poco. */
const LUGARES = Array.from({ length: 18 }, (_, i) => i * 20 - 180).map((a, i) => ({
  a,
  foto: FOTOS[i % FOTOS.length],
  tam: [12, 10.5, 11.5][i % 3],
  giro: [-4, 3, -2, 5, 0][i % 5],
  radio: 35 + [0, 1, -1][i % 3],
}))

// Capas apiladas del isotipo: dan grosor de moneda cuando gira (en px, de atrás hacia adelante).
const GROSOR = Array.from({ length: 13 }, (_, i) => -9 + i * 1.5)

export type AvisoAureola = { icon: typeof Camera; t: string; d: string }

function Aviso({ icon: Icon, t, d, className }: AvisoAureola & { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 rounded-2xl bg-paper px-3.5 py-3 shadow-pop ring-1 ring-ink/5', className)}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
        <Icon size={19} aria-hidden />
      </span>
      <span className="leading-tight">
        <span className="block text-[14px] font-extrabold text-ink">{t}</span>
        <span className="block text-[13px] text-ink-soft">{d}</span>
      </span>
    </div>
  )
}

export function Aureola({ avisos, clave }: { avisos: AvisoAureola[]; clave: string }) {
  const reducir = useReducedMotion()
  return (
    <div className="w-full">
      <div className="relative mx-auto aspect-square w-full max-w-[560px]">
        {/* La corona de fotos. */}
        {LUGARES.map((l, i) => {
          const rad = (l.a * Math.PI) / 180
          const x = 50 + Math.cos(rad) * l.radio
          const y = 50 + Math.sin(rad) * l.radio
          return (
            <motion.div
              key={l.a}
              aria-hidden
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.05 + i * 0.03, ease: [0.22, 1, 0.36, 1] }}
              className="absolute z-0 hover:z-10"
              style={{ left: `${x}%`, top: `${y}%`, width: `${l.tam}%`, aspectRatio: '1', marginLeft: `${-l.tam / 2}%`, marginTop: `${-l.tam / 2}%` }}
            >
              <motion.div
                className="h-full w-full"
                animate={reducir ? undefined : { y: [0, -5, 0] }}
                transition={{ duration: 4 + (i % 3), repeat: Infinity, ease: 'easeInOut', delay: i * 0.25 }}
              >
                <div
                  className="group/foto h-full w-full transition-transform duration-300 ease-out [transform:rotate(var(--r))] motion-safe:hover:[transform:translate(var(--sx),var(--sy))_scale(1.18)]"
                  style={
                    {
                      '--r': `${l.giro}deg`,
                      '--sx': `${(Math.cos(rad) * 14).toFixed(1)}px`,
                      '--sy': `${(Math.sin(rad) * 14).toFixed(1)}px`,
                    } as React.CSSProperties
                  }
                >
                  <Image
                    src={`/fotos/aureola/${l.foto}.jpg`}
                    alt=""
                    width={360}
                    height={360}
                    sizes="(min-width: 768px) 80px, 14vw"
                    className="h-full w-full rounded-xl object-cover shadow-[0_10px_24px_-10px_rgba(0,0,0,.6)] ring-2 ring-white/85 transition-shadow duration-300 group-hover/foto:shadow-[0_22px_36px_-12px_rgba(0,0,0,.75)]"
                  />
                </div>
              </motion.div>
            </motion.div>
          )
        })}

        {/* El isotipo al centro, en 3D: capas apiladas le dan grosor y gira despacio sobre su eje, como una moneda. */}
        <div aria-hidden className="absolute inset-[24%] rounded-full bg-[radial-gradient(circle,rgba(233,150,114,.45),rgba(233,150,114,0)_68%)]" />
        <motion.div
          className="absolute inset-[30%] z-20 [perspective:1100px]"
          animate={reducir ? undefined : { y: [0, -8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.div
            className="relative h-full w-full [transform-style:preserve-3d]"
            style={{ rotateX: 8 }}
            animate={reducir ? undefined : { rotateY: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          >
            {GROSOR.map((z, k) => {
              const frente = k === GROSOR.length - 1
              const atras = k === 0
              return (
                <Image
                  key={z}
                  src="/marca/logo-mark.png"
                  alt={frente ? `Isotipo de ${NOMBRE_APP}: un perro abrazando a su cachorro` : ''}
                  aria-hidden={!frente}
                  width={482}
                  height={512}
                  priority={frente}
                  sizes="(min-width: 768px) 220px, 40vw"
                  className={cn('absolute inset-0 h-full w-full object-contain', (frente || atras) && '[backface-visibility:hidden]')}
                  style={{
                    transform: atras ? `translateZ(${z}px) rotateY(180deg)` : `translateZ(${z}px)`,
                    filter: frente || atras ? 'drop-shadow(0 18px 24px rgba(0,0,0,.35))' : 'brightness(.55) saturate(1.2)',
                  }}
                />
              )
            })}
          </motion.div>
        </motion.div>
        {/* Sombra en el «piso», debajo del isotipo. */}
        <div aria-hidden className="absolute bottom-[25%] left-1/2 h-[4%] w-[26%] -translate-x-1/2 rounded-[50%] bg-black/35 blur-md" />

        {/* Los tres avisos, encima de todo, en las esquinas (desde tablet). */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={clave}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-none absolute inset-0 z-30 hidden sm:block"
          >
            {avisos.map((a, i) => (
              <motion.div
                key={a.t}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.12 }}
                className={cn('absolute whitespace-nowrap', ESQUINAS[i])}
              >
                <Aviso {...a} />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* En celular los avisos van debajo, para que no tapen la corona. */}
      <ul className="mx-auto mt-5 grid max-w-sm gap-2.5 sm:hidden">
        {avisos.map((a) => (
          <li key={a.t}>
            <Aviso {...a} />
          </li>
        ))}
      </ul>
    </div>
  )
}
