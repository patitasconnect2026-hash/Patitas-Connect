'use client'

import { useEffect, useState, type RefObject } from 'react'
import type * as Leaflet from 'leaflet'

export type LeafletLib = typeof Leaflet
export interface LeafletCtx {
  L: LeafletLib
  map: Leaflet.Map
}

/**
 * Mosaicos estándar de OpenStreetMap: no piden clave y sirven para el prototipo y las demos.
 * Su política de uso pide poco tráfico y atribución. Para publicar de verdad conviene un proveedor
 * con plan propio (MapTiler, Stadia Maps, Mapbox) o servir mosaicos propios.
 */
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

/** Crea un mapa de Leaflet dentro del contenedor (solo en el navegador). */
/**
 * `alFallarMosaicos`: se avisa UNA vez si el mapa no puede traer sus mosaicos (sin internet o bloqueado), para ofrecer otra salida.
 */
export function useLeaflet(ref: RefObject<HTMLDivElement | null>, options: Leaflet.MapOptions, alFallarMosaicos?: () => void) {
  const [ctx, setCtx] = useState<LeafletCtx | null>(null)

  useEffect(() => {
    let map: Leaflet.Map | undefined
    let ro: ResizeObserver | undefined
    let cancelled = false

    import('leaflet').then((mod) => {
      if (cancelled || !ref.current) return
      const L = (mod.default ?? mod) as LeafletLib
      map = L.map(ref.current, { zoomControl: false, attributionControl: true, zoomSnap: 0.25, zoomDelta: 0.5, ...options })
      const capa = L.tileLayer(TILES, {
        attribution: '© colaboradores de OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)
      let errores = 0
      capa.on('tileerror', () => {
        errores += 1
        if (errores === 3) alFallarMosaicos?.()
      })
      // El contenedor puede cambiar de tamaño (animaciones, hojas): Leaflet debe enterarse
      ro = new ResizeObserver(() => map?.invalidateSize())
      ro.observe(ref.current)
      map.invalidateSize()
      setCtx({ L, map })
    })

    return () => {
      cancelled = true
      ro?.disconnect()
      map?.remove()
      setCtx(null)
    }
    // Las opciones iniciales solo se usan al crear el mapa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return ctx
}
