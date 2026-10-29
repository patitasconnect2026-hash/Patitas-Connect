/**
 * Los textos del estado del paseo, escritos una sola vez. Dueño, paseador y /admin leen de aquí.
 * Reglas: título de 5 palabras o menos y línea de apoyo de 12 o menos (lib/paseoTextos.test.ts lo comprueba).
 */
import type { EstadoPaseo, Paseo } from './paseo'

export interface Nombres {
  /** Nombre de pila del paseador. */
  paseador: string
  perro: string
  /** Nombre de pila del dueño. */
  dueno: string
}

export type Vista = 'dueno' | 'paseador'

export interface TextoEstado {
  titulo: string
  apoyo: string
}

/**
 * `reporto` (solo en disputa): quién hizo el reporte. Quien lo hizo lee «Reporte enviado»; la otra persona,
 * «Reporte recibido» y quién reportó.
 */
export function textosPaseo(estado: EstadoPaseo, vista: Vista, n: Nombres, reporto?: Vista): TextoEstado {
  const d = vista === 'dueno'
  if (estado === 'en_disputa' && reporto && reporto !== vista) {
    return { titulo: 'Reporte recibido', apoyo: `${d ? n.paseador : n.dueno} reportó un problema. El equipo lo revisa a mano.` }
  }
  switch (estado) {
    case 'solicitado':
      return d
        ? { titulo: 'Solicitud enviada', apoyo: `Falta que ${n.paseador} acepte.` }
        : { titulo: 'Solicitud nueva', apoyo: `${n.dueno} espera tu respuesta.` }
    case 'aceptado':
      return d
        ? { titulo: 'Paseo aceptado', apoyo: `Verás cuándo sale ${n.paseador}.` }
        : { titulo: 'Paseo aceptado', apoyo: 'Sal cuando estés listo.' }
    case 'en_camino':
      return d
        ? { titulo: `${n.paseador} va en camino`, apoyo: 'Ten listo el código de recojo.' }
        : { titulo: 'En camino', apoyo: `Pídele el código a ${n.dueno}.` }
    case 'en_paseo':
      return d
        ? { titulo: 'Paseo en curso', apoyo: `${n.perro} está paseando con ${n.paseador}.` }
        : { titulo: 'Paseo en curso', apoyo: `Avisos y fotos de ${n.perro} para ${n.dueno}.` }
    case 'entregado':
      return d
        ? { titulo: `${n.perro} ya llegó`, apoyo: 'Confirma que lo recibiste.' }
        : { titulo: 'Perro entregado', apoyo: `Esperando que ${n.dueno} confirme.` }
    case 'cerrado':
      return { titulo: 'Paseo cerrado', apoyo: 'Todo quedó registrado.' }
    case 'rechazado':
      return d
        ? { titulo: 'Solicitud rechazada', apoyo: `${n.paseador} no puede esta vez. Elige a otro.` }
        : { titulo: 'Rechazaste la solicitud', apoyo: 'No pasa nada: ya no aparece.' }
    case 'expirado':
      return d
        ? { titulo: 'Solicitud vencida', apoyo: `${n.paseador} no respondió a tiempo.` }
        : { titulo: 'Solicitud vencida', apoyo: 'Pasó el plazo para responder.' }
    case 'cancelado':
      return { titulo: 'Paseo cancelado', apoyo: 'El paseo no se hizo.' }
    case 'en_disputa':
      return { titulo: 'Reporte enviado', apoyo: 'El equipo lo revisa a mano, sin plazo fijo.' }
  }
}

/** Una palabra o dos, para listas y para /admin. */
export const ETIQUETA_ESTADO: Record<EstadoPaseo, string> = {
  solicitado: 'Solicitado',
  aceptado: 'Aceptado',
  rechazado: 'Rechazado',
  expirado: 'Vencido',
  en_camino: 'En camino',
  en_paseo: 'En paseo',
  entregado: 'Entregado',
  cerrado: 'Cerrado',
  cancelado: 'Cancelado',
  en_disputa: 'En disputa',
}

/** Los pasos de la barra de avance (el camino normal). */
export const PASOS: ReadonlyArray<{ id: EstadoPaseo; etiqueta: string }> = [
  { id: 'solicitado', etiqueta: 'Pedido' },
  { id: 'aceptado', etiqueta: 'Aceptado' },
  { id: 'en_camino', etiqueta: 'En camino' },
  { id: 'en_paseo', etiqueta: 'Paseando' },
  { id: 'entregado', etiqueta: 'Entregado' },
]

/** Cuántos pasos de la barra ya se alcanzaron (0 a 5), según el estado. */
export function pasosAlcanzados(estado: EstadoPaseo): number {
  if (estado === 'cerrado') return PASOS.length
  const i = PASOS.findIndex((p) => p.id === estado)
  return i === -1 ? 0 : i + 1
}

/**
 * Lo mismo, pero mirando el registro: en una disputa, o en un paseo cancelado a mitad de camino, la barra conserva
 * hasta dónde llegó el paseo (no se vacía).
 */
export function pasosDelPaseo(p: Paseo): number {
  if (p.estado === 'cerrado') return PASOS.length
  let max = 0
  for (const ev of p.eventos) max = Math.max(max, pasosAlcanzados(ev.a))
  return max
}
