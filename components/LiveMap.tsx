'use client'

import { useEffect, useRef } from 'react'
import type * as Leaflet from 'leaflet'
import { HOME_POINT, type LatLng } from '@/lib/geo'
import type { TipoPuntoLista } from '@/lib/puntosControl'
import { TEXTO_PUNTOS } from '@/lib/puntosControlTextos'
import { cn } from '@/lib/utils'
import { useLeaflet } from './map/useLeaflet'
import { dibujarZona } from './map/zonaCapas'

/** Un punto de control con ubicación, listo para dibujar. Nunca se escriben coordenadas en pantalla. */
export interface PuntoMapa {
  id: string
  tipo: TipoPuntoLista
  etiqueta: string
  pos: LatLng
  /** Inventado por la demostración. */
  demo: boolean
}

const COLOR: Record<TipoPuntoLista, string> = { inicio: '#15803d', foto: '#c2410c', fin: '#0f172a' }

/** El marcador: un círculo de color con el número de la foto, «I» (inicio) o «F» (fin), y su nombre debajo. */
function iconoPunto(p: PuntoMapa): string {
  const marca = p.tipo === 'inicio' ? 'I' : p.tipo === 'fin' ? 'F' : p.etiqueta.replace(/\D/g, '') || '•'
  const nombre = p.etiqueta.replace(/[<>&"]/g, '')
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:3px"><span style="display:grid;place-items:center;width:30px;height:30px;border-radius:999px;background:${COLOR[p.tipo]};color:#fff;border:3px solid #fff;font:800 14px var(--font-sans);box-shadow:0 4px 10px rgba(0,0,0,.35)">${marca}</span><span style="white-space:nowrap;background:#0f172a;color:#fff;border-radius:999px;padding:1px 8px;font:800 12px var(--font-sans)">${nombre}</span></div>`
}

/**
 * Mapa real (OpenStreetMap) con la zona y los PUNTOS DE CONTROL del paseo: el inicio, cada foto y el fin. No hay un
 * punto que se mueva ni una ruta: el seguimiento es por puntos de control con foto. En la demostración los puntos son
 * inventados y el mapa lo dice.
 */
export function LiveMap({ puntos, demo, className, enVivo }: { puntos: PuntoMapa[]; demo: boolean; className?: string; enVivo?: { pos: LatLng; reciente: boolean } | null }) {
  const ref = useRef<HTMLDivElement>(null)
  const ctx = useLeaflet(ref, { center: HOME_POINT, zoom: 15, scrollWheelZoom: false })
  const capa = useRef<Leaflet.LayerGroup | null>(null)

  // La zona (una sola vez)
  useEffect(() => {
    if (!ctx) return
    const { L, map } = ctx
    // Solo queda «© colaboradores de OpenStreetMap» (la atribución obligatoria): en una línea cabe sobre la hoja.
    map.attributionControl.setPrefix(false)
    const zona = dibujarZona(L, map)
    capa.current = L.layerGroup().addTo(map)
    const t = setTimeout(() => map.invalidateSize(), 700)
    return () => {
      clearTimeout(t)
      zona.remove()
      capa.current?.remove()
      capa.current = null
    }
  }, [ctx])

  // Los puntos: se redibujan cuando cambian y el mapa los encuadra
  useEffect(() => {
    if (!ctx || !capa.current) return
    const { L, map } = ctx
    capa.current.clearLayers()
    for (const p of puntos) {
      L.marker(p.pos, {
        icon: L.divIcon({ className: '', iconSize: [90, 54], iconAnchor: [45, 16], html: iconoPunto(p) }),
        interactive: false,
        zIndexOffset: p.tipo === 'fin' ? 800 : p.tipo === 'foto' ? 600 : 400,
      }).addTo(capa.current)
    }
    if (puntos.length === 0) map.setView(HOME_POINT, 15, { animate: false })
    else if (puntos.length === 1) map.setView(puntos[0].pos, 16, { animate: false })
    else map.fitBounds(L.latLngBounds(puntos.map((p) => p.pos)), { padding: [46, 46], maxZoom: 17, animate: false })
  }, [ctx, puntos])

  // La ubicación en vivo (solo con servidor y la app abierta): un punto que se mueve, aparte de los puntos de control
  const vivo = useRef<Leaflet.Marker | null>(null)
  const lat = enVivo?.pos[0]
  const lng = enVivo?.pos[1]
  const reciente = enVivo?.reciente ?? false
  useEffect(() => {
    if (!ctx || lat === undefined || lng === undefined) return
    const { L, map } = ctx
    const fondo = reciente ? '#0f766e' : '#94a3b8'
    const marca = L.marker([lat, lng], {
      icon: L.divIcon({ className: '', iconSize: [20, 20], iconAnchor: [10, 10], html: `<span style="display:block;width:20px;height:20px;border-radius:999px;background:${fondo};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)"></span>` }),
      interactive: false,
      keyboard: false,
      zIndexOffset: 900,
    }).addTo(map)
    vivo.current = marca
    if (!map.getBounds().contains([lat, lng])) map.panTo([lat, lng], { animate: false })
    return () => {
      marca.remove()
      vivo.current = null
    }
  }, [ctx, lat, lng, reciente])

  return (
    // La hoja de abajo sube 28 px sobre el mapa: la atribución de OpenStreetMap (obligatoria) se sube para que se lea.
    // (`!` porque la hoja de estilos de Leaflet no está en una capa de Tailwind y le gana a las utilidades.)
    <div className={cn('relative aspect-[400/330] max-h-[40dvh] w-full overflow-hidden bg-sand [&_.leaflet-bottom]:bottom-7!', className)}>
      <div ref={ref} className="absolute inset-0 z-0" />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] h-16 bg-linear-to-b from-canvas/80 to-transparent" />

      <div className="absolute left-3 top-3 z-[500] rounded-full bg-paper px-3 py-1.5 text-[12px] font-extrabold text-ink shadow-pop">
        {demo ? TEXTO_PUNTOS.mapaDemo : puntos.length === 0 ? TEXTO_PUNTOS.mapaSin : TEXTO_PUNTOS.titulo.toUpperCase()}
      </div>

      <div className="absolute right-3 top-3 z-[500] flex items-center gap-1.5 rounded-full bg-paper px-2.5 py-1.5 text-[12px] font-bold text-ink shadow-pop">
        <span className="h-2.5 w-3 rounded-[3px] border-2 border-brand-700 bg-brand-700/15" />
        Zona
      </div>
    </div>
  )
}
