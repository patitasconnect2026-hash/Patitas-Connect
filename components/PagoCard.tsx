'use client'

import { CircleCheck, TriangleAlert, Wallet } from 'lucide-react'
import { CONFIG, mediosDeCobro } from '@/lib/config'
import { masPagoDueno, TEXTO_PAGO, textoPagoDueno, textoSimularVisto } from '@/lib/pagosTextos'
import type { EstadoPago, Pago } from '@/lib/pagos'
import { btnInk } from '@/lib/ui'
import { cn, soles } from '@/lib/utils'
import { VerMas } from './ui/VerMas'

/**
 * A dónde se le paga a Patitas: el QR (si el equipo lo puso), los números o la cuenta que el equipo configuró en
 * lib/config.ts y el NOMBRE de la cuenta a la vista (para que el paseador lo compare). NADA se inventa: sin configurar
 * dice «Falta configurar» y no queda mudo.
 */
export function CobroDelEquipo({ className }: { className?: string }) {
  const medios = mediosDeCobro()
  const { titular, qr } = CONFIG.cobroEquipo
  if (medios.length === 0) {
    return (
      <div className={cn('rounded-2xl bg-amber-50 p-3.5 text-amber-900', className)}>
        <p className="flex items-center gap-2 text-[14px] font-extrabold">
          <TriangleAlert size={17} className="shrink-0" /> {TEXTO_PAGO.faltaCobro}
        </p>
        <p className="mt-0.5 text-[14px] leading-snug">{TEXTO_PAGO.faltaCobroApoyo}</p>
      </div>
    )
  }
  return (
    <div className={cn('rounded-2xl bg-sand p-3.5', className)}>
      {qr.trim() !== '' && (
        <div
          role="img"
          aria-label="QR para pagar"
          className="mx-auto mb-3 h-40 w-40 rounded-xl border border-ink/10 bg-paper bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${qr})` }}
        />
      )}
      <ul className="space-y-1.5">
        {medios.map((m) => (
          <li key={m.id} className="flex items-baseline justify-between gap-3 text-[14.5px]">
            <span className="font-extrabold text-ink">{m.nombre}</span>
            <span className="min-w-0 break-all text-right font-bold tabular-nums text-ink">{m.dato}</span>
          </li>
        ))}
      </ul>
      {titular.trim() !== '' ? (
        <div className="mt-2.5 rounded-xl border border-ink/10 bg-paper px-3 py-2">
          <p className="eyebrow text-ink-soft">{TEXTO_PAGO.titular}</p>
          <p className="font-display text-[20px] font-bold leading-tight text-ink">{titular.trim()}</p>
        </div>
      ) : (
        <p className="mt-2.5 rounded-xl bg-amber-50 px-3 py-2 text-[14px] font-extrabold text-amber-900">{TEXTO_PAGO.faltaTitular}</p>
      )}
    </div>
  )
}

const PASOS: ReadonlyArray<{ id: EstadoPago[]; etiqueta: string }> = [
  { id: ['sin_pagar', 'no_encontrado'], etiqueta: 'Tu pago' },
  { id: ['visto'], etiqueta: 'Visto' },
  { id: ['pagado_paseador'], etiqueta: 'Paseador pagado' },
]
const ORDEN: Record<EstadoPago, number> = { sin_pagar: 0, no_encontrado: 0, visto: 1, pagado_paseador: 2 }

/**
 * El pago de ESTE paseo para la familia, AL FINAL del paseo: cuánto, a dónde y a nombre de quién. La familia paga con
 * Yape, Plin o transferencia y le muestra el pago al paseador, que toca «Vi el pago». Patitas le paga al paseador
 * después de confirmarlo en su cuenta. En la demostración, sin paseador real, se puede simular que lo vio.
 */
