/**
 * Las fotos con el servidor (paso 8): de la foto del teléfono a la fila de `fotos` y a la ruta del almacén privado, y al revés.
 * Funciones puras: no hablan con la base ni con el almacén.
 *
 *   - Los bytes van al almacén PRIVADO `fotos` (nunca una dirección pública; la imagen se ve con un enlace que vence).
 *   - Los datos (hora, lugar, código de 2 dígitos) van a la tabla `fotos`.
 *   - El id de la fila y del archivo sale siempre igual de la foto del teléfono (`idRemotoDeFoto`): subirla dos veces, por
 *     un reintento o porque se cortó internet a la mitad, NO la duplica.
 *
 * Las fotos son SEÑALES: la hora y el lugar los pone el teléfono y se pueden alterar.
 */
import { CONFIG } from '../config'
import type { FotoPaseo, SinUbicacion } from '../fotos'
import { claveSelfie, diaDeLima, esSelfie, esSelfieDe } from '../selfie'
import { uuidDe } from './paseosMapeo'
import type { FilaCruda, FilaFotoNueva } from './paseosTipos'

/** El tope del almacén: el bucket `fotos` solo recibe archivos de hasta 1 MB (`file_size_limit` en la migración de fotos). */
export const LIMITE_BYTES_ALMACEN = 1_048_576
/** Los tipos que acepta el bucket (`allowed_mime_types`). La cámara de la app solo saca JPEG. */
export const TIPOS_DEL_ALMACEN: readonly string[] = ['image/jpeg', 'image/png', 'image/webp']
/** Cuánto dura el enlace que la app pide para ver una foto: corto, y se pide otro cuando hace falta. */
export const SEGUNDOS_DEL_ENLACE = 120

const SIN_UBICACION: readonly string[] = ['negada', 'omitida', 'no_disponible', 'sin_lectura']
const texto = (v: unknown): string => (typeof v === 'string' ? v : '')
const numero = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** El id de la fila y del archivo de una foto del teléfono. Siempre sale igual de la misma foto. */
export const idRemotoDeFoto = (idLocal: string): string => uuidDe(`foto:${idLocal}`)

export type TipoDeFoto = 'paseo' | 'hoy'
export const tipoDeFoto = (f: Pick<FotoPaseo, 'jobId'>): TipoDeFoto => (esSelfie(f) ? 'hoy' : 'paseo')

/** La ruta de la imagen en el almacén: `paseo/<paseo>/<foto>.jpg` o `hoy/<paseador>/<foto>.jpg` (así lo piden las reglas). */
export function rutaDeFoto(f: Pick<FotoPaseo, 'id' | 'jobId'>, paseadorId: string): string {
  const archivo = `${idRemotoDeFoto(f.id)}.jpg`
  return tipoDeFoto(f) === 'hoy' ? `hoy/${paseadorId}/${archivo}` : `paseo/${f.jobId}/${archivo}`
}

/**
 * Lo que se guarda del lugar. Una lectura vieja (más de `minutosUbicacionVieja` antes de la foto) NO se sube como lugar de
 * la foto: la base no guarda la hora de la lectura, y mostrarla sin esa advertencia sería engañar. Se anota «sin lectura».
 * Una ubicación de demostración nunca sube.
 */
export function ubicacionParaServidor(f: Pick<FotoPaseo, 'ubicacion' | 'sinUbicacion' | 't'>): { lat: number | null; lng: number | null; precision_m: number | null; sin_ubicacion: SinUbicacion | null } {
  const u = f.ubicacion
  if (u && !u.demo && (f.t - u.lecturaT) / 60_000 < CONFIG.minutosUbicacionVieja) return { lat: u.pos[0], lng: u.pos[1], precision_m: typeof u.precisionM === 'number' && Number.isFinite(u.precisionM) ? Math.round(u.precisionM * 10) / 10 : null, sin_ubicacion: null }
  const motivo = f.sinUbicacion
  return { lat: null, lng: null, precision_m: null, sin_ubicacion: motivo && SIN_UBICACION.includes(motivo) ? motivo : 'sin_lectura' }
}

