import { describe, expect, it } from 'vitest'
import {
  acotar,
  alertaPerro,
  ATRIBUTOS_PASEADOR,
  ATRIBUTOS_PERRO,
  coincidencia,
  compararPerro,
  promedioPorAtributo,
  puntajeSugerido,
  rankingPaseador,
  tonoBarra,
  validarCalificacion,
  valoresIniciales,
} from './calificacionDetallada'

describe('barras de 0 a 100', () => {
  it('se acotan y redondean', () => {
    expect(acotar(-5)).toBe(0)
    expect(acotar(140)).toBe(100)
    expect(acotar(49.6)).toBe(50)
    expect(acotar(Number.NaN)).toBe(0)
  })
  it('empiezan en la mitad', () => {
    expect(Object.values(valoresIniciales(ATRIBUTOS_PERRO)).every((v) => v === 50)).toBe(true)
  })
  it('el tono depende de si más es mejor o peor', () => {
    const agresividad = ATRIBUTOS_PERRO.find((a) => a.id === 'agresividad')!
    const limpieza = ATRIBUTOS_PERRO.find((a) => a.id === 'limpieza')!
    const energia = ATRIBUTOS_PERRO.find((a) => a.id === 'energia')!
    expect(tonoBarra(agresividad, 80)).toBe('atencion')
    expect(tonoBarra(agresividad, 10)).toBe('bien')
    expect(tonoBarra(limpieza, 10)).toBe('atencion')
    expect(tonoBarra(energia, 100)).toBe('neutro')
  })
})

describe('lo que dice la familia contra lo que ve el paseador', () => {
  it('clasifica la distancia', () => {
    expect(coincidencia(10)).toBe('coincide')
    expect(coincidencia(20)).toBe('algo_distinto')
    expect(coincidencia(35)).toBe('no_coincide')
  })
  it('la familia dice «no agresivo» y el paseador ve 70: alerta urgente', () => {
    const difs = compararPerro({ agresividad: 5, fuerza: 20, limpieza: 90 }, { agresividad: 70, fuerza: 25, limpieza: 85 })
    expect(difs.find((d) => d.atributo.id === 'agresividad')!.coincidencia).toBe('no_coincide')
    const a = alertaPerro(difs)
    expect(a.nivel).toBe('urgente')
    expect(a.motivos[0]).toMatch(/Agresividad vista: 70/)
  })
  it('jala mucho más de lo dicho: revisar', () => {
    expect(alertaPerro(compararPerro({ fuerza: 10 }, { fuerza: 60 })).nivel).toBe('revisar')
  })
  it('si coincide, no hay alerta', () => {
    expect(alertaPerro(compararPerro({ agresividad: 10, fuerza: 30 }, { agresividad: 15, fuerza: 35 })).nivel).toBe('ninguna')
  })
})

describe('puntaje final 1 a 10, solo del paseador', () => {
  it('sugerido desde las barras', () => {
    expect(puntajeSugerido(Object.fromEntries(ATRIBUTOS_PASEADOR.map((a) => [a.id, 100])))).toBe(10)
    expect(puntajeSugerido(Object.fromEntries(ATRIBUTOS_PASEADOR.map((a) => [a.id, 0])))).toBe(1)
  })
  it('un solo puntaje no decide el ranking', () => {
    expect(rankingPaseador([])).toBeNull()
    expect(rankingPaseador([10])).toBe(8.5)
    expect(rankingPaseador([1])).toBe(6.3)
    expect(rankingPaseador(Array(50).fill(10))).toBeGreaterThan(9.8)
    expect(rankingPaseador([11, 0, 5.5])).toBeNull() // los inválidos no cuentan
    expect(rankingPaseador([11, 10])).toBe(8.5)
  })
  it('promedia por atributo', () => {
    expect(promedioPorAtributo([{ puntualidad: 100 }, { puntualidad: 50 }], ATRIBUTOS_PASEADOR)).toEqual({ puntualidad: 75 })
  })
  it('valida quién califica qué', () => {
    expect(validarCalificacion({ paseoId: 'p', quien: 'familia', paseador: { trato: 90 }, comentario: '' })).toMatch(/puntaje final/)
    expect(validarCalificacion({ paseoId: 'p', quien: 'familia', paseador: { trato: 90 }, puntajeFinal: 9, comentario: '' })).toBeNull()
    expect(validarCalificacion({ paseoId: 'p', quien: 'paseador', perro: { fuerza: 20 }, puntajeFinal: 9, comentario: '' })).toMatch(/solo para el paseador/)
    expect(validarCalificacion({ paseoId: 'p', quien: 'paseador', perro: { fuerza: 20 }, comentario: 'x'.repeat(401) })).toMatch(/400/)
  })
})
