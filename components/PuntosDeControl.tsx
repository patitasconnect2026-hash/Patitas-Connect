'use client'

import { Camera, Flag, Footprints } from 'lucide-react'
import { clockLabel } from '@/lib/bus'
import { useServidor } from '@/lib/datos'
import { CONFIG } from '@/lib/config'
import { minutosDesde, type PuntoLista } from '@/lib/puntosControl'
import { masDueno, TEXTO_PUNTOS, textoSinFoto, textoUltimoControl } from '@/lib/puntosControlTextos'
import { cn } from '@/lib/utils'
import { VerMas } from './ui/VerMas'

const ICONO = { inicio: Footprints, foto: Camera, fin: Flag } as const

/**
 * «Puntos de control» (dueño): el inicio, cada foto y el fin del paseo, con su hora y su lugar (nunca coordenadas).
 * El seguimiento NO es continuo: la ubicación se registra solo en esos momentos. En la demostración los puntos son
 * inventados y la sección lo dice. Entre dos celulares hace falta servidor (con servidor llegan por internet).
 */
export function PuntosDeControl({
  puntos,
  demo,
  enCurso,
  ahora,
  ultimoT,
  className,
}: {
  puntos: PuntoLista[]
  demo: boolean
  /** El paseo está en curso: se dice hace cuánto fue el último control. */
  enCurso: boolean
  ahora: number
  /** Hora (ms) del último inicio o foto. null si no hay. */
  ultimoT: number | null
  className?: string
}) {
  const min = enCurso && ultimoT !== null && ahora > 0 ? minutosDesde(ahora, ultimoT) : null
  // Con servidor los puntos llegan de verdad por internet (solo el inicio, el fin y cada foto: nunca un recorrido).
  const conServidor = useServidor().activo
  return (
    <section aria-label={TEXTO_PUNTOS.titulo} className={className}>
      <div className="px-1">
        <h2 className="flex flex-wrap items-center gap-2 font-display text-[26px] font-bold leading-tight text-ink">
          {TEXTO_PUNTOS.titulo}
          {demo && <span className="rounded-full bg-sand px-2 py-0.5 text-[12px] font-extrabold text-ink">Demostración</span>}
        </h2>
        <p className="mt-0.5 text-[14px] leading-snug text-ink-soft">{TEXTO_PUNTOS.dueno.apoyo}</p>
      </div>

      {puntos.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-sand p-3.5 text-[14px] font-semibold text-ink-soft">{TEXTO_PUNTOS.dueno.vacio}</p>
      ) : (
        <ol className="mt-3 space-y-2" aria-live="polite">
          {puntos.map((p) => {
            const Icono = ICONO[p.tipo]
            return (
              <li key={p.id} className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-paper p-3 shadow-card">
                <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full text-white', p.tipo === 'inicio' ? 'bg-forest' : p.tipo === 'fin' ? 'bg-ink' : 'bg-brand-700')}>
                  <Icono size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 text-[14px] font-extrabold leading-snug text-ink">
                    {p.etiqueta}
                    <span className="tabular-nums text-ink-soft">{p.hora ?? clockLabel(p.t)}</span>
                  </p>
                  <p className={cn('text-[14px] leading-snug', p.lugar.conLugar ? 'font-semibold text-ink' : 'text-ink-soft')}>{p.lugar.texto}</p>
                  {p.lugar.nota && <p className="text-[12px] font-semibold leading-snug text-ink-soft">{p.lugar.nota}</p>}
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {min !== null && (
        <p className={cn('mt-3 rounded-2xl p-3 text-[14px] font-semibold leading-snug', min >= CONFIG.minutosPuntoControl ? 'bg-amber-50 text-amber-900' : 'bg-sand text-ink-soft')}>
          {textoUltimoControl(min)}
          {min >= CONFIG.minutosPuntoControl && <span className="block font-medium">{textoSinFoto(min)}</span>}
        </p>
      )}

      <VerMas abrir={TEXTO_PUNTOS.dueno.masAbrir}>{masDueno(undefined, conServidor)}</VerMas>
    </section>
  )
}
