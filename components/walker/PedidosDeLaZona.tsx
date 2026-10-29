'use client'

import { useState } from 'react'
import { Clock, MapPin } from 'lucide-react'
import { CONFIG } from '@/lib/config'
import { useAhora, useAvisoDeNuevos, usePedidosDelPaseador } from '@/lib/datos'
import { TEXTO_ALERTAS } from '@/lib/avisosTextos'
import { ofertaValida } from '@/lib/pedidos'
import { TEXTO_PEDIDO } from '@/lib/pedidosTextos'
import type { PedidoParaPaseador } from '@/lib/servidor/pedidosMapeo'
import { btnPrimary, btnSoft } from '@/lib/ui'
import { cn, solesShort } from '@/lib/utils'
import { AvisosCard } from '../AvisosCard'
import { MapaZona } from '../map/MapaZona'
import { TEXTO_MAPA } from '@/lib/mapaTextos'

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

function Fila({ p, ahora, ofertar }: { p: PedidoParaPaseador; ahora: number; ofertar: (id: string, monto: number) => Promise<{ ok: true } | { ok: false; mensaje: string }> }) {
  const [masOpen, setMasOpen] = useState(false)
  const [zonaOpen, setZonaOpen] = useState(false)
  const [monto, setMonto] = useState(Math.min(CONFIG.tarifaMaxima, p.montoHora + 1))
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const quedan = Math.max(0, Math.ceil((p.expiraAt - ahora) / 1000))

  const enviar = async (m: number) => {
    if (enviando) return
    setEnviando(true)
    setAviso(null)
    const r = await ofertar(p.id, m)
    setEnviando(false)
    setAviso(r.ok ? TEXTO_PEDIDO.ofertaEnviada : r.mensaje)
  }
  const puedeMas = p.montoHora < CONFIG.tarifaMaxima

  return (
    <li className="rounded-2xl bg-paper p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-extrabold text-ink">
            {p.dueno || 'Una familia'} · {p.perro}
          </p>
          <p className="text-[13px] text-ink-soft">
            {p.slotLabel} · {p.durationMin} min
          </p>
          <p className="flex items-center gap-1 text-[13px] text-ink-soft">
            <MapPin className="size-3.5" aria-hidden /> {p.distrito} · {TEXTO_PEDIDO.zonaAprox}
          </p>
          <button type="button" aria-expanded={zonaOpen} onClick={() => setZonaOpen((v) => !v)} className="min-h-11 text-[13px] font-extrabold text-brand-700 underline underline-offset-4">
            {zonaOpen ? TEXTO_MAPA.ocultarZona : TEXTO_MAPA.verZona}
          </button>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-xl font-extrabold text-ink">{solesShort(p.montoHora)}</p>
          <p className="text-[12px] text-ink-soft">{TEXTO_PEDIDO.porHora}</p>
          {ahora > 0 && (
            <p className="mt-1 flex items-center justify-end gap-1 text-[12px] font-bold text-ink-soft">
              <Clock className="size-3.5" aria-hidden /> {mmss(quedan)}
            </p>
          )}
        </div>
      </div>

      {zonaOpen && (
        <div className="mt-2">
          <MapaZona centro={p.zona} modo="aproximada" />
        </div>
      )}

      {p.miOferta ? (
        <p className="mt-2 text-[14px] font-bold text-forest">
          {TEXTO_PEDIDO.yaOfertaste} ({solesShort(p.miOferta.monto)})
        </p>
      ) : p.ocupado ? (
        <p className="mt-2 text-[14px] font-bold text-ink-soft">{TEXTO_PEDIDO.ocupado}</p>
      ) : (
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            <button type="button" disabled={enviando} onClick={() => void enviar(p.montoHora)} className={cn(btnPrimary, 'h-11 flex-1 text-[14px] disabled:opacity-50')}>
              {TEXTO_PEDIDO.aceptarMonto} {solesShort(p.montoHora)}
            </button>
            {puedeMas && (
              <button type="button" aria-expanded={masOpen} onClick={() => setMasOpen((v) => !v)} className={cn(btnSoft, 'h-11 flex-1 text-[14px]')}>
                {TEXTO_PEDIDO.ofrecerMas}
              </button>
            )}
          </div>
          {masOpen && puedeMas && (
            <div className="flex items-center gap-2">
              <label className="flex-1 text-[13px] font-bold text-ink-soft">
                Monto por hora
                <input type="number" inputMode="numeric" min={p.montoHora} max={CONFIG.tarifaMaxima} step={1} value={monto} onChange={(e) => setMonto(Number(e.target.value))} className="mt-1 h-11 w-full rounded-2xl border border-ink/15 bg-paper px-3 text-[16px] font-semibold text-ink" />
              </label>
              <button type="button" disabled={enviando || !ofertaValida(p.montoHora, monto)} onClick={() => void enviar(monto)} className={cn(btnPrimary, 'mt-5 h-11 px-4 text-[14px] disabled:opacity-50')}>
                {TEXTO_PEDIDO.enviarOferta}
              </button>
            </div>
          )}
        </div>
      )}
      {aviso && (
        <p role="status" className="mt-2 text-[13px] font-bold text-ink">
          {aviso}
        </p>
      )}
    </li>
  )
}

/** «Pedidos en tu zona»: los pedidos abiertos de tu distrito. Aceptas el monto o pides un poco más (una sola vez). Solo con servidor. */
export function PedidosDeLaZona({ sesionId, activo }: { sesionId: string | null; activo: boolean }) {
  const { aplica, pedidos, cerradas, ofertar } = usePedidosDelPaseador(sesionId, activo)
  const ahora = useAhora(1000)
  const sinResponder = pedidos.filter((p) => !p.miOferta && !p.ocupado)
  useAvisoDeNuevos(sinResponder.map((p) => p.id))
  if (!aplica) return null
  return (
    <section aria-label={TEXTO_PEDIDO.cercaTitulo} className="mx-4 mt-4 space-y-2 rounded-3xl border border-ink/10 bg-sand p-4">
      <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
        {TEXTO_PEDIDO.cercaTitulo}
        {sinResponder.length > 0 && <span className="rounded-full bg-brand-700 px-2 py-0.5 text-[12px] font-extrabold text-white">{TEXTO_ALERTAS.nuevos(sinResponder.length)}</span>}
      </h2>
      <p className="text-[13px] text-ink-soft">{TEXTO_PEDIDO.cercaApoyo}</p>
      <AvisosCard quien="paseador" />
      {cerradas > 0 && <p className="text-[13px] font-bold text-ink">{TEXTO_PEDIDO.ofertaYaAsignado}</p>}
      {pedidos.length === 0 ? (
        <p className="text-[14px] text-ink-soft">{TEXTO_PEDIDO.cercaVacio}</p>
      ) : (
        <ul className="space-y-2">
          {pedidos.map((p) => (
            <Fila key={p.id} p={p} ahora={ahora} ofertar={ofertar} />
          ))}
        </ul>
      )}
    </section>
  )
}
