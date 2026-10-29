import { describe, expect, it } from 'vitest'
import { DEMO_ACCOUNT, esCuentaDeEjemplo } from './data'
import { HOME_POINT } from './geo'
import { ESCENARIOS, lecturasDeEscenario, resumirEscenario, TEXTO_ESCENARIO, type EscenarioAviso } from './zonaDemo'
import { clasificarPunto } from './zona'

const AHORA = Date.UTC(2026, 9, 10, 16, 30, 0)

describe('escenarios de prueba de los avisos', () => {
  it('las horas van en orden y la última es «ahora»', () => {
    for (const e of ESCENARIOS) {
      const ls = lecturasDeEscenario(e, AHORA)
      expect(ls.length, e).toBeGreaterThan(2)
      expect(ls[ls.length - 1].t, e).toBe(AHORA)
      for (let i = 1; i < ls.length; i++) expect(ls[i].t, e).toBeGreaterThan(ls[i - 1].t)
    }
  })

  it('«borde»: un aviso suave y nada más', () => {
    expect(resumirEscenario('borde').avisos).toEqual(['borde'])
  })

  it('«salida»: pasa de dentro al margen y a «fuera», con dos lecturas fuera seguidas, y vuelve', () => {
    const clases = lecturasDeEscenario('salida', AHORA).map((l) => clasificarPunto(l.pos))
    expect(clases[0]).toBe('dentro')
    expect(clases.filter((c) => c === 'fuera').length).toBeGreaterThanOrEqual(2)
    const primeraFuera = clases.indexOf('fuera')
    expect(clases[primeraFuera + 1]).toBe('fuera')
    expect(clases[clases.length - 1]).not.toBe('fuera')
    expect(resumirEscenario('salida').avisos).toEqual(['borde', 'salida', 'regreso', 'borde'])
  })

  it('«salto»: se descarta el salto y se avisa una vez', () => {
    const r = resumirEscenario('salto')
    expect(r.avisos).toEqual(['salto'])
    expect(r.saltosDescartados).toBe(1)
  })

  it('«quieto»: avisa a los 10 minutos', () => {
    expect(resumirEscenario('quieto').avisos).toEqual(['quieto'])
  })

  it('«imprecisas»: se ignoran y no avisan nada', () => {
    const r = resumirEscenario('imprecisas')
    expect(r.avisos).toEqual([])
    expect(r.ignoradasPorPrecision).toBe(3)
  })

  it('desde otra casa también funciona (las posiciones salen de la casa que se pida)', () => {
    const otra: [number, number] = [-12.0782, -77.0464] // el centro de Jesús María
    for (const e of ESCENARIOS) {
      const r = resumirEscenario(e as EscenarioAviso, otra)
      expect(r.lecturas, e).toBeGreaterThan(2)
    }
    expect(resumirEscenario('salida', otra).avisos).toContain('salida')
    expect(HOME_POINT).toBeDefined()
  })

  it('cada escenario tiene su texto corto', () => {
    for (const e of ESCENARIOS) {
      expect(TEXTO_ESCENARIO[e].boton.split(/\s+/).length, e).toBeLessThanOrEqual(3)
    }
  })
})

describe('quién puede probar los avisos', () => {
  it('la cuenta de demostración sí', () => {
    expect(esCuentaDeEjemplo(DEMO_ACCOUNT)).toBe(true)
    // lo que sale de guardarla y leerla
    expect(esCuentaDeEjemplo(JSON.parse(JSON.stringify(DEMO_ACCOUNT)))).toBe(true)
  })

  it('una cuenta de una familia real no, ni la falta de cuenta', () => {
    expect(esCuentaDeEjemplo({ ...DEMO_ACCOUNT, firstName: 'Lucía', phone: '912 345 678', createdAt: '2026-10-10' })).toBe(false)
    expect(esCuentaDeEjemplo(null)).toBe(false)
  })
})
