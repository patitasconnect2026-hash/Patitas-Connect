'use client'

import { useEffect, useRef } from 'react'
import { BadgeCheck, FileSearch, ShieldCheck, X } from 'lucide-react'
import type { Walker } from '@/lib/types'
import { EtiquetaEjemplo } from './ui/EtiquetaEjemplo'
import { Sheet } from './ui/Sheet'

/**
 * El DNI del paseador, solo con los últimos 4 dígitos (decisión del equipo). El número completo lo ve solo el equipo.
 * Al abrir esta hoja queda anotado que se vio la versión parcial; el paseador puede consultarlo («Quién abrió tu DNI»).
 */
export function DniSheet({ walker, onView, onClose }: { walker: Walker; onView: () => void; onClose: () => void }) {
  // Se anota una sola vez por apertura (aunque React ejecute el efecto dos veces en desarrollo).
  const anotado = useRef(false)
  useEffect(() => {
    if (anotado.current) return
    anotado.current = true
    onView()
  }, [onView])

  return (
    <Sheet label={`DNI de ${walker.name}`} onClose={onClose}>
      <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-4">
        <div>
          <p className="eyebrow text-brand-700">Comprueba su identidad</p>
          <h2 className="font-display text-[26px] font-bold leading-tight text-ink">DNI de {walker.firstName}</h2>
          {walker.esEjemplo && <EtiquetaEjemplo className="mt-1" />}
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-11 w-11 place-items-center rounded-full bg-sand active:scale-95">
          <X size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-6">
        <div className="rounded-3xl border border-ink/10 bg-canvas p-4 text-center">
          <p className="eyebrow text-ink-soft">Últimos 4 dígitos</p>
          <p className="mt-1 font-display text-[40px] font-bold leading-none tracking-[0.12em] tabular-nums text-ink">••••{walker.dni.slice(-4)}</p>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-[14px] font-bold text-forest">
            <BadgeCheck size={14} /> Código {walker.code}
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-2xl bg-forest-50 p-3.5">
          <FileSearch size={19} className="mt-0.5 shrink-0 text-forest" />
          <p className="text-[14px] leading-snug text-forest">
            <b>Cómo comprobarlo:</b> cuando {walker.firstName} llegue, pídele su DNI físico. Compara los últimos 4 dígitos y la foto con su perfil. Si algo no coincide, no le entregues a tu perro y escríbenos.
          </p>
        </div>

        <p className="flex items-start gap-2 text-[14px] leading-snug text-ink-soft">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" />
          {walker.firstName} aceptó que veas solo los últimos 4 dígitos. Él puede ver que abriste esta hoja.
        </p>
      </div>
    </Sheet>
  )
}
