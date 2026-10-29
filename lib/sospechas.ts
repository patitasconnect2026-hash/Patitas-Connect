/**
 * Fotos «sospechosas» y seguimiento en vivo (Bloque 6). La base marca la foto (tabla `fotos_sospechas`, solo la lee el equipo);
 * aquí están las MISMAS reglas en funciones puras (para probarlas y para decirlas con palabras) y los textos.
 *
 * «Sospechosa» NO quiere decir «falsa»: es una foto cuya lectura de ubicación tiene mucho error, está lejos de la casa del
 * paseo o implica un salto imposible respecto a la foto anterior. La mira una persona. La ubicación la da el teléfono y se puede
 * falsificar (apps de ubicación simulada): esto no lo impide, y la app nunca lo promete.
 */
import { CONFIG } from './config'
import type { LatLng } from './geo'
import { distanciaMetros } from './zona'

export type MotivoSospecha = 'precision' | 'lejos' | 'salto'

export interface LecturaDeFoto {
  pos: LatLng
  /** Metros de error de la lectura (null si no se sabe). */
  precisionM: number | null
  /** La hora oficial (la del servidor), en ms. */
  t: number
}

/** Menos de esta distancia (m) entre dos fotos es el error normal del GPS: no cuenta como «salto». */
export const SALTO_MINIMO_METROS = 100

/** Los motivos por los que esta foto queda marcada, con las mismas reglas que la base. `casa`: el punto del paseo; `anterior`: la foto anterior con lugar. */
export function motivosDeSospecha(foto: LecturaDeFoto, casa: LatLng | null, anterior: LecturaDeFoto | null, cfg: Pick<typeof CONFIG, 'sospechaPrecisionMetros' | 'sospechaRadioMetros' | 'sospechaVelocidadKmh'> = CONFIG): MotivoSospecha[] {
  const motivos: MotivoSospecha[] = []
  if (foto.precisionM !== null && foto.precisionM > cfg.sospechaPrecisionMetros) motivos.push('precision')
  if (casa && distanciaMetros(foto.pos, casa) > cfg.sospechaRadioMetros) motivos.push('lejos')
  if (anterior) {
    const metros = distanciaMetros(anterior.pos, foto.pos)
    const segundos = Math.max((foto.t - anterior.t) / 1000, 1)
    if (metros >= SALTO_MINIMO_METROS && metros / 1000 / (segundos / 3600) > cfg.sospechaVelocidadKmh) motivos.push('salto')
  }
  return motivos
}

export const TEXTO_SOSPECHA = {
  titulo: 'Fotos para mirar',
  apoyo: 'Son solo señales: la ubicación la da el teléfono y se puede falsificar. Las mira una persona.',
  vacio: 'Ninguna foto marcada.',
  precision: 'La lectura de ubicación tenía mucho error.',
  lejos: 'La foto está lejos de la casa del paseo.',
  salto: 'Entre dos fotos se movió más rápido de lo posible a pie.',
  paseo: 'Paseo',
} as const

export const textoDeMotivoSospecha = (m: string): string => (m === 'precision' || m === 'lejos' || m === 'salto' ? TEXTO_SOSPECHA[m] : m)

/** Lo que dice la pantalla del paseo en vivo. Honesto: solo con la app abierta, y no es a prueba de falsificación. */
export const TEXTO_EN_VIVO = {
  titulo: 'Dónde va ahora',
  funciona: 'Funciona con la app abierta.',
  hace: (segundos: number) => `Se actualiza cada ${segundos} segundos mientras el paseador tiene la app abierta.`,
  sinSenal: 'Todavía no hay una ubicación reciente.',
  hace_un_rato: 'Última ubicación hace un rato: puede que el paseador haya cerrado la app.',
  cuando: 'Última lectura',
} as const

export interface EstadoEnVivo {
  /** `reciente` si la lectura es de hace menos de 3 intervalos; `vieja` si es más antigua; `ninguna` si no hay. */
  estado: 'reciente' | 'vieja' | 'ninguna'
  /** Hace cuántos segundos llegó (null si no hay). */
  haceSegundos: number | null
}

/** ¿Qué tan fresca es la última lectura en vivo? Pasados 3 intervalos ya no se la presenta como «en vivo». */
export function estadoEnVivo(en: number | null, ahora: number, segundosEnVivo: number = CONFIG.segundosEnVivo): EstadoEnVivo {
  if (en === null) return { estado: 'ninguna', haceSegundos: null }
  const hace = Math.max(0, Math.round((ahora - en) / 1000))
  return { estado: hace <= segundosEnVivo * 3 ? 'reciente' : 'vieja', haceSegundos: hace }
}
