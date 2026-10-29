'use client'

import { useEffect, useRef, useState } from 'react'
import { CONFIG } from '@/lib/config'
import type { LatLng } from '@/lib/geo'
import { TEXTO_MAPA } from '@/lib/mapaTextos'
import { redondearZona } from '@/lib/zona'
import { useLeaflet } from './useLeaflet'

/**
 * Mapa chico para el paseador. `aproximada`: solo un círculo de `radioZonaAproximadaMetros` sobre la casilla redondeada (el punto
 * exacto no se dibuja ni se pide); `exacta`: el punto de recojo, solo después de que la familia lo eligió.
 */
export function MapaZona({ centro, modo }: { centro: LatLng; modo: 'aproximada' | 'exacta' }) {
  const ref = useRef<HTMLDivElement>(null)
  const [falla, setFalla] = useState(false)
  // Antes de ser elegido, aunque llegara un punto más fino, se dibuja la casilla redondeada.
  const [lat, lng] = modo === 'aproximada' ? redondearZona(centro) : centro
  const ctx = useLeaflet(ref, { center: [lat, lng], zoom: modo === 'aproximada' ? 15 : 17, dragging: true, scrollWheelZoom: false }, () => setFalla(true))

  useEffect(() => {
    if (!ctx) return
    const { L, map } = ctx
    const punto: LatLng = [lat, lng]
    const capa =
      modo === 'aproximada'
        ? L.circle(punto, { radius: CONFIG.radioZonaAproximadaMetros, color: '#c2410c', weight: 2, fillColor: '#ea580c', fillOpacity: 0.18 })
        : L.circleMarker(punto, { radius: 9, color: '#fff', weight: 3, fillColor: '#0f172a', fillOpacity: 1 })
    capa.addTo(map)
    map.setView(punto, modo === 'aproximada' ? 15 : 17, { animate: false })
    return () => {
      capa.remove()
    }
  }, [ctx, modo, lat, lng])

  return (
    <div className="space-y-1">
      <div className="relative h-44 overflow-hidden rounded-2xl border border-ink/10">
        <div ref={ref} className="absolute inset-0" role="img" aria-label={modo === 'aproximada' ? TEXTO_MAPA.zonaAproximada : TEXTO_MAPA.puntoExacto} />
      </div>
      <p className="text-[13px] text-ink-soft">{falla ? TEXTO_MAPA.mapaFalla : modo === 'aproximada' ? `${TEXTO_MAPA.zonaAproximada}. ${TEXTO_MAPA.zonaAproximadaApoyo}` : TEXTO_MAPA.puntoExacto}</p>
    </div>
  )
}