/** La fila que se guarda en `fotos` (los bytes van aparte, al almacén). */
export function filaDeFoto(f: FotoPaseo, paseadorId: string): FilaFotoNueva {
  const tipo = tipoDeFoto(f)
  return {
    id: idRemotoDeFoto(f.id),
    tipo,
    paseo_id: tipo === 'paseo' ? f.jobId : null,
    paseador_id: paseadorId,
    dia: tipo === 'hoy' ? diaDeLima(f.t) : null,
    en: new Date(f.t).toISOString(),
    codigo: tipo === 'paseo' ? f.codigo : '',
    ...ubicacionParaServidor(f),
    bytes: f.bytes,
    ruta: rutaDeFoto(f, paseadorId),
  }
}

/** Una fila de `fotos` como foto de la app (sin los bytes: se ve con un enlace que vence). null si la fila no sirve. */
export function fotoDeFila(f: FilaCruda): FotoPaseo | null {
  const id = texto(f.id)
  const ruta = texto(f.ruta)
  const t = Date.parse(texto(f.en))
  const tipo = f.tipo === 'hoy' || f.tipo === 'paseo' ? f.tipo : null
  if (!id || !ruta || !Number.isFinite(t) || !tipo) return null
  const jobId = tipo === 'paseo' ? texto(f.paseo_id) : texto(f.paseador_id) && texto(f.dia) ? claveSelfie(texto(f.paseador_id), texto(f.dia)) : ''
  if (!jobId) return null
  const lat = numero(f.lat)
  const lng = numero(f.lng)
  const motivo = texto(f.sin_ubicacion)
  return {
    id,
    jobId,
    t,
    codigo: texto(f.codigo),
    ubicacion: lat !== null && lng !== null ? { pos: [lat, lng], lecturaT: t, ...(numero(f.precision_m) !== null ? { precisionM: numero(f.precision_m) as number } : {}) } : null,
    ...(lat === null || lng === null ? { sinUbicacion: (SIN_UBICACION.includes(motivo) ? motivo : 'sin_lectura') as SinUbicacion } : {}),
    bytes: numero(f.bytes) ?? 0,
    almacen: 'servidor',
    ruta,
  }
}

export function fotosDeFilas(filas: readonly FilaCruda[]): FotoPaseo[] {
  return filas.map(fotoDeFila).filter((f): f is FotoPaseo => f !== null)
}

/**
 * Las fotos que se ven: las de este teléfono (con sus bytes) y, además, las que trae el servidor y este teléfono no tiene.
 * Una foto que ya subió aparece una sola vez (gana la de este teléfono, que se ve al instante y sin internet).
 */
export function mezclarFotos(locales: readonly FotoPaseo[], remotas: readonly FotoPaseo[]): FotoPaseo[] {
  if (remotas.length === 0) return locales as FotoPaseo[]
  const suyas = new Set(locales.map((f) => idRemotoDeFoto(f.id)))
  const nuevas = remotas.filter((f) => !suyas.has(f.id))
  return nuevas.length === 0 ? (locales as FotoPaseo[]) : [...locales, ...nuevas]
}

/**
 * Las fotos de este teléfono que todavía no están en el servidor y se pueden subir ahora, de la más vieja a la más nueva.
 * Solo las del paseador de la sesión: las de sus paseos (que ya existen en la base) y su foto de hoy.
 *   - `enBase`: los ids de fila que el servidor ya tiene (lo que bajó en la última lectura).
 *   - `paseosDelPaseador`: los paseos que ya están en la base y son de este paseador.
 */
export function fotosPorSubir(locales: readonly FotoPaseo[], o: { enBase: ReadonlySet<string>; paseosDelPaseador: ReadonlySet<string>; paseadorId: string }): FotoPaseo[] {
  return locales
    .filter((f) => {
      if (f.almacen === 'servidor' || o.enBase.has(idRemotoDeFoto(f.id))) return false
      return esSelfie(f) ? esSelfieDe(f, o.paseadorId) : o.paseosDelPaseador.has(f.jobId)
    })
    .sort((a, b) => a.t - b.t)
}
