import { WALK_ROUTE, type LatLng } from './geo'

/** Distancia entre dos coordenadas, en metros (fórmula de haversine). */
export function haversine(a: LatLng, b: LatLng) {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b[0] - a[0])
  const dLng = toRad(b[1] - a[1])
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

const cumulative: number[] = [0]
for (let i = 1; i < WALK_ROUTE.length; i++) {
  cumulative.push(cumulative[i - 1] + haversine(WALK_ROUTE[i - 1], WALK_ROUTE[i]))
}

export const ROUTE_M = cumulative[cumulative.length - 1]
export const ROUTE_KM = ROUTE_M / 1000

/** Posición del perro para un progreso de 0 (salida) a 1 (de vuelta en casa). */
export function pointAt(progress: number): LatLng {
  const target = Math.min(Math.max(progress, 0), 1) * ROUTE_M
  for (let i = 1; i < cumulative.length; i++) {
    if (cumulative[i] >= target) {
      const span = cumulative[i] - cumulative[i - 1] || 1
      const t = (target - cumulative[i - 1]) / span
      const [la0, ln0] = WALK_ROUTE[i - 1]
      const [la1, ln1] = WALK_ROUTE[i]
      return [la0 + (la1 - la0) * t, ln0 + (ln1 - ln0) * t]
    }
  }
  return WALK_ROUTE[WALK_ROUTE.length - 1]
}

/** Tramo ya recorrido (de la salida hasta la posición actual). */
export function pathUntil(progress: number): LatLng[] {
  const target = Math.min(Math.max(progress, 0), 1) * ROUTE_M
  const out: LatLng[] = [WALK_ROUTE[0]]
  for (let i = 1; i < cumulative.length; i++) {
    if (cumulative[i] <= target) out.push(WALK_ROUTE[i])
    else break
  }
  out.push(pointAt(progress))
  return out
}
