'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Check, Circle } from 'lucide-react'
import { chequeoSalida, puedeSalir } from '@/lib/protocoloSenal'
import { cn } from '@/lib/utils'

type Bateria = { level: number; charging: boolean }

/** Antes de «Voy en camino»: batería, ubicación y datos. Avisa, no bloquea (el navegador no siempre deja leerlos). */
export function ChecklistSalida() {
  const [bateria, setBateria] = useState<Bateria | null>(null)
  const [ubicacion, setUbicacion] = useState<boolean | null>(null)
  const [enLinea, setEnLinea] = useState(true)

  useEffect(() => {
    let vivo = true
    const t = setTimeout(() => {
      if (!vivo) return
      setEnLinea(navigator.onLine)
      const nav = navigator as Navigator & { getBattery?: () => Promise<Bateria> }
      nav.getBattery?.().then((b) => vivo && setBateria({ level: b.level, charging: b.charging })).catch(() => undefined)
      navigator.permissions
        ?.query({ name: 'geolocation' as PermissionName })
        .then((p) => vivo && setUbicacion(p.state === 'granted' ? true : p.state === 'denied' ? false : null))
        .catch(() => undefined)
    }, 0)
    return () => {
      vivo = false
      clearTimeout(t)
    }
  }, [])

  const lista = chequeoSalida({ bateria: bateria?.level ?? null, cargando: bateria?.charging ?? false, ubicacionPermitida: ubicacion, enLinea })
  const ok = puedeSalir(lista)

  return (
    <section aria-label="Antes de salir" className={cn('rounded-2xl p-3', ok ? 'bg-sand' : 'bg-amber-50 ring-1 ring-amber-300')}>
      <p className="flex items-center gap-2 text-[14px] font-extrabold text-ink">
        {!ok && <AlertTriangle size={16} className="text-amber-700" aria-hidden />} Antes de salir
      </p>
      <ul className="mt-1.5 space-y-1">
        {lista.map((x) => (
          <li key={x.id} className="flex items-center gap-2 text-[14px] text-ink">
            {x.ok === true ? <Check size={15} className="text-forest" aria-hidden /> : x.ok === false ? <AlertTriangle size={15} className="text-amber-700" aria-hidden /> : <Circle size={13} className="text-ink-soft" aria-hidden />}
            {x.texto}
          </li>
        ))}
      </ul>
    </section>
  )
}
