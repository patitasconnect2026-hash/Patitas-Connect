import { describe, expect, it } from 'vitest'
import { calcular, ESCENARIOS } from './ganancias'

describe('modelo de ganancias', () => {
  it('las mezclas de niveles suman 1', () => {
    for (const s of ESCENARIOS) {
      const m = s.mezclaNiveles
      expect(m.nuevo + m.pro + m.elite).toBeCloseTo(1, 6)
    }
  })
  it('las cuentas cierran y la comisión promedio queda entre 10 y 20', () => {
    for (const s of ESCENARIOS) {
      const r = calcular(s)
      expect(r.comisionPromedioPct).toBeGreaterThanOrEqual(10)
      expect(r.comisionPromedioPct).toBeLessThanOrEqual(20)
      expect(r.ingresoTotal).toBeCloseTo(r.ingresoComision + r.ingresoMembresias + r.ingresoDestacados, 1)
      expect(r.gananciaMes).toBeCloseTo(r.ingresoTotal - r.costoFondo - r.costoBonos - r.costoPasarela - r.gastosFijos, 1)
      expect(r.gananciaAnio).toBeCloseTo(r.gananciaMes * 12, 1)
    }
  })
  it('cada escenario es más grande que el anterior', () => {
    const [a, b, c] = ESCENARIOS.map((s) => calcular(s))
    expect(b.ingresoTotal).toBeGreaterThan(a.ingresoTotal)
    expect(c.ingresoTotal).toBeGreaterThan(b.ingresoTotal)
  })
})
