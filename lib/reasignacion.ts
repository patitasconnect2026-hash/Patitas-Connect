/**
 * Reasignación (Tarea 9): cuando el paseador rechaza, no contesta a tiempo o cancela, la familia ve hasta 3 paseadores
 * compatibles y elige a mano. NO es automática y no avisa a nadie. Funciones puras.
 */
import { isBookable, slotInfo, walkerFits } from './schedule'
import type { Paseo } from './paseo'
import type { Dog, Walker } from './types'

export const MAX_REASIGNACION = 3

/** ¿El paseo quedó sin paseador por culpa del paseador (rechazó, venció o él canceló)? Si canceló la familia, no. */
export function necesitaReasignacion(p: Paseo | null | undefined): boolean {
  if (!p) return false
  if (p.estado === 'rechazado' || p.estado === 'expirado') return true
  if (p.estado !== 'cancelado') return false
  const ultima = [...p.eventos].reverse().find((e) => e.accion === 'cancelar')
  return ultima?.quien === 'paseador'
}

/**
 * Hasta `max` paseadores que aceptan el tamaño del perro y tienen ese horario libre (o con cupo). Nunca el que dejó
 * el paseo. Orden: mejor calificación primero.
 */
export function paseadoresCompatibles(o: {
  walkers: readonly Walker[]
  dog: Dog
  dayIdx: number
  hour: number
  excluirId: string
  max?: number
}): Walker[] {
  const max = o.max ?? MAX_REASIGNACION
  return o.walkers
    .filter((w) => w.id !== o.excluirId && walkerFits(w, o.dog) && isBookable(slotInfo(w, o.dayIdx, o.hour, o.dog).state))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, max)
}
