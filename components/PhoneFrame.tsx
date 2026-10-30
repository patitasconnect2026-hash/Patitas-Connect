'use client'

import { MotionConfig, motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, MapPin, ShieldCheck, Wallet } from 'lucide-react'
import { NOMBRE_CORTO, TEXTOS_PAGO } from '@/lib/config'
import { resumenComprobaciones, textoHastaComprobaciones } from '@/lib/verificacion'
import { Logo } from './ui/Logo'

const subir = (i: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] as const },
})

/** Panel que se ve al costado de la app en pantallas grandes: la marca y lo que la cuida, con entrada escalonada. */
function DesktopPitch({ walker }: { walker: boolean }) {
  return (
    <aside className="hidden self-center lg:block">
      <motion.h2 {...subir(0)} className="font-display text-[52px] font-bold leading-[1.02] text-ink text-balance">
        {walker ? (
          <>
            Pasea perros. Gana <span className="text-brand-700">entre clases</span>.
          </>
        ) : (
          <>
            Paseos <span className="text-brand-700">felices</span>, dueños tranquilos.
          </>
        )}
      </motion.h2>
      <motion.p {...subir(1)} className="mt-4 text-lg leading-relaxed text-ink-soft">
        {walker
          ? 'Para estudiantes que viven o estudian en San Isidro y Jesús María.'
          : 'Paseadores de tu barrio. Tú eliges el horario y pagas al terminar.'}
      </motion.p>
      <ul className="mt-8 space-y-4">
        {[
          { icon: ShieldCheck, t: textoHastaComprobaciones(), d: resumenComprobaciones() },
          { icon: Wallet, t: `Pago a ${NOMBRE_CORTO}`, d: walker ? TEXTOS_PAGO.honestidadPaseador : TEXTOS_PAGO.honestidad },
          { icon: MapPin, t: 'Fotos y puntos de control', d: 'Con hora y lugar, en San Isidro y Jesús María.' },
        ].map((r, i) => (
          <motion.li key={r.t} {...subir(2 + i)} className="flex items-start gap-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-vino text-brand-50">
              <r.icon size={19} />
            </span>
            <span>
              <span className="block font-extrabold text-ink">{r.t}</span>
              <span className="block text-[14px] text-ink-soft">{r.d}</span>
            </span>
          </motion.li>
        ))}
      </ul>
    </aside>
  )
}

/** Marco de la app de familias y de paseadores. En celular ocupa toda la pantalla; desde tablet es una página web:
 *  barra con el logo arriba, la marca a la izquierda (en laptop) y la app en un panel ancho que entra con un leve movimiento. */
export function PhoneFrame({ children, walker = false }: { children: React.ReactNode; walker?: boolean }) {
  return (
    <MotionConfig reducedMotion="user">
      <div
        className="min-h-dvh sm:flex sm:flex-col"
        style={{
          backgroundColor: '#efe6d6',
          backgroundImage:
            'radial-gradient(48rem 32rem at 12% 8%, rgba(255,228,204,.9), transparent 60%), radial-gradient(44rem 32rem at 92% 92%, rgba(243,234,219,.9), transparent 60%)',
        }}
      >
        <header className="hidden border-b border-ink/5 bg-canvas/80 backdrop-blur sm:block">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
            <Link href="/" aria-label="Ir al inicio" className="shrink-0">
              <Logo size={40} />
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-paper/80 px-4 text-[15px] font-extrabold text-ink ring-1 ring-ink/10 transition hover:bg-paper"
            >
              <ArrowLeft size={18} aria-hidden /> Volver al inicio
            </Link>
          </div>
        </header>
        <div className="sm:mx-auto sm:grid sm:w-full sm:max-w-7xl sm:flex-1 sm:items-center sm:px-6 sm:py-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <DesktopPitch walker={walker} />
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative isolate mx-auto flex h-dvh w-full flex-col overflow-hidden bg-canvas text-ink sm:h-[calc(100dvh-6.5rem)] sm:max-h-[900px] sm:max-w-[760px] sm:rounded-[2rem] sm:shadow-[0_40px_90px_-30px_rgba(91,34,41,0.45)] sm:ring-1 sm:ring-ink/5 lg:max-w-none"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </MotionConfig>
  )
}
