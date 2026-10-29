'use client'

import { useEffect, useRef, useState } from 'react'
import { SPOTS } from '@/lib/geo'
import { TEXTO_MAPA } from '@/lib/mapaTextos'
import { cn } from '@/lib/utils'
import { useLeaflet } from '../map/useLeaflet'
import { dibujarZona } from '../map/zonaCapas'

/** El paseador toca los parques en el mapa para marcarlos (o desmarcarlos). Lo mismo que las casillas de arriba, pero sobre el mapa. */
export function ParquesEnMapa({ elegidos, max, onChange }: { elegidos: readonly string[]; max: number; onChange: (ids: string[]) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [falla, setFalla] = useState(false)
  const ctx = useLeaflet(ref, { center: [-12.088, -77.04], zoom: 13, minZoom: 11 }, () => setFalla(true))
  const actual = useRef({ elegidos, max, onChange })
  useEffect(() => {
    actual.current = { elegidos, max, onChange }
  })

  useEffect(() => {
    if (!ctx) return
    const { L, map } = ctx
    const zona = dibujarZona(L, map)
    map.invalidateSize()
    const marcas = SPOTS.map((s) => {
      const on = elegidos.includes(s.id)
      const m = L.circleMarker(s.pos, { radius: on ? 12 : 9, color: '#fff', weight: 3, fillColor: on ? '#146c43' : '#64748b', fillOpacity: 1 })
      m.bindTooltip(s.name, { direction: 'top', offset: [0, -8] })
      m.on('click', () => {
        const { elegidos: e, max: tope, onChange: cambiar } = actual.current
        if (e.includes(s.id)) cambiar(e.filter((x) => x !== s.id))
        else if (e.length < tope) cambiar([...e, s.id])
      })
      return m.addTo(map)
    })
    return () => {
      marcas.forEach((m) => m.remove())
      zona.remove()
    }
  }, [ctx, elegidos])

  return (
    <div className="space-y-1">
      <p className="text-[13px] font-bold text-ink-soft">{TEXTO_MAPA.parquesTitulo}</p>
      <div className="relative h-56 overflow-hidden rounded-2xl border border-ink/10">
        <div ref={ref} className="absolute inset-0" role="application" aria-label={TEXTO_MAPA.parquesTitulo} />
      </div>
      <p className={cn('text-[13px]', falla ? 'font-bold text-ink' : 'text-ink-soft')}>{falla ? TEXTO_MAPA.mapaFalla : TEXTO_MAPA.parquesApoyo}</p>
    </div>
  )
}
