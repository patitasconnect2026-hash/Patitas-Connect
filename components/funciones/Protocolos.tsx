'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BatteryLow, Car, HeartPulse, RefreshCcw, Scale, Signal } from 'lucide-react'
import { CONFIG, NOMBRE_CORTO } from '@/lib/config'
import { REGLAS_ALTO_VALOR, RECOMENDACIONES_SENAL } from '@/lib/protocoloSenal'
import { planDeRescate } from '@/lib/penalizaciones'
import { cn, solesShort } from '@/lib/utils'

const TEXTOS = {
  robo: `Si el paseo se mueve a más de ${CONFIG.senal.velocidadVehiculoKmh} km/h dos veces seguidas, no es una caminata: saltamos directo a la alerta.`,
  bateria: `Antes de salir, la app revisa que la batería tenga ${CONFIG.senal.bateriaMinimaPct} % o más.`,
  rescate: `Quien rescata gana un bono de hasta ${solesShort(CONFIG.bonoRescatePlan)} que pone ${NOMBRE_CORTO}. El paseador que cancela tarde suma faltas; una emergencia con constancia no cuenta.`,
  vete: `Se reporta dentro de ${CONFIG.fondoCuidado.horasParaReportar} horas, con la boleta. En la ficha, la familia deja hasta cuánto autoriza gastar si no contesta.`,
}

type Id = 'senal' | 'robo' | 'bateria' | 'cancela' | 'veterinaria' | 'evidencia'

function escalones() {
  const s = CONFIG.senal
  return [
    { min: s.minutosDebil, t: 'Se demora la ubicación', d: 'Le pedimos al paseador que abra la app.' },
    { min: s.minutosPerdida, t: 'Sin ubicación', d: 'Te avisamos y pedimos una foto de control.' },
    { min: s.minutosLlamada, t: 'Llamamos', d: `${NOMBRE_CORTO} llama al paseador y a su contacto de emergencia.` },
    { min: s.minutosAlerta, t: 'Alerta', d: 'Botones a serenazgo y Policía, con la última ubicación lista.' },
  ]
}

const PESTANAS: Array<{ id: Id; titulo: string; icono: typeof Signal }> = [
  { id: 'senal', titulo: 'Se pierde el GPS', icono: Signal },
  { id: 'robo', titulo: 'Robo o taxi', icono: Car },
  { id: 'bateria', titulo: 'Se apaga el celular', icono: BatteryLow },
  { id: 'cancela', titulo: 'Te cancelan', icono: RefreshCcw },
  { id: 'veterinaria', titulo: 'Quién paga la vete', icono: HeartPulse },
  { id: 'evidencia', titulo: 'Nadie acusa sin evidencia', icono: Scale },
]

function Contenido({ id }: { id: Id }) {
  if (id === 'senal')
    return (
      <ol className="space-y-3">
        {escalones().map((e, i) => (
          <li key={e.t} className="flex gap-3">
            <span className={cn('grid h-10 w-14 shrink-0 place-items-center rounded-xl text-[14px] font-extrabold', i === 3 ? 'bg-red-600 text-white' : 'bg-sand text-ink')}>{e.min} min</span>
            <div>
              <p className="text-[15px] font-extrabold text-ink">{e.t}</p>
              <p className="text-[14px] leading-snug text-ink-soft">{e.d}</p>
            </div>
          </li>
        ))}
      </ol>
    )
  if (id === 'robo')
    return (
      <div className="space-y-3">
        <p className="text-[14px] leading-snug text-ink">
          {TEXTOS.robo}
        </p>
        <ul className="space-y-1.5 text-[14px] text-ink">
          {REGLAS_ALTO_VALOR.map((r) => (
            <li key={r} className="flex gap-2">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-700" /> {r}
            </li>
          ))}
        </ul>
      </div>
    )
  if (id === 'bateria')
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {(['paseador', 'familia'] as const).map((q) => (
          <div key={q}>
            <p className="eyebrow text-ink-soft">{q === 'paseador' ? 'El paseador' : 'La familia'}</p>
            <ul className="mt-1.5 space-y-1.5 text-[14px] text-ink">
              {RECOMENDACIONES_SENAL[q].map((r) => (
                <li key={r} className="flex gap-2">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-700" /> {r}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="text-[14px] text-ink-soft md:col-span-2">{TEXTOS.bateria}</p>
      </div>
    )
  if (id === 'cancela') {
    const r = planDeRescate({ precio: 25, comisionPct: CONFIG.comision, plan: 'gratis', minutosParaPaseo: 120 })
    return (
      <div className="space-y-3">
        <ol className="list-decimal space-y-1.5 pl-5 text-[14px] text-ink">
          {r.pasos.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
        <p className="text-[14px] text-ink-soft">
          {TEXTOS.rescate}
        </p>
      </div>
    )
  }
  if (id === 'veterinaria')
    return (
      <div className="space-y-3">
        <ul className="grid gap-2 sm:grid-cols-2">
          {[
            { q: 'Enfermedad que ya tenía', p: 'La familia' },
            { q: 'Algo que la ficha no dijo', p: 'La familia' },
            { q: 'El paseador rompió una regla', p: 'El paseador' },
            { q: 'Accidente sin culpa', p: `Fondo de cuidado hasta ${solesShort(CONFIG.fondoCuidado.topePorCaso)} y el resto la familia` },
          ].map((f) => (
            <li key={f.q} className="rounded-2xl bg-sand p-3">
              <p className="text-[14px] font-extrabold text-ink">{f.q}</p>
              <p className="text-[14px] text-ink-soft">Paga: {f.p}</p>
            </li>
          ))}
        </ul>
        <p className="text-[14px] text-ink-soft">
          {TEXTOS.vete}
        </p>
      </div>
    )
  return (
    <ul className="space-y-1.5 text-[14px] text-ink">
      {[
        'Foto al recoger y al entregar, con hora y lugar.',
        'Puntos de control con foto durante el paseo.',
        'La familia confirma cómo llegó su perro al recibirlo.',
        'El chat del paseo queda guardado.',
        'Un reporte sin fotos ni señales no gana contra un paseo bien documentado.',
        'Dos reportes sin sustento pausan la cuenta.',
      ].map((r) => (
        <li key={r} className="flex gap-2">
          <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-700" /> {r}
        </li>
      ))}
    </ul>
  )
}

/** Qué pasa si algo sale mal: seis casos en pestañas. Lo usan la portada y «Seguridad». */
export function Protocolos({ className }: { className?: string }) {
  const [id, setId] = useState<Id>('senal')
  return (
    <div className={className}>
      <div role="tablist" aria-label="Qué pasa si…" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            role="tab"
            type="button"
            id={`proto-tab-${p.id}`}
            aria-selected={id === p.id}
            aria-controls="proto-panel"
            onClick={() => setId(p.id)}
            className={cn(
              'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-[14px] font-extrabold transition active:scale-95',
              id === p.id ? 'bg-vino text-white' : 'bg-paper text-ink ring-1 ring-ink/15',
            )}
          >
            <p.icono size={16} aria-hidden /> {p.titulo}
          </button>
        ))}
      </div>
      <div id="proto-panel" role="tabpanel" aria-labelledby={`proto-tab-${id}`} className="mt-4 rounded-3xl border border-ink/10 bg-paper p-5 shadow-card">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <Contenido id={id} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
