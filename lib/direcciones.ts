/**
 * Búsqueda de dirección con Nominatim (el buscador gratis de OpenStreetMap), Bloque 4. Reglas de su política de uso que se cumplen aquí:
 * máximo 1 pedido por segundo (`nominatimSegundosEntreBusquedas`), solo cuando la persona aprieta «Buscar» (nunca autocompletar) y
 * sin guardar la respuesta. El navegador NO deja cambiar el encabezado User-Agent: la app se identifica por el sitio desde el que se
 * pide (Referer) y, si el equipo llena `nominatimCorreo`, con el parámetro `email`. Funciones puras salvo `buscarDireccion`.
 */
import { CONFIG } from './config'
import { DISTRICTS, type LatLng } from './geo'

export interface Lugar {
  nombre: string
  punto: LatLng
}

export type ResultadoBusqueda = { ok: true; lugares: Lugar[] } | { ok: false; motivo: 'corta' | 'sin_conexion' }

export const LARGO_MINIMO_BUSQUEDA = 4
const LARGO_MAXIMO_BUSQUEDA = 120

/** El rectángulo que cubre los dos distritos, con un margen: la búsqueda no se sale de ahí. */
function caja(): { oeste: number; norte: number; este: number; sur: number } {
  const puntos = DISTRICTS.flatMap((d) => d.polygon)
  const lats = puntos.map((p) => p[0])
  const lngs = puntos.map((p) => p[1])
  const margen = 0.01
  return { oeste: Math.min(...lngs) - margen, norte: Math.max(...lats) + margen, este: Math.max(...lngs) + margen, sur: Math.min(...lats) - margen }
}

export function urlDeBusqueda(texto: string, c = CONFIG): string {
  const b = caja()
  const q = new URLSearchParams({
    q: `${texto.trim().slice(0, LARGO_MAXIMO_BUSQUEDA)}, Lima, Perú`,
    format: 'jsonv2',
    limit: String(c.nominatimMaxResultados),
    countrycodes: 'pe',
    viewbox: `${b.oeste},${b.norte},${b.este},${b.sur}`,
    bounded: '1',
    'accept-language': 'es',
  })
  if (c.nominatimCorreo) q.set('email', c.nominatimCorreo)
  return `${c.nominatimUrl}?${q.toString()}`
}

/** De la respuesta de Nominatim a una lista corta de lugares (descarta lo que no trae nombre o punto). */
export function lugaresDeRespuesta(json: unknown, max: number = CONFIG.nominatimMaxResultados): Lugar[] {
  if (!Array.isArray(json)) return []
  const salida: Lugar[] = []
  for (const x of json) {
    const o = x && typeof x === 'object' ? (x as Record<string, unknown>) : {}
    const lat = Number(o.lat)
    const lng = Number(o.lon)
    const nombre = typeof o.display_name === 'string' ? o.display_name.trim() : ''
    if (!nombre || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue
    // El nombre largo de Nominatim llega hasta el país: aquí se corta a lo útil (calle, número, barrio, distrito).
    salida.push({ nombre: nombre.split(',').slice(0, 4).join(',').trim(), punto: [lat, lng] })
    if (salida.length >= max) break
  }
  return salida
}

export interface DepsBuscador {
  pedir: (url: string) => Promise<unknown>
  ahora: () => number
  esperar: (ms: number) => Promise<void>
}

/**
 * Un buscador que nunca pasa de 1 pedido por segundo: si se llama antes, espera lo que falta. Las llamadas se ponen en fila.
 * Sin internet o con una respuesta rara devuelve `sin_conexion` (la pantalla ofrece escribir la dirección a mano).
 */
export function crearBuscador(deps: DepsBuscador, c = CONFIG): (texto: string) => Promise<ResultadoBusqueda> {
  let ultima = -Infinity
  let fila: Promise<unknown> = Promise.resolve()
  return (texto) => {
    if (texto.trim().length < LARGO_MINIMO_BUSQUEDA) return Promise.resolve({ ok: false, motivo: 'corta' })
    const trabajo = fila.then(async (): Promise<ResultadoBusqueda> => {
      const falta = ultima + c.nominatimSegundosEntreBusquedas * 1000 - deps.ahora()
      if (falta > 0) await deps.esperar(falta)
      ultima = deps.ahora()
      try {
        return { ok: true, lugares: lugaresDeRespuesta(await deps.pedir(urlDeBusqueda(texto, c)), c.nominatimMaxResultados) }
      } catch {
        return { ok: false, motivo: 'sin_conexion' }
      }
    })
    fila = trabajo
    return trabajo
  }
}

/** El buscador de la app (solo en el navegador). */
export const buscarDireccion = crearBuscador({
  pedir: async (url) => {
    const r = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!r.ok) throw new Error('nominatim')
    return r.json()
  },
  ahora: () => Date.now(),
  esperar: (ms) => new Promise((resolver) => setTimeout(resolver, ms)),
})
