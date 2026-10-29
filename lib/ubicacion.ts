/**
 * La ubicación REAL del teléfono del paseador (Geolocation API del navegador), vista desde la lógica pura:
 * convertir una posición en una lectura del motor de avisos (lib/zona.ts) y decidir cuándo tomarla en cuenta.
 * La parte que toca el navegador (permiso, `watchPosition`, pantalla encendida) está en `components/walker/`.
 *
 * Requiere HTTPS en un celular real (en la computadora sirve `localhost`). Con la pantalla apagada la web no sigue la
 * ubicación: por eso el seguimiento es por puntos de control con foto (lib/puntosControl.ts) y los avisos de zona
 * son solo una ayuda con la pantalla encendida.
 */
import type { Lectura } from './zona'

/** Lo mínimo que usamos de `GeolocationPosition` (así se prueba sin un navegador). */
export interface PosicionCruda {
  coords: { latitude: number; longitude: number; accuracy: number }
  timestamp: number
}

/** La lectura del motor, o null si la posición no sirve (sin números, o fuera del mundo). */
export function aLectura(p: PosicionCruda): Lectura | null {
  const { latitude, longitude, accuracy } = p.coords
  if (![latitude, longitude, accuracy, p.timestamp].every((n) => typeof n === 'number' && Number.isFinite(n))) return null
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || accuracy < 0) return null
  return { pos: [latitude, longitude], precisionM: accuracy, t: p.timestamp }
}

/** El teléfono manda posiciones seguido; se toma una cada `segundos` (la primera siempre). */
export function tocaProcesar(ultimaMs: number | null, ahoraMs: number, segundos: number): boolean {
  return ultimaMs === null || ahoraMs - ultimaMs >= segundos * 1000
}

/** Código de `GeolocationPositionError`: 1 = permiso negado; 2 y 3 = sin señal por ahora (se sigue intentando). */
export function esPermisoNegado(codigo: number): boolean {
  return codigo === 1
}

/** ¿Este navegador puede dar la ubicación? Hace falta la API y una conexión segura (HTTPS o localhost). */
export function puedeUsarUbicacion(entorno: { geolocation?: unknown; isSecureContext?: boolean }): boolean {
  return !!entorno.geolocation && entorno.isSecureContext !== false
}
