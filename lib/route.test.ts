import { describe, expect, it } from 'vitest'
import { WALK_ROUTE } from './geo'
import { haversine, pointAt } from './route'

describe('haversine', () => {
  it('da 0 metros entre el mismo punto', () => {
    expect(haversine([-12.1, -77.03], [-12.1, -77.03])).toBe(0)
  })
  it('un grado de latitud son unos 111 km', () => {
    const m = haversine([0, 0], [1, 0])
    expect(m).toBeGreaterThan(111_000)
    expect(m).toBeLessThan(111_400)
  })
})

describe('pointAt', () => {
  it('empieza en el primer punto y termina en el último', () => {
    expect(pointAt(0)).toEqual(WALK_ROUTE[0])
    expect(pointAt(1)).toEqual(WALK_ROUTE[WALK_ROUTE.length - 1])
  })
  it('no se sale de la ruta con progreso fuera de rango', () => {
    expect(pointAt(-5)).toEqual(WALK_ROUTE[0])
    expect(pointAt(5)).toEqual(WALK_ROUTE[WALK_ROUTE.length - 1])
  })
})
