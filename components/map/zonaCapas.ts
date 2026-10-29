import type * as Leaflet from 'leaflet'
import { DISTRICTS, type LatLng } from '@/lib/geo'
import type { LeafletLib } from './useLeaflet'

/** Naranjas de la marca (`brand-700` para la línea, `brand-600` para el relleno). */
const BORDE = '#ad3c1b'
const RELLENO = '#cd4f27'
/** Velo gris azulado (`slate`): lo de afuera de la zona se ve apagado, pero se siguen leyendo los nombres del mapa. */
const VELO = '#475569'

/** Un rectángulo enorme (≈ 220 km) que tapa «todo lo demás»: los dos distritos son huecos de este rectángulo. */
const AFUERA: LatLng[] = [
  [-13.1, -78.0],
  [-13.1, -76.0],
  [-11.1, -76.0],
  [-11.1, -78.0],
]

export type DistritoDestacado = 'all' | 'San Isidro' | 'Jesús María'

/**
 * Dibuja la zona donde se atiende: San Isidro y Jesús María con un borde claro, y todo lo de afuera atenuado
 * (se sigue viendo un poco de los alrededores: La Victoria, Lince, Pueblo Libre…).
 *
 * El margen de 300 m (`CONFIG.zonaBufferMetros`) NO se dibuja a propósito: un margen bien hecho es el contorno
 * de un polígono de 250 vértices desplazado 300 m, y eso pide una librería de geometría. Se usa solo en la lógica
 * (`clasificarPunto` en `lib/zona.ts`).
 *
 * Devuelve el grupo de capas; quien lo pide lo quita con `grupo.remove()`.
 */
export function dibujarZona(
  L: LeafletLib,
  map: Leaflet.Map,
  { destacado = 'all', etiquetas = false }: { destacado?: DistritoDestacado; etiquetas?: boolean } = {},
): Leaflet.FeatureGroup {
  const grupo = L.featureGroup().addTo(map)

  // El velo no recibe toques: el mapa se mueve y se toca como siempre.
  L.polygon([AFUERA, ...DISTRICTS.map((d) => d.polygon)], {
    stroke: false,
    fillColor: VELO,
    fillOpacity: 0.34,
    interactive: false,
  }).addTo(grupo)

  for (const d of DISTRICTS) {
    const activo = destacado === 'all' || destacado === d.name
    // Un borde blanco debajo separa la línea naranja de las calles del mapa.
    L.polygon(d.polygon, { color: '#ffffff', weight: activo ? 7 : 4, opacity: activo ? 0.9 : 0.5, fill: false, interactive: false }).addTo(grupo)
    const poligono = L.polygon(d.polygon, {
      color: BORDE,
      weight: activo ? 3 : 1.5,
      opacity: activo ? 1 : 0.55,
      lineJoin: 'round',
      fillColor: RELLENO,
      fillOpacity: activo ? 0.08 : 0.02,
    }).addTo(grupo)
    if (etiquetas) poligono.bindTooltip(d.name, { permanent: true, direction: 'center', className: 'district-label' })
  }

  return grupo
}
