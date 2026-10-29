'use client'

import { useState } from 'react'
import { Info, TriangleAlert } from 'lucide-react'
import { clockLabel } from '@/lib/bus'
import type { EventoPaseo, Paseo } from '@/lib/paseo'
import { NIVEL_AVISO, type NivelAviso } from '@/lib/zona'
import { ESCENARIOS, resumirEscenario, TEXTO_ESCENARIO, type EscenarioAviso, type ResumenEscenario } from '@/lib/zonaDemo'
import { TEXTO_AVISOS, textoAviso } from '@/lib/zonaTextos'
import { cn } from '@/lib/utils'
import { VerMas } from './ui/VerMas'

const ESTILO: Record<NivelAviso, string> = {
  alerta: 'bg-red-50 text-red-800 ring-1 ring-red-200',
  suave: 'bg-amber-50 text-amber-900 ring-1 ring-amber-300/60',
  info: 'bg-forest-50 text-forest ring-1 ring-forest/20',
}

/** Los avisos de ubicación que quedaron en el registro del paseo, del más nuevo al más viejo. */
export function avisosDelRegistro(paseo: Paseo): EventoPaseo[] {
  return paseo.eventos.filter((e) => e.accion === 'avisar' && e.aviso).reverse()
}

function Aviso({ ev }: { ev: EventoPaseo }) {
  const t = textoAviso(ev.aviso!)
  const nivel = NIVEL_AVISO[ev.aviso!]
  const Icono = nivel === 'info' ? Info : TriangleAlert
  return (
    <li className={cn('rounded-2xl p-3', ESTILO[nivel])}>
      {ev.demo && (
        <span className="mb-1.5 inline-block rounded-full bg-paper px-2 py-0.5 text-[12px] font-extrabold uppercase tracking-wide text-ink ring-1 ring-ink/15">
          {TEXTO_AVISOS.demostracion}
        </span>
      )}
      <p className="flex items-center gap-2 text-[14.5px] font-extrabold">
        <Icono size={16} className="shrink-0" />
        {t.titulo}
      </p>
      <p className="mt-0.5 text-[14px] leading-snug text-ink-soft">{t.apoyo}</p>
      <p className="mt-1 text-[12px] font-bold text-ink-soft">
        {clockLabel(ev.at)} · {TEXTO_AVISOS.quien}
      </p>
    </li>
  )
}

/**
 * Avisos de ubicación del paseo, para el dueño y para el paseador: los dos leen el MISMO registro (`paseo.eventos`).
 * Solo avisan, no bloquean a nadie. En la demostración se pueden probar con señales inventadas.
 * Con servidor (`conServidor`) el aviso del teléfono del paseador le llega al dueño por la base (solo el aviso, sin
 * ubicación). Sin servidor, solo llega si los dos usan el mismo navegador.
 */
export function AvisosPaseo({
  paseo,
  vista,
  onProbar,
  conServidor = false,
  className,
}: {
  paseo: Paseo
  vista: 'dueno' | 'paseador'
  /** Los avisos viajan entre teléfonos por el servidor (no hay que decir «mismo navegador»). */
  conServidor?: boolean
  /** Solo en demostración y durante el paseo: corre una prueba y la deja en el registro. */
  onProbar?: (escenario: EscenarioAviso) => void
  className?: string
}) {
  const avisos = avisosDelRegistro(paseo)
  const [resumen, setResumen] = useState<{ escenario: EscenarioAviso; r: ResumenEscenario } | null>(null)
  if (avisos.length === 0 && !onProbar) return null
  const recientes = avisos.slice(0, 3)
  const resto = avisos.slice(3)

  const probar = (e: EscenarioAviso) => {
    setResumen({ escenario: e, r: resumirEscenario(e) })
    onProbar?.(e)
  }

  return (
    <section aria-label={TEXTO_AVISOS.titulo} className={cn('space-y-2.5', className)}>
      {avisos.length > 0 && (
        <div>
          <p className="eyebrow mb-1.5 px-1 text-ink-soft">{TEXTO_AVISOS.titulo}</p>
          <ul className="space-y-2" aria-live="polite">
            {recientes.map((ev, i) => (
              <Aviso key={`${ev.at}-${i}`} ev={ev} />
            ))}
          </ul>
          {resto.length > 0 && (
            <VerMas abrir={`Ver ${resto.length} más`} cerrar="Ver menos">
              <ul className="mt-1 space-y-2">
                {resto.map((ev, i) => (
                  <Aviso key={`${ev.at}-r${i}`} ev={ev} />
                ))}
              </ul>
            </VerMas>
          )}
          <VerMas abrir="Cómo funciona" cerrar="Ocultar">
            <p>{TEXTO_AVISOS.alcance}</p>
            <p className="mt-2">
              {vista === 'dueno'
                ? conServidor
                  ? TEXTO_AVISOS.conServidorDueno
                  : TEXTO_AVISOS.servidorDueno
                : conServidor
                  ? TEXTO_AVISOS.conServidorPaseador
                  : TEXTO_AVISOS.servidorPaseador}
            </p>
          </VerMas>
        </div>
      )}

      {onProbar && (
        <details className="rounded-2xl border border-dashed border-ink/25 bg-paper px-3.5">
          <summary className="min-h-11 cursor-pointer list-none py-2.5 text-[14px] font-extrabold text-ink [&::-webkit-details-marker]:hidden">
            {TEXTO_AVISOS.probar} · {TEXTO_AVISOS.demostracion}
          </summary>
          <div className="pb-3">
            <p className="text-[14px] leading-snug text-ink-soft">{TEXTO_AVISOS.probarApoyo}</p>
            <p className="mt-1 text-[14px] leading-snug text-ink-soft">{TEXTO_AVISOS.servidorPanel}</p>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {ESCENARIOS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => probar(e)}
                  className="min-h-11 rounded-2xl border border-ink/15 bg-sand px-3 py-2 text-left text-[14px] font-extrabold text-ink active:scale-[0.98]"
                >
                  {TEXTO_ESCENARIO[e].boton}
                </button>
              ))}
            </div>
            {resumen && (
              <p role="status" className="mt-2.5 rounded-xl bg-sand p-3 text-[14px] leading-snug text-ink">
                <b>{TEXTO_ESCENARIO[resumen.escenario].boton}:</b> {resumen.r.lecturas} señales.
                {resumen.r.ignoradasPorPrecision > 0 && ` ${resumen.r.ignoradasPorPrecision} ignoradas por poca precisión.`}
                {resumen.r.saltosDescartados > 0 && ` ${resumen.r.saltosDescartados} descartada por velocidad imposible.`}
                {resumen.r.avisos.length > 0 ? ` Avisó: ${resumen.r.avisos.map((a) => textoAviso(a).titulo).join(' · ')}.` : ' No avisó nada.'}
              </p>
            )}
          </div>
        </details>
      )}
    </section>
  )
}
