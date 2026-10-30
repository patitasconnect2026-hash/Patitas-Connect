import { describe, expect, it } from 'vitest'
import { CONFIG } from './config'
import { condicionesDeducidas, puedePasear, quienPaga, reglasCuidado, textoAutorizacion } from './cuidadoEspecial'

describe('perros frágiles', () => {
  it('deduce condiciones de la raza y la edad', () => {
    expect(condicionesDeducidas({ breed: 'Bulldog Francés', ageYears: 9 })).toEqual(['senior', 'braquicefalo'])
    expect(condicionesDeducidas({ breed: 'Mestizo', ageYears: 0.3 })).toEqual(['cachorro'])
    expect(condicionesDeducidas({ breed: 'Labrador', ageYears: 3 })).toEqual([])
  })
  it('reglas más estrictas para los frágiles', () => {
    const r = reglasCuidado(['braquicefalo', 'senior'])
    expect(r.especial).toBe(true)
    expect(r.maxMinutos).toBe(30)
    expect(r.evitarMediodia).toBe(true)
    expect(r.nivelMinimo).toBe('pro')
    expect(reglasCuidado([]).especial).toBe(false)
    expect(reglasCuidado(['postoperatorio']).soloIndividual).toBe(true)
  })
  it('un paseador Nuevo no lleva perros de cuidado especial de nivel Pro', () => {
    expect(puedePasear('nuevo', reglasCuidado(['alto_valor']))).toBe(false)
    expect(puedePasear('pro', reglasCuidado(['alto_valor']))).toBe(true)
    expect(puedePasear('nuevo', reglasCuidado(['senior']))).toBe(true)
  })
})

describe('quién paga la veterinaria', () => {
  it('condición previa o ficha falsa: la familia', () => {
    expect(quienPaga({ causa: 'condicion_previa', monto: 400, reportadoATiempo: true }).familia).toBe(400)
    expect(quienPaga({ causa: 'ficha_falsa', monto: 400, reportadoATiempo: true }).paga).toBe('familia')
  })
  it('falta del paseador: el paseador', () => {
    expect(quienPaga({ causa: 'falta_del_paseador', monto: 400, reportadoATiempo: true }).paseador).toBe(400)
  })
  it('accidente sin culpa: el fondo hasta su tope y la familia el resto; fuera de plazo no cubre', () => {
    const r = quienPaga({ causa: 'accidente', monto: 400, reportadoATiempo: true })
    expect(r.fondo).toBe(CONFIG.fondoCuidado.topePorCaso)
    expect(r.fondo + r.familia).toBe(400)
    expect(quienPaga({ causa: 'accidente', monto: 400, reportadoATiempo: false }).fondo).toBe(0)
  })
  it('la autorización dice el tope', () => {
    expect(textoAutorizacion(0, '')).toMatch(/te llama primero/)
    expect(textoAutorizacion(200, 'Vet Sur')).toMatch(/Vet Sur.*200/)
  })
})
