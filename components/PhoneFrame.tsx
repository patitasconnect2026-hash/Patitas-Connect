'use client'

import { MotionConfig } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, MapPin, ShieldCheck, Wallet } from 'lucide-react'
import { NOMBRE_CORTO, TEXTOS_PAGO } from '@/lib/config'
import { resumenComprobaciones, textoHastaComprobaciones } from '@/lib/verificacion'
import { Logo } from './ui/Logo'

/** Panel que se ve al costado del teléfono en pantallas grandes (para presentaciones). */
function DesktopPitch({ walker }: { walker: boolean }) {
  return (
    <aside className="hidden max-w-sm lg:block">
      <Link href="/" className="mb-8 inline-flex min-h-11 items-center gap-2 rounded-full bg-paper/70 px-4 text-[15px] font-extrabold text-ink ring-1 ring-ink/10 transition hover:bg-paper">
        <ArrowLeft size={18} aria-hidden /> Volver al inicio
      </Link>
      <div>
        <Logo size={48} />
      </div>
      <h2 className="font-display mt-9 text-[46px] font-bold leading-[1.02] tracking-tight text-ink text-balance">
        {walker ? (
          <>
            Gana paseando perros de tu <span className="italic text-brand">barrio</span>.
          </>
        ) : (
          <>
            El paseo <span className="italic text-brand">con cuidado</span> que tu mejor amigo merece.
          </>
        )}
      </h2>
      <p className="mt-4 text-lg leading-relaxed text-ink-soft">
        {walker
          ? 'Para estudiantes que viven o estudian en San Isidro y Jesús María.'
          : 'Vecinos estudiantes de San Isidro y Jesús María pasean a tu perro.'}
      </p>
      <ul className="mt-8 space-y-4">
        {[
          { icon: ShieldCheck, t: textoHastaComprobaciones(), d: resumenComprobaciones() },
          { icon: Wallet, t: `Pago a ${NOMBRE_CORTO}`, d: walker ? TEXTOS_PAGO.honestidadPaseador : TEXTOS_PAGO.honestidad },
          { icon: MapPin, t: 'Fotos y puntos de control', d: 'Con hora y lugar, en San Isidro y Jesús María.' },
        ].map((r) => (
          <li key={r.t} className="flex items-start gap-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-vino text-brand-50">
              <r.icon size={19} />
            </span>
            <span>
              <span className="block font-extrabold text-ink">{r.t}</span>
              <span className="block text-[14px] text-ink-soft">{r.d}</span>
            </span>
          </li>
        ))}
      </ul>
    </aside>
  )
}

/** Marco de teléfono compartido por la app del cliente y la del paseador. */
export function PhoneFrame({ children, walker = false }: { children: React.ReactNode; walker?: boolean }) {
  return (
    <MotionConfig reducedMotion="user">
      <div
        className="min-h-dvh sm:flex sm:items-center sm:justify-center sm:gap-24 sm:p-6"
        style={{
          backgroundColor: '#efe6d6',
          backgroundImage:
            'radial-gradient(48rem 32rem at 12% 8%, rgba(255,228,204,.9), transparent 60%), radial-gradient(44rem 32rem at 92% 92%, rgba(243,234,219,.9), transparent 60%)',
        }}
      >
        <DesktopPitch walker={walker} />
        <div className="relative isolate mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-canvas text-ink sm:mx-0 sm:h-[880px] sm:max-h-[calc(100dvh-3rem)] sm:shrink-0 sm:rounded-[3rem] sm:border-[10px] sm:border-ink sm:shadow-[0_40px_90px_-24px_rgba(15,23,42,0.5)]">
          {children}
        </div>
      </div>
    </MotionConfig>
  )
}
