/**
 * Puntos de control: el seguimiento del paseo NO es continuo (con la pantalla apagada el celular no puede seguir la
 * ubicación, y el paseador no tiene que vivir pegado al teléfono). La ubicación se registra en tres momentos:
 *
 *   «inicio» (cuando empieza el paseo) · cada «foto» · «fin» (cuando entrega al perro)
 *
 * Cada `CONFIG.minutosPuntoControl` sin foto de control, la app le hace un recordatorio suave al paseador.
 * Funciones puras: no leen la hora ni guardan nada. La cámara, el GPS y el almacén están en `components/walker/`.
 *
 * Son SEÑALES: la hora y el lugar los pone el teléfono y se pueden alterar. Nunca se muestran coordenadas.
 */
import { CONFIG } from './config'
import { lugarDeFoto, type FotoPaseo, type LugarDeFoto, type SinUbicacion, type UbicacionDeFoto } from './fotos'
import type { LatLng } from './geo'
import { pointAt } from './route'
import { horaDe, type Paseo } from './paseo'
import type { Lectura } from './zona'

export type TipoPuntoGuardado = 'inicio' | 'fin'

/** El inicio o el fin del paseo (las fotos se guardan aparte, con su propia ubicación). */
export interface PuntoControl {
  tipo: TipoPuntoGuardado
  /** Hora del suceso (ms): cuando empezó o terminó el paseo, no cuando llegó la lectura. */
  t: number
  ubicacion: UbicacionDeFoto | null
  /** Si no lleva ubicación, por qué. */
  sinUbicacion?: SinUbicacion
}

export type TipoPuntoLista = 'inicio' | 'foto' | 'fin'

/** Un punto de control tal como se muestra al dueño (inicio, cada foto y fin, en orden). */
export interface PuntoLista {
  id: string
  tipo: TipoPuntoLista
  /** «Inicio», «Foto 1», «Foto 2»… «Fin». */
  etiqueta: string
  t: number
  ubicacion: UbicacionDeFoto | null
  sinUbicacion?: SinUbicacion
  lugar: LugarDeFoto
  /** Solo en las fotos: el código estampado. */
  codigo?: string
  /** La hora ya escrita (solo en la demostración, donde la hora es la del guion y no del teléfono). */
  hora?: string
}

/** La lectura del teléfono como ubicación de un punto de control. `demo`: viene de una prueba de la demostración. */
export function ubicacionDeLectura(l: Lectura, demo?: boolean): UbicacionDeFoto {
  return { pos: l.pos, lecturaT: l.t, precisionM: l.precisionM, ...(demo ? { demo: true } : {}) }
}

/** ¿La lectura sirve para un punto de control? (no vale una con mucho error) */
export function lecturaSirve(l: Lectura | null, maxErrorM: number = CONFIG.precisionPuntoControlMetros): l is Lectura {
  return l !== null && l.precisionM <= maxErrorM
}

/** Arma el inicio o el fin: con la lectura si sirve y, si no, anotando por qué no hay ubicación. */
export function armarPunto(
  tipo: TipoPuntoGuardado,
  t: number,
  lectura: Lectura | null,
  decision: 'activa' | 'negada' | 'omitida' | 'no_disponible' | null,
  maxErrorM: number = CONFIG.precisionPuntoControlMetros,
): PuntoControl {
  if (lecturaSirve(lectura, maxErrorM)) return { tipo, t, ubicacion: ubicacionDeLectura(lectura) }
  const motivo: SinUbicacion = decision === 'negada' || decision === 'omitida' || decision === 'no_disponible' ? decision : 'sin_lectura'
  return { tipo, t, ubicacion: null, sinUbicacion: motivo }
}

/** Agrega el punto si todavía no hay uno de ese tipo: un paseo tiene un solo inicio y un solo fin. */
export function agregarPunto(puntos: readonly PuntoControl[] | undefined, nuevo: PuntoControl): PuntoControl[] {
  const actuales = puntos ?? []
  if (actuales.some((p) => p.tipo === nuevo.tipo)) return [...actuales]
  return [...actuales, nuevo]
}

export const tienePunto = (puntos: readonly PuntoControl[] | undefined, tipo: TipoPuntoGuardado) => !!puntos?.some((p) => p.tipo === tipo)

