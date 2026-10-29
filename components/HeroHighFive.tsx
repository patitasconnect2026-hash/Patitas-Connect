'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { PawMark } from './ui/Logo'
import { CREAM, FUR, FUR_D, ORG, ORG_D } from './ui/Chasqui'

const INK = '#0f172a'
const SKIN = '#f1b98f'
const SKIN_SHADE = '#d99568'

/** Punto donde se juntan las dos manos (en el sistema de coordenadas de la escena 330 × 214). */
const GRIP = { x: 150, y: 120 }

/** Pata de perro dorada que sube desde abajo a la izquierda, con las uñas bien a la vista. */
function DogPawShake() {
  const toes = [
    { x: 188, y: -26, r: 12.5, rot: -25 },
    { x: 204, y: -9, r: 13, rot: -8 },
    { x: 204, y: 10, r: 13, rot: 8 },
    { x: 188, y: 27, r: 12.5, rot: 25 },
  ]
  const fringeTop = 'M96 -24 l6 -10 l6 9 l6 -10 l6 9 l6 -10 l6 9 l6 -10 L142 -24Z'
  const fringeBot = 'M96 24 l6 10 l6 -9 l6 10 l6 -9 l6 10 l6 -9 l6 10 L142 24Z'
  const shapes = (
    <>
      <rect x="-140" y="-24" width="278" height="48" rx="10" />
      <path d={fringeTop} />
      <path d={fringeBot} />
      <ellipse cx="158" cy="0" rx="39" ry="33" />
      {toes.map((t, i) => (
        <circle key={i} cx={t.x} cy={t.y} r={t.r} />
      ))}
    </>
  )
  return (
    <svg viewBox="0 0 330 214" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
      <g transform="translate(89.4 197) rotate(-52)">
        <g fill="#0f172a" stroke="#0f172a" strokeWidth="9" strokeLinejoin="round">
          {shapes}
        </g>
        <g fill={FUR}>{shapes}</g>
        {/* sombra de abajo y pelo del puño */}
        <rect x="-140" y="9" width="278" height="15" rx="8" fill={FUR_D} opacity=".5" />
        <path d={fringeTop} fill={FUR_D} />
        <path d={fringeBot} fill={FUR_D} />
        {/* separación de dedos */}
        {toes.slice(0, -1).map((t, i) => {
          const n = toes[i + 1]
          const mx = (t.x + n.x) / 2
          const my = (t.y + n.y) / 2
          return <path key={i} d={`M${mx - 13} ${my * 0.85} Q${mx - 5} ${my * 0.95} ${mx + 3} ${my}`} stroke="#0f172a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        })}
        {/* uñas */}
        {toes.map((t, i) => {
          const rad = (t.rot * Math.PI) / 180
          const cx = t.x + Math.cos(rad) * (t.r + 0.5)
          const cy = t.y + Math.sin(rad) * (t.r + 0.5)
          return <ellipse key={i} cx={cx} cy={cy} rx="5.6" ry="3.8" transform={`rotate(${t.rot} ${cx} ${cy})`} fill={CREAM} stroke="#0f172a" strokeWidth="2" />
        })}
        <ellipse cx="146" cy="-14" rx="11" ry="4" fill="#fff" opacity=".28" transform="rotate(-8 146 -14)" />
      </g>
    </svg>
  )
}

/** Mano humana que sube desde abajo a la derecha y agarra la pata. */
function HumanHandShake() {
  const finger = (y: number, i: number) => <rect key={i} x="-64" y={y - 7.5} width="58" height="15" rx="7.5" />
  const fingerYs = [-22, -7.5, 7, 21.5]
  const shapes = (
    <>
      <rect x="40" y="-34" width="170" height="68" rx="14" />
      <rect x="-18" y="-27" width="70" height="54" rx="19" />
      {fingerYs.map(finger)}
      <rect x="-38" y="-40" width="66" height="17" rx="8.5" transform="rotate(-6 -5 -32)" />
    </>
  )
  return (
    <svg viewBox="0 0 330 214" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
      <g transform="translate(176 135) rotate(30)">
        <g fill="#0f172a" stroke="#0f172a" strokeWidth="9" strokeLinejoin="round">
          {shapes}
        </g>
        {/* manga y puño */}
        <rect x="40" y="-34" width="170" height="68" rx="14" fill={CREAM} />
        <rect x="40" y="-34" width="22" height="68" rx="8" fill={ORG} />
        <path d="M80 -20 Q92 -10 80 0 M80 8 Q92 18 80 28" stroke="#e7d6bf" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        {/* mano */}
        <g fill="#f1b98f">
          <rect x="-18" y="-27" width="70" height="54" rx="19" />
          {fingerYs.map(finger)}
          <rect x="-38" y="-40" width="66" height="17" rx="8.5" transform="rotate(-6 -5 -32)" />
        </g>
        {/* sombras y líneas */}
        <rect x="-18" y="8" width="70" height="19" rx="9" fill="#d99568" opacity=".45" />
        {fingerYs.map((y, i) => (
          <g key={i} stroke="#d99568" strokeWidth="2.2" strokeLinecap="round" fill="none">
            <path d={`M-30 ${y - 3} Q-28 ${y} -30 ${y + 3}`} />
            <path d={`M-48 ${y - 3} Q-46 ${y} -48 ${y + 3}`} />
          </g>
        ))}
        <path d="M-12 -34 Q-24 -32 -32 -33" stroke="#d99568" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <ellipse cx="-58" cy="-7.5" rx="3" ry="4.4" fill="#fff" opacity=".35" />
        <ellipse cx="-58" cy="-22" rx="3" ry="4.4" fill="#fff" opacity=".35" />
        <ellipse cx="-58" cy="7" rx="3" ry="4.4" fill="#fff" opacity=".35" />
        <ellipse cx="-58" cy="21.5" rx="3" ry="4.4" fill="#fff" opacity=".35" />
        <circle cx="12" cy="-6" r="0" fill={ORG_D} />
      </g>
    </svg>
  )
}

/** Explosión de "¡Trato hecho!" en el instante del choque. */
function Pop({ delay, x, y }: { delay: number; x: number; y: number }) {
  const star = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2
    const r = i % 2 === 0 ? 30 : 16
    return `${(36 + Math.cos(a) * r).toFixed(1)},${(36 + Math.sin(a) * r).toFixed(1)}`
  }).join(' ')
  return (
    <div className="pointer-events-none absolute h-0 w-0" style={{ left: x, top: y }} aria-hidden>
      <motion.svg
        viewBox="0 0 72 72"
        className="absolute left-0 top-0 h-[88px] w-[88px] -translate-x-1/2 -translate-y-1/2"
        initial={{ scale: 0, rotate: -20, opacity: 0 }}
        animate={{ scale: [0, 1.25, 1, 1], rotate: [-20, 6, 0, 0], opacity: [0, 1, 1, 0] }}
        transition={{ delay, duration: 1.1, times: [0, 0.18, 0.35, 1], ease: 'easeOut' }}
      >
        <polygon points={star} fill="#ffd23f" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
      </motion.svg>
      <motion.span
        className="font-display absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 -rotate-6 whitespace-nowrap rounded-full bg-brand-50 px-2.5 py-1 text-[14px] font-bold italic text-ink ring-2 ring-ink"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.15, 1, 1], opacity: [0, 1, 1, 0], y: [0, -4, -4, -12] }}
        transition={{ delay: delay + 0.05, duration: 1.1, times: [0, 0.2, 0.4, 1], ease: 'easeOut' }}
      >
        ¡Trato hecho!
      </motion.span>
    </div>
  )
}