export function PagoCard({
  pago,
  monto,
  paseador,
  demo,
  hecho,
  plazoVencido,
  onSimularVisto,
  onReportar,
  paseoNoOcurrio = false,
  className,
}: {
  /** El pago del libro de pagos. null = todavía no se registró (reserva vieja). */
  pago: Pago | null
  /** Lo que paga la familia (si no hay pago en el libro, el de la reserva). */
  monto: number
  paseador: string
  /** Demostración: el paseador es de ejemplo o la cuenta es de demostración. Se puede simular que el paseador vio el pago. */
  demo: boolean
  /** El paseo terminó y la familia confirmó que recibió a su perro: ahora toca pagar. */
  hecho: boolean
  /** Pasó el plazo de pago (`horasParaPagar`): recordatorio suave. */
  plazoVencido: boolean
  /** Solo en demostración: hace como si el paseador hubiera visto el pago. */
  onSimularVisto: () => void
  onReportar: () => void
  /** El paseo no se hizo (rechazado, vencido o cancelado): no hay nada que pagar. */
  paseoNoOcurrio?: boolean
  className?: string
}) {
  const estado: EstadoPago = pago?.estado ?? 'sin_pagar'
  const t = textoPagoDueno(pago?.estado ?? 'sin_registro', paseador, hecho, paseoNoOcurrio)
  const debe = !paseoNoOcurrio && hecho && (estado === 'sin_pagar' || estado === 'no_encontrado')
  const listo = estado === 'visto' || estado === 'pagado_paseador'
  const actual = ORDEN[estado]

  return (
    <section
      aria-label={TEXTO_PAGO.titulo}
      className={cn('relative overflow-hidden rounded-3xl border p-4 shadow-card', listo ? 'border-forest/25 bg-forest-50' : 'border-ink/10 bg-paper', className)}
    >
      <div className="flex items-center gap-3">
        <span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white', listo ? 'bg-forest' : 'bg-brand-700')}>
          <Wallet size={23} strokeWidth={2.4} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 eyebrow text-ink-soft">
            {TEXTO_PAGO.titulo}
            {(pago?.demo ?? demo) && <span className="rounded-full bg-sand px-2 py-0.5 text-[12px] font-extrabold normal-case tracking-normal text-ink">Demostración</span>}
          </p>
          <p className={cn('font-display text-[28px] font-bold leading-none tabular-nums', listo ? 'text-forest' : 'text-ink')}>{soles(pago?.monto ?? monto)}</p>
        </div>
      </div>

      <p className="mt-2.5 text-[14.5px] font-extrabold leading-snug text-ink">{t.titulo}</p>
      <p className="text-[14px] leading-snug text-ink-soft">{t.apoyo}</p>
      {estado === 'no_encontrado' && pago?.nota && (
        <p className="mt-2 rounded-2xl bg-amber-50 p-3 text-[14px] font-semibold leading-snug text-amber-900">Nota del equipo: {pago.nota}</p>
      )}

      {!paseoNoOcurrio && (
        <ol className="mt-3.5 grid grid-cols-3 gap-1.5" aria-label="Avance del pago">
          {PASOS.map((p, i) => (
            <li key={p.etiqueta} className="text-center">
              <span className={cn('mb-1 block h-1.5 rounded-full', i <= actual && hecho ? (actual >= 1 ? 'bg-forest' : 'bg-brand-700') : 'bg-ink/10')} />
              <span className={cn('block text-[12px] font-bold leading-tight', i <= actual && hecho ? 'text-ink' : 'text-ink-soft')}>{p.etiqueta}</span>
            </li>
          ))}
        </ol>
      )}

      {debe && (
        <div className="mt-4 space-y-3">
          <CobroDelEquipo />
          {plazoVencido && <p className="rounded-2xl bg-amber-50 p-3 text-[14px] font-semibold leading-snug text-amber-900">{TEXTO_PAGO.plazo}</p>}
          <p className="text-[14px] font-semibold leading-snug text-ink">{TEXTO_PAGO.sinReservar}</p>
          {demo && (
            <button type="button" onClick={onSimularVisto} className={cn(btnInk, 'h-12 w-full text-[14px]')}>
              <CircleCheck size={16} /> {textoSimularVisto(paseador)}
            </button>
          )}
        </div>
      )}

      {!paseoNoOcurrio && estado === 'no_encontrado' && (
        <div className="mt-3.5 rounded-2xl bg-amber-50 p-3">
          <p className="text-[14px] font-semibold leading-snug text-amber-900">Si ya pagaste, cuéntaselo al equipo.</p>
          <button type="button" onClick={onReportar} className="mt-2 min-h-11 w-full rounded-full bg-amber-600 px-4 text-[14.5px] font-extrabold text-white active:scale-[0.98]">
            {TEXTO_PAGO.reportar}
          </button>
        </div>
      )}

      <VerMas abrir={TEXTO_PAGO.masAbrir}>{masPagoDueno()}</VerMas>
    </section>
  )
}
