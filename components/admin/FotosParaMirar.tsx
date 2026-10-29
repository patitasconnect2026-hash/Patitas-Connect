'use client'

import { useServidor, useSospechasDelEquipo } from '@/lib/datos'
import { TEXTO_SOSPECHA, textoDeMotivoSospecha } from '@/lib/sospechas'

const hora = (iso: unknown) => (typeof iso === 'string' && Number.isFinite(Date.parse(iso)) ? new Date(iso).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }) : '')

/**
 * Las fotos que la base marcó «sospechosas» (lectura con mucho error, lejos de la casa del paseo o un salto imposible entre
 * fotos). Solo el equipo la ve, y solo con servidor. Son señales, no pruebas: las mira una persona.
 */
export function FotosParaMirar() {
  const servidor = useServidor()
  const aplica = servidor.activo && servidor.rol === 'equipo'
  const { sospechas, cargando } = useSospechasDelEquipo(aplica)
  if (!aplica) return null
  return (
    <section aria-label={TEXTO_SOSPECHA.titulo} className="rounded-3xl border border-ink/10 bg-paper p-5">
      <h3 className="font-display text-[24px] font-bold">{TEXTO_SOSPECHA.titulo}</h3>
      <p className="mt-1 text-[14px] leading-snug text-ink-soft">{TEXTO_SOSPECHA.apoyo}</p>
      {cargando ? null : sospechas.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-sand p-3 text-[14px] font-semibold text-ink-soft">{TEXTO_SOSPECHA.vacio}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {sospechas.map((f) => (
            <li key={String(f.foto_id)} className="rounded-2xl bg-sand p-3.5 text-[14px] leading-snug text-ink">
              <p className="font-extrabold">
                {TEXTO_SOSPECHA.paseo} {String(f.paseo_id ?? '').slice(0, 8)} · {hora(f.calculada_en)}
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {(Array.isArray(f.motivos) ? f.motivos : []).map((m) => (
                  <li key={String(m)}>{textoDeMotivoSospecha(String(m))}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
