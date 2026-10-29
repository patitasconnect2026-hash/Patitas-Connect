'use client'

import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { CONFIG } from '@/lib/config'
import { DURATIONS } from '@/lib/data'
import { newId } from '@/lib/bus'
import { bajarMonto, crearPedido, subirMonto, type Pedido } from '@/lib/pedidos'
import { TEXTO_PEDIDO, textoDeMotivo } from '@/lib/pedidosTextos'
import { dayInfo, HOURS, hourLabel } from '@/lib/schedule'
import type { Account, Dog } from '@/lib/types'
import { btnPrimary, btnSoft, inputBase } from '@/lib/ui'
import { cn, solesShort } from '@/lib/utils'
import { Sheet } from './ui/Sheet'

const DIAS = [0, 1, 2, 3, 4, 5, 6]

/** «Pedir paseo»: la familia dice cuándo, cuánto dura, quién pasea y cuánto pagaría por UNA hora. Nada se paga ahora. */
export function PedirPaseoSheet({
  account,
  dogs,
  initialDogId,
  onClose,
  onPedir,
  onPedirCasa,
  onAddDog,
}: {
  account: Account | null
  dogs: Dog[]
  initialDogId: string | null
  onClose: () => void
  onPedir: (p: Pedido) => Promise<{ ok: true } | { ok: false; mensaje: string }>
  onPedirCasa: () => void
  onAddDog: () => void
}) {
  const [dayIdx, setDayIdx] = useState(1)
  const [hora, setHora] = useState(10)
  const [duracion, setDuracion] = useState(60)
  const [dogId, setDogId] = useState(initialDogId ?? dogs[0]?.id ?? '')
  const [monto, setMonto] = useState<number>(Math.round((CONFIG.tarifaMinima + CONFIG.tarifaMaxima) / 2))
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dog = dogs.find((d) => d.id === dogId) ?? dogs[0] ?? null
  const casa = account?.casa ?? null

  const pedir = async () => {
    if (enviando || !dog || !account || !casa) return
    setError(null)
    const r = crearPedido({ id: newId(), dog, dayIdx, startHour: hora, slotLabel: `${dayInfo(dayIdx).label} · ${hourLabel(hora)}`, durationMin: duracion, montoHora: monto, distrito: account.district, punto: casa, ahora: Date.now() })
    if (!r.ok) {
      setError(textoDeMotivo(r.motivo))
      return
    }
    setEnviando(true)
    const res = await onPedir(r.pedido)
    setEnviando(false)
    if (!res.ok) setError(res.mensaje)
  }

  const falta = !dog ? 'perro' : !casa ? 'casa' : null
  return (
    <Sheet label={TEXTO_PEDIDO.titulo} onClose={onClose}>
      <div className="flex-1 space-y-5 overflow-y-auto p-5 pb-3">
        <header>
          <h2 className="font-display text-xl font-extrabold text-ink">{TEXTO_PEDIDO.titulo}</h2>
          <p className="mt-1 text-[14px] text-ink-soft">{TEXTO_PEDIDO.botonApoyo}</p>
        </header>

        {falta === 'casa' && (
          <div className="rounded-2xl bg-sand p-4 text-[14px] text-ink">
            <p className="font-bold">{TEXTO_PEDIDO.sinCasa}</p>
            <button type="button" onClick={onPedirCasa} className={cn(btnPrimary, 'mt-3 h-11 px-5 text-[14px]')}>
              Marcar mi casa
            </button>
          </div>
        )}
        {falta === 'perro' && (
          <div className="rounded-2xl bg-sand p-4 text-[14px] text-ink">
            <p className="font-bold">Primero agrega a tu perro.</p>
            <button type="button" onClick={onAddDog} className={cn(btnPrimary, 'mt-3 h-11 px-5 text-[14px]')}>
              Agregar perro
            </button>
          </div>
        )}

        <fieldset className="space-y-2">
          <legend className="text-[14px] font-extrabold text-ink">{TEXTO_PEDIDO.cuando}</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[13px] font-bold text-ink-soft">
              Día
              <select value={dayIdx} onChange={(e) => setDayIdx(Number(e.target.value))} className={cn(inputBase, 'mt-1')}>
                {DIAS.map((d) => (
                  <option key={d} value={d}>
                    {dayInfo(d).label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[13px] font-bold text-ink-soft">
              Hora
              <select value={hora} onChange={(e) => setHora(Number(e.target.value))} className={cn(inputBase, 'mt-1')}>
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {hourLabel(h)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-[14px] font-extrabold text-ink">{TEXTO_PEDIDO.duracion}</legend>
          <div className="flex gap-2">
            {DURATIONS.map((m) => (
              <button key={m} type="button" aria-pressed={duracion === m} onClick={() => setDuracion(m)} className={cn('h-11 flex-1 rounded-full text-[14px] font-extrabold', duracion === m ? 'bg-ink text-white' : 'bg-sand text-ink')}>
                {m} min
              </button>
            ))}
          </div>
        </fieldset>

        {dogs.length > 1 && (
          <label className="block text-[14px] font-extrabold text-ink">
            {TEXTO_PEDIDO.perro}
            <select value={dog?.id ?? ''} onChange={(e) => setDogId(e.target.value)} className={cn(inputBase, 'mt-1')}>
              {dogs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <fieldset className="space-y-2">
          <legend className="text-[14px] font-extrabold text-ink">{TEXTO_PEDIDO.monto}</legend>
          <div className="flex items-center justify-between rounded-2xl bg-sand p-2">
            <button type="button" aria-label="Bajar un sol" onClick={() => setMonto(bajarMonto)} disabled={monto <= CONFIG.tarifaMinima} className={cn(btnSoft, 'size-12 bg-paper disabled:opacity-40')}>
              <Minus className="size-5" aria-hidden />
            </button>
            <p aria-live="polite" className="font-display text-3xl font-extrabold text-ink">
              {solesShort(monto)} <span className="text-[14px] font-bold text-ink-soft">{TEXTO_PEDIDO.porHora}</span>
            </p>
            <button type="button" aria-label="Subir un sol" onClick={() => setMonto(subirMonto)} disabled={monto >= CONFIG.tarifaMaxima} className={cn(btnSoft, 'size-12 bg-paper disabled:opacity-40')}>
              <Plus className="size-5" aria-hidden />
            </button>
          </div>
          <p className="text-[13px] text-ink-soft">
            {TEXTO_PEDIDO.montoApoyo} Entre {solesShort(CONFIG.tarifaMinima)} y {solesShort(CONFIG.tarifaMaxima)}.
          </p>
        </fieldset>

        <p className="rounded-2xl bg-forest-50 p-3 text-[13px] font-bold text-forest">{TEXTO_PEDIDO.sinPago}</p>
        {error && (
          <p role="alert" className="rounded-2xl bg-red-50 p-3 text-[14px] font-bold text-red-700">
            {error}
          </p>
        )}
      </div>
      <div className="border-t border-ink/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button type="button" onClick={pedir} disabled={enviando || falta !== null} className={cn(btnPrimary, 'h-14 w-full text-[16px] disabled:opacity-50')}>
          {enviando ? TEXTO_PEDIDO.enviando : TEXTO_PEDIDO.enviar}
        </button>
      </div>
    </Sheet>
  )
}