/** Inicio, fotos y fin en orden de hora, con su lugar dicho para el dueño. */
export function puntosDelPaseo(puntos: readonly PuntoControl[] | undefined, fotos: readonly FotoPaseo[]): PuntoLista[] {
  const lista: Array<Omit<PuntoLista, 'etiqueta' | 'lugar'> & { orden: number }> = []
  for (const p of puntos ?? []) {
    lista.push({ id: `punto-${p.tipo}`, tipo: p.tipo, t: p.t, ubicacion: p.ubicacion, sinUbicacion: p.sinUbicacion, orden: p.tipo === 'inicio' ? 0 : 2 })
  }
  for (const f of fotos) {
    lista.push({ id: f.id, tipo: 'foto', t: f.t, ubicacion: f.ubicacion, sinUbicacion: f.sinUbicacion, codigo: f.codigo, orden: 1 })
  }
  // El inicio siempre primero y el fin siempre al final; entre medio, por hora.
  lista.sort((a, b) => (a.orden === 1 && b.orden === 1 ? a.t - b.t : a.orden - b.orden))
  let n = 0
  return lista.map(({ orden: _orden, ...p }) => {
    void _orden
    if (p.tipo === 'foto') n++
    const etiqueta = p.tipo === 'inicio' ? 'Inicio' : p.tipo === 'fin' ? 'Fin' : `Foto ${n}`
    return { ...p, etiqueta, lugar: lugarDeFoto({ ubicacion: p.ubicacion, sinUbicacion: p.sinUbicacion, t: p.t }) }
  })
}

/** Posiciones de los puntos que tienen ubicación (para el mapa). Nunca se escriben como texto. */
export function posicionesDe(lista: readonly PuntoLista[]): Array<{ id: string; tipo: TipoPuntoLista; etiqueta: string; pos: LatLng; demo: boolean }> {
  return lista.flatMap((p) => (p.ubicacion ? [{ id: p.id, tipo: p.tipo, etiqueta: p.etiqueta, pos: p.ubicacion.pos, demo: !!p.ubicacion.demo }] : []))
}

/**
 * La hora del último control: el inicio, el momento en que recogió al perro o la última foto (la más nueva).
 * null si el paseo todavía no empezó.
 */
export function ultimoControl(paseo: Paseo | null, puntos: readonly PuntoControl[] | undefined, fotos: readonly FotoPaseo[]): number | null {
  const horas: number[] = []
  const recogio = paseo ? horaDe(paseo, 'recoger') : null
  if (recogio !== null) horas.push(recogio)
  const inicio = puntos?.find((p) => p.tipo === 'inicio')
  if (inicio) horas.push(inicio.t)
  for (const f of fotos) horas.push(f.t)
  return horas.length ? Math.max(...horas) : null
}

/** Minutos que pasaron desde `desde` (0 si todavía no pasó nada). */
export function minutosDesde(ahora: number, desde: number): number {
  return Math.max(0, Math.floor((ahora - desde) / 60_000))
}

/** ¿Toca el recordatorio suave? Pasaron `minutos` o más desde el último control. */
export function tocaFotoDeControl(ultimo: number | null, ahora: number, minutos: number = CONFIG.minutosPuntoControl): boolean {
  return ultimo !== null && ahora - ultimo >= minutos * 60_000
}

/** Minutos que faltan para el próximo control (0 si ya toca). null si el paseo no empezó. */
export function minutosParaControl(ultimo: number | null, ahora: number, minutos: number = CONFIG.minutosPuntoControl): number | null {
  if (ultimo === null) return null
  return Math.max(0, minutos - minutosDesde(ahora, ultimo))
}

/**
 * Puntos INVENTADOS para el paseo de ejemplo (demostración): salen del guion del paseo, no de ningún teléfono.
 * `fotosAt` son los avances (0 a 1) en que el guion «saca» una foto. Cada punto lleva la marca de demostración.
 */
export function puntosDeDemostracion(opts: {
  empezo: boolean
  llego: boolean
  fotosAt: readonly number[]
  /** La hora del guion para un avance (por ejemplo «10:38 am»). */
  hora: (avance: number) => string
}): PuntoLista[] {
  const punto = (id: string, tipo: TipoPuntoLista, etiqueta: string, avance: number): PuntoLista => {
    const ubicacion: UbicacionDeFoto = { pos: pointAt(avance), lecturaT: 0, demo: true }
    return { id, tipo, etiqueta, t: 0, ubicacion, hora: opts.hora(avance), lugar: lugarDeFoto({ ubicacion, t: 0 }) }
  }
  if (!opts.empezo) return []
  const lista: PuntoLista[] = [punto('demo-inicio', 'inicio', 'Inicio', 0)]
  opts.fotosAt.forEach((f, i) => lista.push(punto(`demo-foto-${i + 1}`, 'foto', `Foto ${i + 1}`, f)))
  if (opts.llego) lista.push(punto('demo-fin', 'fin', 'Fin', 1))
  return lista
}