/** Huellas que van apareciendo, como si un perro caminara por el borde del hero. */
export function PawTrail({ className }: { className?: string }) {
  const steps = [
    { l: '6%', b: 10, r: -16 },
    { l: '21%', b: 22, r: 14 },
    { l: '37%', b: 8, r: -12 },
    { l: '53%', b: 20, r: 16 },
    { l: '69%', b: 8, r: -14 },
    { l: '85%', b: 20, r: 12 },
  ]
  return (
    <div className={className} aria-hidden>
      {steps.map((s, i) => (
        <motion.span
          key={i}
          className="absolute text-brand-50"
          style={{ left: s.l, bottom: s.b, rotate: s.r }}
          animate={{ opacity: [0, 0.5, 0.5, 0], scale: [0.6, 1, 1, 1] }}
          transition={{ duration: 3.6, repeat: Infinity, delay: i * 0.45, times: [0, 0.12, 0.75, 1], repeatDelay: 0.6 }}
        >
          <PawMark className="h-6 w-6" />
        </motion.span>
      ))}
    </div>
  )
}

/** "Trato hecho": la mano de una persona y la pata de un perro se dan la mano, en bucle. */
export function HeroHighFive() {
  const reduce = useReducedMotion()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => setTick((t) => t + 1), 3900)
    return () => clearInterval(id)
  }, [reduce])

  const first = tick === 0
  // Ciclo: acercarse (0.5 s) → apretar y sacudir (1.1 s) → soltar un poco
  const times = [0, 0.3, 0.8, 1]
  const duration = 3.4
  const origin = `${GRIP.x}px ${GRIP.y}px`

  return (
    <div className="relative mx-auto h-[214px] w-[330px] overflow-hidden [mask-image:linear-gradient(to_bottom,black_90%,transparent_100%)]" aria-hidden>
      <div className="absolute left-[70px] top-[18px] h-[176px] w-[176px] rounded-full bg-brand-400/70" />

      {/* sacudida del apretón */}
      <motion.div
        key={`shake${tick}`}
        className="absolute inset-0"
        style={{ transformOrigin: origin }}
        animate={reduce ? undefined : { rotate: [0, 0, -6, 5, -4, 3, -1, 0, 0], y: [0, 0, -3, 2, -2, 1, 0, 0, 0] }}
        transition={{ duration, times: [0, 0.16, 0.24, 0.32, 0.4, 0.48, 0.56, 0.64, 1], ease: 'easeInOut' }}
      >
        <motion.div
          key={`dog${tick}`}
          className="absolute inset-0"
          initial={{ x: first ? -70 : -14, y: first ? 54 : 10 }}
          animate={reduce ? { x: 0, y: 0 } : { x: [first ? -70 : -14, 0, 0, -14], y: [first ? 54 : 10, 0, 0, 10] }}
          transition={{ duration, times, ease: 'easeOut' }}
        >
          <DogPawShake />
        </motion.div>
        <motion.div
          key={`hand${tick}`}
          className="absolute inset-0"
          initial={{ x: first ? 80 : 16, y: first ? 50 : 10 }}
          animate={reduce ? { x: 0, y: 0 } : { x: [first ? 80 : 16, 0, 0, 16], y: [first ? 50 : 10, 0, 0, 10] }}
          transition={{ duration, times, ease: 'easeOut' }}
        >
          <HumanHandShake />
        </motion.div>
      </motion.div>

      {!reduce && <Pop key={`pop${tick}`} delay={0.5} x={100} y={62} />}
    </div>
  )
}
