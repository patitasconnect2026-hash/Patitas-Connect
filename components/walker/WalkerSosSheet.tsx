'use client'

import { useEffect, useMemo, useState } from 'react'
import { CircleCheck, Siren, X } from 'lucide-react'
import type { Job } from '@/lib/bus'
import { distritoDe, type Posicion } from '@/lib/sos'
import { btnRed } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { SosPanel, type EstadoUbicacion } from '../SosPanel'
import { Sheet } from '../ui/Sheet'

/**
 * SOS del paseador. La ubicación es la de SU teléfono (pide permiso). Necesita HTTPS en celular;
 * en localhost también funciona. Si no hay permiso o señal, el mensaje sale sin mapa y lo dice.
 */
export function WalkerSosSheet({
  job,
  walkerName,
  noted,
  onNote,
  onClose,
}: {
  job: Job
  walkerName: string
  /** Ya dejó el aviso en el paseo. */
  noted: boolean
  onNote: () => void
  onClose: () => void
}) {
  const [posicion, setPosicion] = useState<Posicion | null>(null)
  const [estado, setEstado] = useState<EstadoUbicacion>(() =>
    typeof navigator !== 'undefined' && 'geolocation' in navigator ? 'buscando' : 'sin',
  )

  useEffect(() => {
    if (!('geolocation' in navigator)) return
    let activo = true
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (!activo) return
        setPosicion({ lat: p.coords.latitude, lng: p.coords.longitude, origen: 'telefono' })
        setEstado('lista')
      },
      () => {
        if (!activo) return
        setEstado('sin')
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    )
    return () => {
      activo = false
    }
  }, [])

  const distrito = useMemo(() => job.distrito ?? distritoDe(job.address), [job.distrito, job.address])

  return (
    <Sheet label="Emergencia SOS del paseador" onClose={onClose} full>
      <div className="flex items-start justify-between gap-3 px-5 pb-1 pt-3">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-red-600 text-white">
            <Siren size={24} />
          </span>
          <div>
            <h2 className="font-display text-[25px] font-bold leading-tight text-ink">Emergencia</h2>
            <p className="text-[14px] text-ink-soft">Con {job.dog.name}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sand text-ink active:scale-95">
          <X size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3 pt-3">
        <SosPanel
          quien="paseador"
          perro={job.dog.name}
          paseador={walkerName}
          distrito={distrito}
          posicion={posicion}
          ubicacion={estado}
          emergencia={job.emergencia ?? null}
        />
        <p className="mt-5 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-[14px] font-medium leading-snug text-amber-900">
          Tú envías el mensaje. La app no llama sola.
        </p>
      </div>

      <div className="shrink-0 space-y-2.5 border-t border-ink/10 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {noted ? (
          <p className="flex items-center gap-2 rounded-2xl bg-forest-50 p-3 text-[14px] font-bold text-forest">
            <CircleCheck size={19} className="shrink-0" /> Aviso dejado en el paseo
          </p>
        ) : (
          <button type="button" onClick={onNote} className={cn(btnRed, 'h-14 w-full text-[15.5px]')}>
            <Siren size={20} /> Dejar aviso en el paseo
          </button>
        )}
        <p className="text-center text-[14px] leading-snug text-ink-soft">El dueño lo ve en su app solo si usa este mismo navegador (demostración).</p>
        <button type="button" onClick={onClose} className="h-12 w-full rounded-full text-[14px] font-bold text-ink-soft active:scale-95">
          Cerrar
        </button>
      </div>
    </Sheet>
  )
}
