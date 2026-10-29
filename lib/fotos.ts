/**
 * Las fotos del paseo, vistas desde la lógica pura: qué lleva cada foto (hora, lugar, código), cómo se dice el
 * lugar al dueño y cuándo se puede sacar otra. La cámara y el almacenamiento están en `components/walker/` y `lib/datos/`.
 *
 * Son SEÑALES: la hora y las coordenadas las pone el teléfono y se pueden alterar. Nunca se muestran coordenadas crudas.
 */
import { CONFIG } from './config'
import { SPOTS, type LatLng } from './geo'
import { clasificarPunto, distanciaMetros, distritoDe, type Vigilancia } from './zona'
import type { MotivoSinUbicacion } from './zonaTextos'
import { MOTIVO_SIN_UBICACION_FOTO, type ErrorCamara } from './fotosTextos'

export type SinUbicacion = MotivoSinUbicacion | 'sin_lectura'

/** La última lectura válida al sacar la foto. `demo`: vino de una prueba de la demostración, no del teléfono. */
export interface UbicacionDeFoto {
  pos: LatLng
  /** Hora de esa lectura (ms). */
  lecturaT: number
  /** Cuántos metros de error tenía la lectura (la da el teléfono). */
  precisionM?: number
  demo?: boolean
}

export interface FotoPaseo {
  id: string
  /** El paseo (encargo) al que pertenece. */
  jobId: string
  /** Hora del teléfono (ms). La pone el teléfono: se puede alterar. */
  t: number
  /** El código de 2 dígitos que la app estampó en la imagen. */
  codigo: string
  ubicacion: UbicacionDeFoto | null
  /** Si no lleva ubicación, por qué. */
  sinUbicacion?: SinUbicacion
  /** Peso del archivo (bytes). */
  bytes: number
  /**
   * Dónde quedó el archivo: IndexedDB, o la memoria de la pestaña si el navegador no tiene IndexedDB. `servidor`: la foto
   * viene del almacén privado (la tomó otro teléfono) y se ve con un enlace que vence; este teléfono no tiene los bytes.
   */
  almacen: 'indexeddb' | 'memoria' | 'servidor'
  /** Solo con `servidor`: la ruta de la imagen en el almacén privado (nunca es una dirección pública). */
  ruta?: string
}

/**
 * El código de 2 dígitos del paseo: sale del id del encargo, así la app del paseador y la del dueño lo calculan igual
 * sin servidor. Va de 10 a 99.
 */
export function codigoDeFotos(jobId: string): string {
  let h = 5381
  for (let i = 0; i < jobId.length; i++) h = ((h << 5) + h + jobId.charCodeAt(i)) >>> 0
  return String(10 + (h % 90))
}

/** ¿El código de la foto es el del paseo? Si no, el dueño ve el aviso. */
export function codigoCoincide(f: Pick<FotoPaseo, 'jobId' | 'codigo'>): boolean {
  return f.codigo === codigoDeFotos(f.jobId)
}

/** Lo que lleva la foto sobre el lugar, según lo que sabe el encargo en ese momento. */
export function ubicacionParaFoto(estado: {
  vigilancia?: Vigilancia
  ubicacion?: 'activa' | MotivoSinUbicacion
}): { ubicacion: UbicacionDeFoto | null; sinUbicacion?: SinUbicacion } {
  const l = estado.vigilancia?.ultima
  if (l) return { ubicacion: { pos: l.pos, lecturaT: l.t, precisionM: l.precisionM, ...(estado.vigilancia?.demo ? { demo: true } : {}) } }
  const motivo = estado.ubicacion
  const sin: SinUbicacion = motivo === 'negada' || motivo === 'omitida' || motivo === 'no_disponible' ? motivo : 'sin_lectura'
  return { ubicacion: null, sinUbicacion: sin }
}

/** «cerca del Bosque El Olivar», «cerca de Campo de Marte»… */
function cercaDe(nombre: string): string {
  return /^(Parque|Bosque|Campo)\b/.test(nombre) ? `cerca del ${nombre}` : `cerca de ${nombre}`
}

