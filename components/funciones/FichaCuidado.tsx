'use client'

import { HeartPulse } from 'lucide-react'
import { ATRIBUTOS_PERRO, valoresIniciales } from '@/lib/calificacionDetallada'
import { CONDICIONES, condicionesDeducidas, reglasCuidado, textoAutorizacion, type Condicion } from '@/lib/cuidadoEspecial'
import type { Dog } from '@/lib/types'
import { inputBase } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { DeslizadorAtributo } from './Barras'

/**
 * Dentro de la ficha del perro: cómo es (barras que después compara el paseador), si necesita cuidado especial y hasta
 * cuánto autoriza la familia en una emergencia veterinaria si no contesta.
 */
export function FichaCuidado({ dog, onChange }: { dog: Dog; onChange: (patch: Partial<Dog>) => void }) {
  const deducidas = condicionesDeducidas(dog)
  const marcadas = new Set<string>([...deducidas, ...(dog.condiciones ?? [])])
  const reglas = reglasCuidado([...marcadas] as Condicion[])
  const atributos = { ...valoresIniciales(ATRIBUTOS_PERRO), ...(dog.atributos ?? {}) }

  const alternar = (id: Condicion) => {
    const actual = new Set(dog.condiciones ?? [])
    if (actual.has(id)) actual.delete(id)
    else actual.add(id)
    onChange({ condiciones: [...actual] })
  }

  return (
    <div className="space-y-5">
      <section aria-labelledby="ficha-barras" className="space-y-4">
        <div>
          <h3 id="ficha-barras" className="text-[15px] font-extrabold text-ink">
            Cómo es {dog.name || 'tu perro'}
          </h3>
          <p className="text-[14px] text-ink-soft">El paseador lo compara con lo que ve. Sé honesto.</p>
        </div>
        {ATRIBUTOS_PERRO.map((a) => (
          <DeslizadorAtributo key={a.id} atributo={a} valor={atributos[a.id]} onChange={(n) => onChange({ atributos: { ...atributos, [a.id]: n } })} />
        ))}
      </section>

      <fieldset>
        <legend className="text-[15px] font-extrabold text-ink">¿Necesita cuidado especial?</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {CONDICIONES.map((c) => {
            const auto = deducidas.includes(c.id)
            const on = marcadas.has(c.id)
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                disabled={auto}
                onClick={() => alternar(c.id)}
                className={cn('min-h-11 rounded-2xl border-2 px-3 py-2 text-left transition active:scale-[0.98]', on ? 'border-brand-600 bg-brand-50' : 'border-ink/10 bg-paper')}
              >
                <span className="block text-[14px] font-extrabold text-ink">{c.nombre}</span>
                <span className="block text-[12px] leading-snug text-ink-soft">{auto ? 'Por su raza o edad' : c.ayuda}</span>
              </button>
            )
          })}
        </div>
        {reglas.especial && (
          <div className="mt-3 rounded-2xl bg-sand p-3.5">
            <p className="flex items-center gap-2 text-[14px] font-extrabold text-ink">
              <HeartPulse size={16} className="text-brand-700" aria-hidden /> Paseo de cuidado especial
            </p>
            <ul className="mt-1.5 space-y-1 text-[14px] leading-snug text-ink">
              <li>Hasta {reglas.maxMinutos} minutos{reglas.soloIndividual ? ', solo él' : ''}.</li>
              {reglas.evitarMediodia && <li>Sin paseos de 11:00 a 16:00 cuando hace calor.</li>}
              <li>{reglas.nivelMinimo === 'nuevo' ? 'Cualquier paseador.' : 'Solo paseadores Pro o Élite.'}</li>
              {reglas.notas.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        )}
      </fieldset>

      <label className="block">
        <span className="eyebrow mb-1.5 block text-ink-soft">Emergencia: autorizo gastar hasta (soles)</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={2000}
          step={50}
          value={dog.topeVet ?? 0}
          onChange={(e) => onChange({ topeVet: Math.max(0, Math.min(2000, Number(e.target.value) || 0)) })}
          className={inputBase}
        />
        <span className="mt-1.5 block text-[14px] leading-snug text-ink-soft">{textoAutorizacion(dog.topeVet ?? 0, dog.vet)}</span>
      </label>
    </div>
  )
}
