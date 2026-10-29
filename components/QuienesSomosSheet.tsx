'use client'

import { TriangleAlert, X } from 'lucide-react'
import { etiquetaAyuda, NOMBRE_APP } from '@/lib/config'
import { apoyoQuienesSomos, filasEquipo, FRASE_PAGO, TEXTO_QUIENES } from '@/lib/equipoTextos'
import { AyudaContactos } from './SosPanel'
import { Sheet } from './ui/Sheet'
import { VerMas } from './ui/VerMas'

/**
 * «Quiénes somos»: el equipo, en qué etapa estamos y cómo hablarnos. Todo sale de lib/config.ts y docs/CONTEXTO.md:
 * ningún nombre ni número está escrito aquí. Lo que falta dice «Falta configurar».
 */
export function QuienesSomosSheet({ onClose }: { onClose: () => void }) {
  const filas = filasEquipo()
  // Sin ningún nombre: una sola nota («Falta configurar los nombres.»), no una tarjeta amarilla por persona.
  const sinNingunNombre = filas.every((f) => f.nombre === null)

  return (
    <Sheet label={TEXTO_QUIENES.titulo} onClose={onClose} full>
      <div className="flex items-start justify-between gap-3 border-b border-ink/10 px-5 pb-3 pt-3">
        <div>
          <span className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-[12px] font-extrabold uppercase tracking-wide text-brand-800">{TEXTO_QUIENES.etiqueta}</span>
          <h2 className="mt-2 font-display text-[28px] font-bold leading-tight text-ink">{TEXTO_QUIENES.titulo}</h2>
          <p className="mt-1 text-[14px] leading-snug text-ink-soft">{apoyoQuienesSomos()}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sand text-ink active:scale-95">
          <X size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
        <section aria-labelledby="qs-equipo">
          <h3 id="qs-equipo" className="eyebrow text-ink-soft">
            {TEXTO_QUIENES.equipoTitulo}
          </h3>
          <ul className="mt-2 space-y-2.5">
            {filas.map((f) => (
              <li key={f.rol} className="rounded-2xl border border-ink/10 bg-paper p-3.5">
                <p className="text-[15px] font-extrabold text-ink">{f.rol}</p>
                {f.nombre ? (
                  <p className="mt-0.5 text-[14px] text-ink-soft">{f.nombre}</p>
                ) : sinNingunNombre ? null : (
                  <p className="mt-1.5 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[14px] font-semibold text-amber-900">
                    <TriangleAlert size={16} className="shrink-0" /> {TEXTO_QUIENES.faltaNombre}
                  </p>
                )}
              </li>
            ))}
          </ul>
          {sinNingunNombre && (
            <p className="mt-2.5 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[14px] font-semibold text-amber-900">
              <TriangleAlert size={16} className="shrink-0" /> {TEXTO_QUIENES.faltanNombres}
            </p>
          )}
        </section>

        <section aria-labelledby="qs-piloto">
          <h3 id="qs-piloto" className="eyebrow text-ink-soft">
            {TEXTO_QUIENES.pilotoTitulo}
          </h3>
          <div className="mt-2 space-y-1 text-[14.5px] leading-snug text-ink">
            <p>{TEXTO_QUIENES.piloto}</p>
            <p>{FRASE_PAGO}</p>
            <VerMas>{TEXTO_QUIENES.pilotoMas}</VerMas>
          </div>
        </section>

        <section aria-labelledby="qs-contacto">
          <h3 id="qs-contacto" className="eyebrow text-ink-soft">
            {etiquetaAyuda(TEXTO_QUIENES.contactoTitulo)}
          </h3>
          <div className="mt-2">
            <AyudaContactos mensaje={TEXTO_QUIENES.mensajeContacto(NOMBRE_APP)} />
          </div>
        </section>
      </div>
    </Sheet>
  )
}
