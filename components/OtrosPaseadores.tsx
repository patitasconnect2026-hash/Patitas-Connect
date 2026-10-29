'use client'

import { ArrowRight, Star } from 'lucide-react'
import { btnPrimary } from '@/lib/ui'
import { cn } from '@/lib/utils'
import type { Walker } from '@/lib/types'
import { EtiquetaEjemplo } from './ui/EtiquetaEjemplo'
import { PortraitAvatar } from './ui/PortraitAvatar'
import { tieneCalificacion } from '@/lib/calificacion'

/**
 * Reasignación: hasta 3 paseadores libres a la misma hora. La familia elige a mano; no se avisa a nadie solo.
 * Sin celulares ni dirección: solo nombre, calificación y etiqueta «Ejemplo».
 */
export function OtrosPaseadores({
  opciones,
  slot,
  onReservar,
  onOtroHorario,
  className,
}: {
  opciones: Walker[]
  /** «Hoy · 10:00 am» */
  slot: string
  onReservar: (w: Walker) => void
  onOtroHorario: () => void
  className?: string
}) {
  if (opciones.length === 0) {
    return (
      <section aria-label="Otros paseadores" className={cn('rounded-3xl border border-ink/10 bg-paper p-4 shadow-card', className)}>
        <p className="font-display text-[20px] font-bold leading-tight text-ink">Aún no hay otro paseador libre a esa hora</p>
        <button type="button" onClick={onOtroHorario} className={cn(btnPrimary, 'mt-3 h-12 w-full text-[14.5px]')}>
          Elegir otro horario <ArrowRight size={18} strokeWidth={2.6} />
        </button>
      </section>
    )
  }
  return (
    <section aria-label="Otros paseadores" className={cn('rounded-3xl border border-ink/10 bg-paper p-4 shadow-card', className)}>
      <h2 className="font-display text-[22px] font-bold leading-tight text-ink">Otros paseadores libres</h2>
      <p className="text-[14px] leading-snug text-ink-soft">{slot}. Tú eliges.</p>
      <ul className="mt-3 space-y-2.5">
        {opciones.map((w) => (
          <li key={w.id} className="flex items-center gap-3 rounded-2xl bg-sand p-3">
            <PortraitAvatar portrait={w.portrait} photo={w.photo} alt={`Foto de ${w.name}`} className="h-[52px] w-[42px] shrink-0 rounded-t-3xl rounded-b-xl border border-ink/10" />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 text-[15px] font-extrabold leading-tight text-ink">
                <span className="truncate">{w.name}</span>
                {w.esEjemplo && <EtiquetaEjemplo />}
              </p>
              <p className="flex items-center gap-1 text-[14px] text-ink-soft">
                {!tieneCalificacion(w) ? (
                  w.neighbor
                ) : (
                  <>
                    <Star size={14} className="fill-gold text-gold" /> {String(w.rating).replace('.', ',')}
                  </>
                )}
              </p>
            </div>
            <button type="button" onClick={() => onReservar(w)} className="min-h-11 shrink-0 rounded-full bg-brand-700 px-4 text-[14px] font-extrabold text-white active:scale-95">
              Reservar
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
