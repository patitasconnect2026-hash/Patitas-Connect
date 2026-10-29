'use client'

import { useRef, useState } from 'react'
import { CircleCheck, TriangleAlert, Wallet } from 'lucide-react'
import { CONFIG, NOMBRE_CORTO } from '@/lib/config'
import type { Pago } from '@/lib/pagos'
import { TEXTO_COBRO } from '@/lib/pagosTextos'
import { TEXTO_PAGO_SERVIDOR } from '@/lib/servidor/paseosTextos'
import { btnPrimary, inputBase } from '@/lib/ui'
import { cn, soles } from '@/lib/utils'

/**
 * «Cobro del paseo», para el PASEADOR. El pago es al terminar el paseo: la familia paga a Patitas y le muestra el pago.
 * El paseador compara el monto y el nombre de la cuenta de Patitas (sale de lib/config.ts), toca «Vi el pago» (puede
 * anotar la hora) y con eso termina su trabajo. Patitas le paga después de confirmar el pago en su cuenta.
 */
export function CobroDelPaseo({
  pago,
  dueno,
  onVi,
  onReportar,
  enviando = false,
  sinConexion = false,
  error = null,
  className,
}: {
  pago: Pago
  /** Nombre de pila del dueño: «Pídele a Valeria que te muestre el pago». */
  dueno: string
  /** Con servidor espera a la base y devuelve `false` si ella dijo que no (entonces se puede volver a intentar). */
  onVi: (hora?: string) => void | boolean | Promise<void | boolean>
  onReportar: () => void
  /** Con servidor: «Vi el pago» ya salió y la base todavía no contesta (o no hay internet). Nada está marcado aún. */
  enviando?: boolean
  sinConexion?: boolean
  /** Por qué la base dijo que no, en lenguaje simple. */
  error?: string | null
  className?: string
}) {
  const [hora, setHora] = useState('')
  // Un doble toque no manda dos avisos (si el equipo no lo encuentra, se puede volver a avisar).
  const enviadoEn = useRef<Pago['estado'] | null>(null)
  const titular = CONFIG.cobroEquipo.titular.trim()
  const visto = pago.estado === 'visto' || pago.estado === 'pagado_paseador'

  if (visto) {
    const texto =
      (pago.estado === 'pagado_paseador'
        ? `${NOMBRE_CORTO} te pagó ${soles(pago.neto)}.`
        : `${NOMBRE_CORTO} te paga ${soles(pago.neto)} después de confirmar el pago en su cuenta.`) + (pago.horaPago ? ` Anotaste: ${pago.horaPago}.` : '')
    return (
      <section aria-label={TEXTO_COBRO.titulo} className={cn('rounded-3xl border border-forest/25 bg-forest-50 p-4', className)}>
        <p className="flex items-center gap-2 font-display text-[22px] font-bold leading-tight text-forest">
          <CircleCheck size={22} className="shrink-0" /> {TEXTO_COBRO.listo}
        </p>
        <p className="mt-1.5 text-[14px] leading-snug text-ink">{texto}</p>
      </section>
    )
  }

  return (
    <section aria-label={TEXTO_COBRO.titulo} className={cn('rounded-3xl border border-ink/10 bg-paper p-4 shadow-card', className)}>
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-700 text-white">
          <Wallet size={23} strokeWidth={2.4} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 eyebrow text-ink-soft">
            {TEXTO_COBRO.titulo}
            {pago.demo && <span className="rounded-full bg-sand px-2 py-0.5 text-[12px] font-extrabold normal-case tracking-normal text-ink">Demostración</span>}
          </p>
          <p className="font-display text-[28px] font-bold leading-none tabular-nums text-ink">{soles(pago.monto)}</p>
        </div>
      </div>

      <p className="mt-3 text-[14px] leading-snug text-ink-soft">Pídele a {dueno} que te muestre el pago.</p>
      {titular !== '' ? (
        <div className="mt-2.5 rounded-2xl bg-sand px-3.5 py-2.5">
          <p className="eyebrow text-ink-soft">{TEXTO_COBRO.debeAparecer}</p>
          <p className="font-display text-[22px] font-bold leading-tight text-ink">{titular}</p>
        </div>
      ) : (
        <p className="mt-2.5 flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-[14px] font-extrabold leading-snug text-amber-900">
          <TriangleAlert size={17} className="mt-0.5 shrink-0" /> {TEXTO_COBRO.faltaTitular}
        </p>
      )}
      <p className="mt-2 text-[14px] leading-snug text-ink-soft">{TEXTO_COBRO.comparar}</p>

      <label className="mt-3 block">
        <span className="eyebrow mb-1 block text-ink-soft">{TEXTO_COBRO.hora}</span>
        <input
          type="time"
          value={hora}
          onChange={(e) => setHora(e.target.value)}
          className={cn(inputBase, 'tabular-nums')}
        />
      </label>

      <button
        type="button"
        disabled={enviando}
        onClick={async () => {
          if (enviando || enviadoEn.current === pago.estado) return
          enviadoEn.current = pago.estado
          // Si la base dice que no, se puede volver a intentar.
          if ((await onVi(hora || undefined)) === false) enviadoEn.current = null
        }}
        className={cn(btnPrimary, 'mt-3.5 h-14 w-full text-[16px] disabled:opacity-60')}
      >
        <CircleCheck size={19} /> {enviando ? TEXTO_PAGO_SERVIDOR.enviando : TEXTO_COBRO.viElPago}
      </button>
      {enviando && (
        <p role="status" className="mt-2 text-[14px] font-semibold leading-snug text-ink">
          {sinConexion ? TEXTO_PAGO_SERVIDOR.sinConexionVi : TEXTO_COBRO.comparar}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-[14px] font-bold leading-snug text-red-700">
          {error}
        </p>
      )}
      <button type="button" onClick={onReportar} className="mt-2 min-h-11 w-full rounded-2xl border border-ink/15 px-3 py-2 text-[14px] font-extrabold text-ink active:scale-[0.98]">
        {TEXTO_COBRO.noMuestran}
      </button>
    </section>
  )
}
