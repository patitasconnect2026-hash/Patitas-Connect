'use client'

import { LifeBuoy, Siren, X } from 'lucide-react'
import { NOMBRE_APP } from '@/lib/config'
import { situaciones, TEXTO_ALGO_PASA } from '@/lib/equipoTextos'
import type { Distrito } from '@/lib/sos'
import { btnRed } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { ContactosSos } from './SosPanel'
import { Sheet } from './ui/Sheet'

/**
 * «Si algo pasa»: pasos para un perro perdido, herido o una pelea, y a quién llamar. El botón de SOS abre el SOS del
 * paseo (el mismo de «Paseo») y solo existe cuando hay un paseo en curso. Los contactos salen de lib/config.ts.
 */
export function SiAlgoPasaSheet({
  distrito,
  paseoEnCurso,
  onOpenSos,
  onClose,
}: {
  /** Distrito de la casa. null = no se sabe: salen los dos serenazgos. */
  distrito: Distrito | null
  paseoEnCurso: boolean
  onOpenSos: () => void
  onClose: () => void
}) {
  return (
    <Sheet label={TEXTO_ALGO_PASA.titulo} onClose={onClose} full>
      <div className="flex items-start justify-between gap-3 border-b border-ink/10 px-5 pb-3 pt-3">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sand text-ink">
            <LifeBuoy size={24} />
          </span>
          <div>
            <h2 className="font-display text-[28px] font-bold leading-tight text-ink">{TEXTO_ALGO_PASA.titulo}</h2>
            <p className="text-[14px] leading-snug text-ink-soft">{TEXTO_ALGO_PASA.apoyo}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sand text-ink active:scale-95">
          <X size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
        {paseoEnCurso ? (
          <div>
            <button type="button" onClick={onOpenSos} className={cn(btnRed, 'h-14 w-full text-[15.5px]')}>
              <Siren size={20} /> {TEXTO_ALGO_PASA.botonSos}
            </button>
            <p className="mt-2 text-center text-[14px] leading-snug text-ink-soft">{TEXTO_ALGO_PASA.botonSosAyuda}</p>
          </div>
        ) : (
          <p className="rounded-2xl bg-sand p-3.5 text-[14px] font-semibold leading-snug text-ink-soft">{TEXTO_ALGO_PASA.sinPaseo}</p>
        )}

        {situaciones().map((s) => (
          <section key={s.id} aria-labelledby={`algo-${s.id}`}>
            <h3 id={`algo-${s.id}`} className="font-display text-[22px] font-bold leading-tight text-ink">
              {s.titulo}
            </h3>
            <ol className="mt-2 space-y-2">
              {s.pasos.map((p, i) => (
                <li key={p} className="flex items-start gap-3 rounded-2xl bg-sand p-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-[14px] font-extrabold text-white">{i + 1}</span>
                  <span className="text-[14.5px] font-semibold leading-snug text-ink">{p}</span>
                </li>
              ))}
            </ol>
          </section>
        ))}

        <section aria-labelledby="algo-llamar" className="space-y-4">
          <div>
            <h3 id="algo-llamar" className="font-display text-[22px] font-bold leading-tight text-ink">
              {TEXTO_ALGO_PASA.contactosTitulo}
            </h3>
            <p className="mt-1 text-[14px] leading-snug text-ink-soft">{TEXTO_ALGO_PASA.noLlamaSola}</p>
          </div>
          <ContactosSos distrito={distrito} mensaje={`Hola, necesito ayuda con ${NOMBRE_APP}.`} />
        </section>
      </div>
    </Sheet>
  )
}
