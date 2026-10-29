'use client'

import { useState } from 'react'
import { Clock, Users } from 'lucide-react'
import { useAhora } from '@/lib/datos'
import { ESTADOS_ACTIVOS, segundosQueFaltan, type OfertaPedido, type Pedido } from '@/lib/pedidos'
import { TEXTO_PEDIDO, textoContadores } from '@/lib/pedidosTextos'
import { TEXTO_ALERTAS } from '@/lib/avisosTextos'
import { btnPrimary, btnSoft } from '@/lib/ui'
import { AvisosCard } from './AvisosCard'
import { cn, solesShort } from '@/lib/utils'

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/** Tu pedido: cuenta atrás, cuántos lo vieron (solo cifras), las respuestas y cómo elegir. Un solo pedido activo a la vez. */
export function FichaPedido({
  pedido,
  onElegir,
  onCancelar,
  onCerrar,
}: {
  pedido: Pedido
  onElegir: (o: OfertaPedido) => Promise<{ ok: true } | { ok: false; mensaje: string }>
  onCancelar: () => void
  onCerrar: () => void
}) {
  const ahora = useAhora(1000)
  const [eligiendo, setEligiendo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const activo = ESTADOS_ACTIVOS.includes(pedido.estado)
  const enviadas = pedido.ofertas.filter((o) => o.estado === 'enviada')

  const elegir = async (o: OfertaPedido) => {
    if (eligiendo) return
    setEligiendo(o.id)
    setError(null)
    const r = await onElegir(o)
    setEligiendo(null)
    if (!r.ok) setError(r.mensaje)
  }

  return (
    <section aria-label={TEXTO_PEDIDO.activoTitulo} className="rounded-3xl border border-brand-600/30 bg-brand-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-extrabold text-ink">{TEXTO_PEDIDO.activoTitulo}</h2>
          <p className="text-[14px] text-ink-soft">
            {pedido.dog.name} · {pedido.slotLabel} · {pedido.durationMin} min · {solesShort(pedido.montoHora)} {TEXTO_PEDIDO.porHora}
          </p>
        </div>
        {activo && ahora > 0 && (
          <p className="flex items-center gap-1 text-[13px] font-extrabold text-ink" aria-label={`${TEXTO_PEDIDO.vence} ${mmss(segundosQueFaltan(pedido, ahora))}`}>
            <Clock className="size-4" aria-hidden /> {mmss(segundosQueFaltan(pedido, ahora))}
          </p>
        )}
      </div>

      {activo && (
        <p className="mt-2 flex items-center gap-1.5 text-[13px] font-bold text-ink">
          <Users className="size-4" aria-hidden /> {textoContadores(pedido.vistos, pedido.disponibles)}
        </p>
      )}

      {pedido.estado === 'vencido' && <p className="mt-3 text-[14px] font-bold text-ink">{TEXTO_PEDIDO.venció}</p>}
      {pedido.estado === 'cancelado' && <p className="mt-3 text-[14px] font-bold text-ink">{TEXTO_PEDIDO.cancelado}</p>}
      {pedido.estado === 'elegido' && <p className="mt-3 text-[14px] font-bold text-forest">{TEXTO_PEDIDO.elegido}</p>}

      {activo && (
        <div className="mt-3 space-y-2">
          <h3 className="flex items-center gap-2 text-[14px] font-extrabold text-ink">
            {TEXTO_PEDIDO.ofertasTitulo}
            {enviadas.length > 0 && <span className="rounded-full bg-brand-700 px-2 py-0.5 text-[12px] font-extrabold text-white">{TEXTO_ALERTAS.nuevos(enviadas.length)}</span>}
          </h3>
          {enviadas.length === 0 && <p className="text-[14px] text-ink-soft">{TEXTO_PEDIDO.esperando} {TEXTO_PEDIDO.sinOfertas}</p>}
          <ul className="space-y-2">
            {enviadas.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 rounded-2xl bg-paper p-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-extrabold text-ink">
                    {o.nombre || 'Paseador'} {o.demo && <span className="ml-1 rounded-full bg-sand px-2 py-0.5 text-[12px] font-bold text-ink-soft">{TEXTO_PEDIDO.demostracion}</span>}
                  </p>
                  <p className="text-[13px] text-ink-soft">
                    {solesShort(o.monto)} {TEXTO_PEDIDO.porHora} · {o.tipo === 'acepta' ? TEXTO_PEDIDO.acepta : TEXTO_PEDIDO.contraoferta}
                  </p>
                </div>
                <button type="button" onClick={() => void elegir(o)} disabled={eligiendo !== null} className={cn(btnPrimary, 'h-11 shrink-0 px-5 text-[14px] disabled:opacity-50')}>
                  {eligiendo === o.id ? TEXTO_PEDIDO.eligiendo : TEXTO_PEDIDO.elegir}
                </button>
              </li>
            ))}
          </ul>
          {error && (
            <p role="alert" className="text-[14px] font-bold text-red-700">
              {error}
            </p>
          )}
          <AvisosCard quien="familia" />
          <button type="button" onClick={onCancelar} className={cn(btnSoft, 'h-11 w-full text-[14px]')}>
            {TEXTO_PEDIDO.cancelar}
          </button>
        </div>
      )}

      {!activo && (
        <button type="button" onClick={onCerrar} className={cn(btnSoft, 'mt-3 h-11 w-full text-[14px]')}>
          Entendido
        </button>
      )}
    </section>
  )
}