export interface LugarDeFoto {
  /** Lo que se escribe: «En San Isidro, cerca del Bosque El Olivar», «En el borde de la zona», «Sin ubicación»… */
  texto: string
  /** Lo mismo en pocas palabras (miniaturas): «Con ubicación», «En el borde», «Fuera de la zona» o «Sin ubicación». */
  corto: string
  /** ¿Dice un lugar? (false = «Sin ubicación» o «Fuera de la zona») */
  conLugar: boolean
  /** Letra chica: por qué no hay ubicación, que es de demostración o de hace cuánto es. */
  nota?: string
}

/**
 * El lugar de la foto, para el dueño. «En [distrito], cerca de [parque]» SOLO si el punto está dentro de la zona;
 * en el borde o fuera lo dice; sin ubicación lo dice. Nunca coordenadas.
 */
export function lugarDeFoto(f: Pick<FotoPaseo, 'ubicacion' | 'sinUbicacion' | 't'>): LugarDeFoto {
  const u = f.ubicacion
  if (!u) {
    return { texto: 'Sin ubicación', corto: 'Sin ubicación', conLugar: false, nota: MOTIVO_SIN_UBICACION_FOTO[f.sinUbicacion ?? 'sin_lectura'] }
  }
  const notas: string[] = []
  if (u.demo) notas.push('Ubicación de demostración.')
  const minutos = Math.round((f.t - u.lecturaT) / 60_000)
  if (minutos >= CONFIG.minutosUbicacionVieja) notas.push(`Ubicación de hace ${minutos} min.`)
  const nota = notas.length ? notas.join(' ') : undefined

  const clase = clasificarPunto(u.pos)
  if (clase === 'fuera') return { texto: 'Fuera de la zona', corto: 'Fuera de la zona', conLugar: false, nota }
  if (clase === 'borde') return { texto: 'En el borde de la zona', corto: 'En el borde', conLugar: true, nota }
  const distrito = distritoDe(u.pos)
  const cerca = SPOTS.map((s) => ({ s, m: distanciaMetros(u.pos, s.pos) }))
    .filter((x) => x.m <= CONFIG.metrosCercaDeParque)
    .sort((a, b) => a.m - b.m)[0]
  const texto = `En ${distrito}${cerca ? `, ${cercaDe(cerca.s.name)}` : ''}`
  return { texto, corto: 'Con ubicación', conLugar: true, nota }
}

/** Alto y ancho de la foto reducida: el lado mayor queda en `lado` (nunca se agranda). */
export function dimensionesFoto(ancho: number, alto: number, lado: number = CONFIG.ladoMaximoFotoPx): { w: number; h: number } {
  const escala = Math.min(1, lado / Math.max(ancho, alto, 1))
  return { w: Math.max(1, Math.round(ancho * escala)), h: Math.max(1, Math.round(alto * escala)) }
}

/** Las fotos de un paseo, de la más vieja a la más nueva. */
export function fotosDe(fotos: readonly FotoPaseo[], jobId: string | null | undefined): FotoPaseo[] {
  if (!jobId) return []
  return fotos.filter((f) => f.jobId === jobId).sort((a, b) => a.t - b.t)
}

/** ¿Todavía se puede sacar otra foto en este paseo? */
export function quedanFotos(fotos: readonly FotoPaseo[], jobId: string, tope: number = CONFIG.maxFotosPorPaseo): boolean {
  return fotosDe(fotos, jobId).length < tope
}

/** Qué pasó al abrir la cámara (el nombre del error cambia entre navegadores). */
export function errorDeCamara(e: unknown): ErrorCamara {
  const nombre = (e as { name?: string } | null)?.name ?? ''
  if (nombre === 'NotAllowedError' || nombre === 'PermissionDeniedError') return 'negada'
  if (nombre === 'SecurityError') return 'sin_https'
  if (nombre === 'NotFoundError' || nombre === 'DevicesNotFoundError' || nombre === 'OverconstrainedError') return 'sin_camara'
  if (nombre === 'NotReadableError' || nombre === 'TrackStartError' || nombre === 'AbortError') return 'ocupada'
  return 'error'
}
