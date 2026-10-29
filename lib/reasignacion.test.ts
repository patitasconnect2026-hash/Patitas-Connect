import { describe, expect, it } from 'vitest'
import { MAX_REASIGNACION, necesitaReasignacion, paseadoresCompatibles } from './reasignacion'
import { DEMO_DOGS, WALKERS } from './data'
import { isBookable, slotInfo, walkerFits } from './schedule'
import { aplicar, nuevoPaseo } from './paseo'
import type { Walker } from './types'

const T0 = Date.UTC(2026, 9, 10, 15, 0, 0)
const dog = DEMO_DOGS[0]

/** Un día y hora en los que al menos `n` paseadores de ejemplo están libres para el perro. */
function horarioConLibres(n: number): { dayIdx: number; hour: number } {
  for (let d = 1; d < 7; d++)
    for (let h = 6; h < 21; h++) {
      const libres = WALKERS.filter((w) => walkerFits(w, dog) && isBookable(slotInfo(w, d, h, dog).state))
      if (libres.length >= n) return { dayIdx: d, hour: h }
    }
  throw new Error('sin horario de prueba')
}

describe('reasignación: quién necesita que se le busque otro paseador', () => {
  it('rechazó, venció o canceló el paseador: sí', () => {
    const rechazado = aplicar(nuevoPaseo(T0), 'rechazar', 'paseador', T0 + 1)
    const vencido = aplicar(nuevoPaseo(T0), 'expirar', 'sistema', T0 + 1)
    const cancelado = aplicar(aplicar(nuevoPaseo(T0), 'aceptar', 'paseador', T0 + 1), 'cancelar', 'paseador', T0 + 2)
    expect([rechazado, vencido, cancelado].map(necesitaReasignacion)).toEqual([true, true, true])
  })
  it('canceló la familia, o el paseo sigue o terminó: no', () => {
    const familia = aplicar(nuevoPaseo(T0), 'cancelar', 'dueno', T0 + 1)
    expect(necesitaReasignacion(familia)).toBe(false)
    expect(necesitaReasignacion(nuevoPaseo(T0))).toBe(false)
    expect(necesitaReasignacion(aplicar(nuevoPaseo(T0), 'aceptar', 'paseador', T0 + 1))).toBe(false)
    expect(necesitaReasignacion(null)).toBe(false)
  })
})

describe('paseadores compatibles', () => {
  const { dayIdx, hour } = horarioConLibres(2)
  const base = { walkers: WALKERS, dog, dayIdx, hour, excluirId: '' }

  it('como mucho 3, aunque haya más', () => {
    expect(paseadoresCompatibles(base).length).toBeLessThanOrEqual(MAX_REASIGNACION)
    const muchos: Walker[] = Array.from({ length: 6 }, (_, i) => ({ ...WALKERS[0], id: `w${i}`, rating: 4 + i / 10 }))
    const libres = muchos.filter((w) => isBookable(slotInfo(w, dayIdx, hour, dog).state))
    expect(paseadoresCompatibles({ ...base, walkers: muchos }).length).toBe(Math.min(3, libres.length))
  })

  it('nunca el que rechazó, venció o canceló', () => {
    const todos = paseadoresCompatibles({ ...base, max: 99 })
    expect(todos.length).toBeGreaterThan(0)
    const fuera = todos[0].id
    expect(paseadoresCompatibles({ ...base, max: 99, excluirId: fuera }).some((w) => w.id === fuera)).toBe(false)
  })

  it('nunca uno sin horario libre ni que no acepta el tamaño', () => {
    for (const w of paseadoresCompatibles({ ...base, max: 99 })) {
      expect(isBookable(slotInfo(w, dayIdx, hour, dog).state)).toBe(true)
      expect(walkerFits(w, dog)).toBe(true)
    }
    const noAcepta: Walker = { ...WALKERS[0], id: 'x', accepts: [] as Walker['accepts'] }
    expect(paseadoresCompatibles({ ...base, walkers: [noAcepta] })).toEqual([])
  })

  it('cero compatibles: lista vacía (también a una hora en la que nadie trabaja)', () => {
    expect(paseadoresCompatibles({ ...base, walkers: [] })).toEqual([])
    expect(paseadoresCompatibles({ ...base, hour: 3 })).toEqual([])
  })

  it('el de mejor calificación va primero', () => {
    const r = paseadoresCompatibles({ ...base, max: 99 })
    expect(r.map((w) => w.rating)).toEqual([...r.map((w) => w.rating)].sort((a, b) => b - a))
  })
})
