'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { CircleCheck, ShieldAlert, Siren, X } from 'lucide-react'
import { etiquetaAyuda, NOMBRE_CORTO } from '@/lib/config'
import { pointAt } from '@/lib/route'
import type { Distrito, Posicion } from '@/lib/sos'
import type { Walk } from '@/lib/types'
import { btnInk, btnRed } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { SosPanel } from './SosPanel'
import { Sheet } from './ui/Sheet'

/**
 * SOS del dueño. Todo lo que hace es abrir una llamada o un WhatsApp ya escrito (tel: y wa.me).
 * La posición del paseo es SIMULADA en esta demostración y el mensaje lo dice así.
 */
export function SosSheet({
  walk,
  distrito,
  onActivate,
  onCancelAlert,
  onClose,
}: {
  walk: Walk
  /** Distrito del paseo: de ahí sale el serenazgo. Si no se sabe, se muestran los dos. */
  distrito: Distrito | null
  onActivate: () => void
  onCancelAlert: () => void
  onClose: () => void
}) {
  const { booking: b } = walk
  const noted = walk.sos === 'on'
  const posicion: Posicion = useMemo(() => {
    const [lat, lng] = pointAt(walk.progress)
    return { lat, lng, origen: 'simulada' }
  }, [walk.progress])

  return (
    <Sheet label="Emergencia SOS" onClose={onClose} full>
      <div className="flex items-start justify-between gap-3 px-5 pb-1 pt-3">
        <div className="flex items-center gap-3">
          <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-red-600 text-white">
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-2xl bg-red-500"
              animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
            />
            {noted ? <ShieldAlert size={24} className="relative" /> : <Siren size={24} className="relative" />}
          </span>
          <div>
            <h2 className="font-display text-[25px] font-bold leading-tight text-ink">¿Necesitas ayuda?</h2>
            <p className="text-[14px] text-ink-soft">{etiquetaAyuda(`Ayuda de ${NOMBRE_CORTO}`)}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sand text-ink active:scale-95">
          <X size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3 pt-3">
        <p className="mb-4 text-[14.5px] leading-relaxed text-ink-soft">
          Si {b.dog.name} está en peligro, <b className="text-ink">llama de inmediato</b>. Tú envías el mensaje; la app no llama sola.
        </p>

        <SosPanel
          quien="dueno"
          perro={b.dog.name}
          paseador={b.walker.firstName}
          distrito={distrito}
          posicion={posicion}
          ubicacion="lista"
          emergencia={null}
        />

        <p className="mt-5 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-[14px] font-medium leading-snug text-amber-900">
          Modo demostración: la ubicación del paseo es simulada y el mensaje la marca como tal.
        </p>
      </div>

      <div className="shrink-0 space-y-2.5 border-t border-ink/10 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {!noted ? (
          <button type="button" onClick={onActivate} className={cn(btnRed, 'h-14 w-full text-[15.5px]')}>
            <Siren size={20} /> Anotar alerta en la bitácora
          </button>
        ) : (
          <>
            <p className="flex items-center gap-2 rounded-2xl bg-forest-50 p-3 text-[14px] font-bold text-forest">
              <CircleCheck size={19} className="shrink-0" /> Alerta anotada en la bitácora del paseo
            </p>
            <button
              type="button"
              onClick={() => {
                onCancelAlert()
                onClose()
              }}
              className={cn(btnInk, 'h-14 w-full text-[15px]')}
            >
              Estoy bien, quitar la alerta
            </button>
          </>
        )}
        <button type="button" onClick={onClose} className="h-12 w-full rounded-full text-[14px] font-bold text-ink-soft active:scale-95">
          Cerrar
        </button>
      </div>
    </Sheet>
  )
}
