'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, Check, ChevronRight, Copy, Gift, LifeBuoy, LogOut, PawPrint, Plus, ShieldCheck, Star, Trash2, UserRound, Wallet } from 'lucide-react'
import { CONFIG, contactoPrincipal, etiquetaAyuda, TEXTOS_PAGO } from '@/lib/config'
import { PAST_WALKS } from '@/lib/data'
import { SIZE_INFO } from '@/lib/schedule'
import type { Pago } from '@/lib/pagos'
import { textoPagoDueno } from '@/lib/pagosTextos'
import type { Persona } from '@/lib/sos'
import type { Account, Dog, Review, Walk } from '@/lib/types'
import { cn, soles } from '@/lib/utils'
import { DogAvatar } from './ui/Dog'
import { EtiquetaEjemplo } from './ui/EtiquetaEjemplo'
import { InterruptorEjemplos } from './ui/InterruptorEjemplos'
import { Stars } from './ui/Stars'

export function ProfileView({
  account,
  dogs,
  walk,
  reviews,
  welcomeUsed,
  applied,
  onOpenDog,
  onAddDog,
  onApply,
  onReset,
  onSalir,
  onBorrarCuenta,
  emergencia,
  onOpenEmergencia,
  onOpenAyuda,
  pago,
  mostrarEjemplos,
  onMostrarEjemplos,
}: {
  account: Account | null
  dogs: Dog[]
  walk: Walk | null
  reviews: Review[]
  welcomeUsed: boolean
  applied: boolean
  onOpenDog: (d: Dog) => void
  onAddDog: () => void
  onApply: () => void
  onReset: () => void
  /** Solo con servidor y con sesión: cierra la sesión (no borra lo que hay en el teléfono). Reemplaza a «reiniciar la demo». */
  onSalir?: () => void
  /** Solo con servidor y con sesión: abre «¿Borrar tu cuenta?». Sin esto no se ofrece. */
  onBorrarCuenta?: () => void
  /** Contacto de emergencia guardado (solo en este teléfono). */
  emergencia: Persona | null
  onOpenEmergencia: () => void
  onOpenAyuda: () => void
  /** El pago del paseo en curso (libro de pagos). null = no hay un paseo en curso. */
  pago: Pago | null
  /** «Mostrar ejemplos»: los paseos anteriores inventados solo salen si está encendido. */
  mostrarEjemplos: boolean
  /** Sin esto no se ofrece el interruptor (con servidor y sesión no hay ejemplos). */
  onMostrarEjemplos?: (v: boolean) => void
}) {
  const [copied, setCopied] = useState(false)
  // Lo que le debes a Patitas por el paseo en curso: solo mientras falta pagar o verificar.
  const debes = walk && pago && (pago.estado === 'sin_pagar' || pago.estado === 'no_encontrado') ? pago.monto : 0
  const textoPago = pago ? textoPagoDueno(pago.estado, walk?.booking.walker.firstName ?? '') : null
  const code = account ? `${account.firstName.toUpperCase().replace(/[^A-ZÑ]/g, '')}10` : 'PATITAS10'
  const initials = account ? `${account.firstName[0] ?? ''}${account.lastName[0] ?? ''}` : '?'

  return (
    <div className="pb-8">
      <header className="relative overflow-hidden bg-brand-700 px-5 pb-14 pt-[max(1.5rem,env(safe-area-inset-top))] text-white">
        <PawPrint className="absolute -right-6 -top-4 h-36 w-36 -rotate-12 text-white/10" strokeWidth={1.5} />
        <div className="relative flex items-center gap-4">
          <span className="grid h-[68px] w-[68px] place-items-center rounded-full bg-brand-50 font-display text-[26px] font-bold text-brand-800">{initials}</span>
          <div>
            <h1 className="font-display text-[28px] font-bold leading-none">{account ? `${account.firstName} ${account.lastName}` : 'Tu cuenta'}</h1>
            <p className="mt-1.5 text-[14px] text-white">{account ? `${account.street} · ${account.district}` : ''}</p>
          </div>
        </div>
      </header>

      {/* Pago del paseo (a Patitas; el equipo lo verifica a mano) */}
      <section className="relative -mt-9 px-4">
        <motion.div layout className="rounded-3xl border border-ink/10 bg-paper p-4 shadow-card" aria-label="Pago del paseo">
          <div className="flex items-center gap-3">
            <span className={cn('grid h-11 w-11 place-items-center rounded-2xl', debes ? 'bg-brand-700 text-white' : 'bg-sand text-ink-soft')}>
              <Wallet size={20} />
            </span>
            <div className="flex-1">
              <p className="eyebrow text-ink-soft">Pago del paseo</p>
              <p className="font-display text-[28px] font-bold leading-none tabular-nums text-ink">{soles(debes)}</p>
            </div>
            {textoPago && pago && pago.estado !== 'sin_pagar' && pago.estado !== 'no_encontrado' && (
              <span className="rounded-full bg-forest-50 px-2.5 py-1 text-[12px] font-extrabold text-forest">{textoPago.titulo}</span>
            )}
          </div>
          <p className="mt-2.5 text-[14px] leading-snug text-ink-soft">
            {debes ? textoPago?.apoyo : 'Sin pagos pendientes.'} {TEXTOS_PAGO.honestidad}
          </p>
        </motion.div>
      </section>

      {/* Invita y gana (solo si el descuento de bienvenida está encendido en lib/config.ts) */}
      {CONFIG.descuentoBienvenida > 0 && (
      <section className="mt-4 px-4">
        <div className="flex items-center gap-3.5 rounded-3xl bg-ink p-4 text-brand-50">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-600">
            <Gift size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[18px] font-bold leading-tight">Invita a un vecino</p>
            <p className="text-[14px] leading-snug text-brand-50/70">Los dos reciben S/ {CONFIG.descuentoBienvenida} en su paseo. {welcomeUsed ? '' : `Tú tienes S/ ${CONFIG.descuentoBienvenida} listos.`}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1800)
            }}
            className="min-h-11 flex max-w-[132px] shrink-0 items-center gap-1.5 rounded-full bg-brand-50 px-3.5 py-2 text-[14px] font-extrabold tracking-wide text-ink active:scale-95"
          >
            {copied ? <Check size={14} className="shrink-0 text-forest" /> : <Copy size={14} className="shrink-0" />}
            <span className="truncate">{copied ? 'Copiado' : code}</span>
          </button>
        </div>
      </section>
      )}

      {/* Perros */}
      <section className="mt-7 px-4">
        <div className="flex items-end justify-between px-1">
          <h2 className="font-display text-[26px] font-bold leading-tight text-ink">Mis perros</h2>
          <button type="button" onClick={onAddDog} className="min-h-11 flex items-center gap-1 pb-1 text-[14px] font-extrabold text-brand-700">
            <Plus size={15} strokeWidth={3} /> Agregar
          </button>
        </div>
        {dogs.length === 0 ? (
          <button type="button" onClick={onAddDog} className="min-h-11 mt-3 flex w-full items-center gap-3 rounded-3xl border-2 border-dashed border-brand-600/40 bg-brand-50/60 p-4 text-left">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-600 text-white">
              <Plus size={22} />
            </span>
            <span className="text-[14px] font-extrabold text-ink">Registra a tu perro con su foto</span>
          </button>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {dogs.map((d) => (
              <button key={d.id} type="button" onClick={() => onOpenDog(d)} className="min-h-11 rounded-3xl border border-ink/10 bg-paper p-3 text-left shadow-card active:scale-[0.98]">
                <DogAvatar dog={d} className="h-28 w-full rounded-2xl" />
                <p className="mt-2.5 font-display text-[20px] font-bold leading-none text-ink">{d.name}</p>
                <p className="mt-1 text-[14px] text-ink-soft">
                  {SIZE_INFO[d.size].label} · {d.breed}
                </p>
                <p className={cn('mt-2 flex items-center gap-1 text-[12px] font-extrabold', d.vaccinated ? 'text-forest' : 'text-amber-700')}>
                  <ShieldCheck size={13} /> {d.vaccinated ? 'Vacunas al día' : 'Vacunas pendientes'}
                </p>
                <p className="mt-1 text-[12px] font-bold text-brand-700">Ver ficha y chapita QR</p>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Reseñas */}
      {reviews.length > 0 && (
        <section className="mt-7 px-4">
          <h2 className="px-1 font-display text-[26px] font-bold leading-tight text-ink">Mis reseñas</h2>
          <ul className="mt-3 space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-3xl border border-ink/10 bg-paper p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <Stars value={r.rating} size={14} />
                  <span className="text-[12px] font-semibold text-ink-soft">{r.when}</span>
                </div>
                {r.text && <p className="mt-2 font-display text-[16px] italic leading-snug text-ink">“{r.text}”</p>}
                <p className="mt-2 flex items-center gap-1 text-[14px] font-bold text-ink-soft">
                  <Star size={12} className="fill-gold text-gold" /> {r.author}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Historial */}
      <section className="mt-7 px-4">
        <h2 className="px-1 font-display text-[26px] font-bold leading-tight text-ink">Historial de paseos</h2>
        <ul className="mt-3 divide-y divide-ink/10 overflow-hidden rounded-3xl border border-ink/10 bg-paper shadow-card">
          {walk && (
            <li className="flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-red-600">
                <PawPrint size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-extrabold text-ink">
                  {walk.booking.dog.name} con {walk.booking.walker.name}
                </p>
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-ink-soft">
                  Hoy · {walk.phase === 'completed' ? 'Completado' : 'En curso'}
                  {walk.booking.walker.esEjemplo && <EtiquetaEjemplo />}
                </p>
              </div>
              <span className="font-display text-[16px] font-bold text-ink">{soles(walk.booking.total)}</span>
            </li>
          )}
          {(mostrarEjemplos ? PAST_WALKS : []).map((p) => (
            <li key={p.id} className="flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-forest-50 text-forest">
                <ShieldCheck size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-extrabold text-ink">
                  {p.dog} con {p.walker}
                </p>
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-ink-soft">
                  {p.when} · Completado
                  {p.esEjemplo && <EtiquetaEjemplo />}
                </p>
              </div>
              <span className="font-display text-[16px] font-bold text-ink">{soles(p.total)}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Datos de ejemplo */}
      {onMostrarEjemplos && (
        <section className="mt-7 px-4">
          <InterruptorEjemplos activo={mostrarEjemplos} onChange={onMostrarEjemplos} />
        </section>
      )}

      {/* Ajustes */}
      <section className="mt-7 px-4">
        <ul className="divide-y divide-ink/10 overflow-hidden rounded-3xl border border-ink/10 bg-paper shadow-card">
          {[
            { icon: Bell, label: 'Avisos del paseo', hint: 'Dentro de la app', onClick: undefined },
            { icon: UserRound, label: 'Contacto de emergencia', hint: emergencia ? emergencia.nombre : 'Agregar', onClick: onOpenEmergencia },
            { icon: PawPrint, label: 'Postular como paseador', hint: applied ? 'Enviada' : 'Estudiantes', onClick: onApply },
            { icon: LifeBuoy, label: etiquetaAyuda('Ayuda'), hint: contactoPrincipal() ? '' : 'Falta configurar', onClick: onOpenAyuda },
          ].map((r) => (
            <li key={r.label}>
              <button type="button" onClick={r.onClick} className="min-h-11 flex w-full items-center gap-3 px-5 py-4 text-left active:bg-sand">
                <r.icon size={19} className="text-ink-soft" />
                <span className="flex-1 text-[14.5px] font-bold text-ink">{r.label}</span>
                {r.hint && <span className="text-[12px] text-ink-soft">{r.hint}</span>}
                <ChevronRight size={17} className="text-ink/25" />
              </button>
            </li>
          ))}
        </ul>
        {onSalir ? (
          <button type="button" onClick={onSalir} className="min-h-11 mx-auto mt-5 flex items-center gap-2 text-[14px] font-bold text-ink-soft underline underline-offset-4">
            <LogOut size={14} /> Salir
          </button>
        ) : (
          <button type="button" onClick={onReset} className="min-h-11 mx-auto mt-5 flex items-center gap-2 text-[14px] font-bold text-ink-soft underline underline-offset-4">
            <LogOut size={14} /> Cerrar sesión y reiniciar la demo
          </button>
        )}
        {onBorrarCuenta && (
          <button type="button" onClick={onBorrarCuenta} className="min-h-11 mx-auto mt-1 flex items-center gap-2 text-[14px] font-bold text-red-700 underline underline-offset-4">
            <Trash2 size={14} /> Borrar mi cuenta
          </button>
        )}
      </section>
    </div>
  )
}
