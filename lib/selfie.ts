/**
 * Foto de hoy (Tarea 7): una por día, con la cámara de la app, antes del primer paseo del día. Funciones puras.
 *
 * NO es una comprobación ni prueba quién es la persona: es una foto con hora. No está en `lib/verificacion.ts` y ningún
 * texto de aquí dice «verificado», «identidad» ni «es quien dice ser» (una prueba lo vigila).
 * Se guarda como una foto más (`lib/datos/fotos.ts`) con un `jobId` propio por paseador y día.
 */
import type { FotoPaseo } from './fotos'

export const TEXTO_SELFIE = {
  titulo: 'Foto de hoy',
  sin: 'Sin foto de hoy',
  /** Honestidad: sin servidor, la foto no viaja a otro celular. */
  soloAqui: 'Solo se ve en este teléfono mientras no haya servidor.',
  /** Con servidor: la familia con un paseo aceptado la ve; la hora la pone el teléfono (es una señal, no una comprobación). */
  familiaServidor: 'La hora la pone el teléfono del paseador.',
  paseadorServidor: 'La ven las familias con las que tienes un paseo.',
  tomar: 'Tomar mi foto',
  otra: 'Tomar otra',
  /** Lo que ve el paseador. */
  apoyoPaseador: 'Antes de tu primer paseo del día. Si falta, la familia ve «Sin foto de hoy».',
  ejemplo: 'Foto de ejemplo',
  demostracion: 'Demostración',
  camara: 'Foto de hoy',
  camaraIndicacion: 'Mírate a la cámara y toca el botón.',
} as const

const ZONA = 'America/Lima'

/** «2026-10-14», en hora de Lima aunque el teléfono tenga otra zona. */
export function diaDeLima(ms: number): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms))
}

/** «08:41», en hora de Lima. */
export function horaDeLima(ms: number): string {
  return new Intl.DateTimeFormat('es-PE', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ms))
}

const PREFIJO = 'selfie:'

/** El «paseo» con el que se guarda la foto de un paseador en un día. */
export const claveSelfie = (walkerId: string, dia: string) => `${PREFIJO}${walkerId}:${dia}`
export const esSelfie = (f: Pick<FotoPaseo, 'jobId'>) => f.jobId.startsWith(PREFIJO)
/** ¿Esta foto es de ese paseador (de cualquier día)? */
export const esSelfieDe = (f: Pick<FotoPaseo, 'jobId'>, walkerId: string) => f.jobId.startsWith(`${PREFIJO}${walkerId}:`)

/** La foto de hoy de un paseador, o null si falta. `ahora` en milisegundos; 0 (cargando) = null. */
export function selfieDeHoy(fotos: readonly FotoPaseo[], walkerId: string, ahora: number): FotoPaseo | null {
  if (!ahora || !walkerId) return null
  const clave = claveSelfie(walkerId, diaDeLima(ahora))
  return fotos.find((f) => f.jobId === clave) ?? null
}

/** «Foto de hoy, 08:41» o «Sin foto de hoy». */
export function textoSelfie(foto: Pick<FotoPaseo, 't'> | null): string {
  return foto ? `${TEXTO_SELFIE.titulo}, ${horaDeLima(foto.t)}` : TEXTO_SELFIE.sin
}
