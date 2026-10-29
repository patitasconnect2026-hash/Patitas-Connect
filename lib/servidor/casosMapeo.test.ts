import { describe, expect, it } from 'vitest'
import type { Caso } from '../casos'
import { cambioParaLaBase, casoDeFila, casosDeFilas, filaDeCaso, reporteDeCaso } from './casosMapeo'

const caso = (extra: Partial<Caso> = {}): Caso => ({
  id: 'disputa-p-1',
  jobId: 'p-1',
  tipo: 'disputa',
  reporte: { quien: 'dueno', motivo: 'trato', texto: 'Llegó tarde.', at: 1_760_000_000_000, foto: 'data:image/jpeg;base64,AAAA' },
  perro: 'Max',
  paseador: 'Lucía',
  dueno: 'Valeria',
  estadoPaseo: 'en_disputa',
  pagoEstado: 'sin_pagar',
  monto: 22,
  registro: [{ accion: 'reportar', de: 'en_paseo', a: 'en_disputa', quien: 'dueno', at: 1_760_000_000_000 }],
  abiertoAt: 1_760_000_000_000,
  ...extra,
})

describe('filaDeCaso', () => {
  it('lleva el caso entero menos la foto del reporte', () => {
    const f = filaDeCaso(caso())
    expect(f).toMatchObject({ id: 'disputa-p-1', paseo_id: 'p-1', tipo: 'disputa', perro: 'Max', estado_paseo: 'en_disputa', pago_estado: 'sin_pagar', monto: 22, resolucion: null, resuelto_en: null })
    expect(f.reporte).toEqual({ quien: 'dueno', motivo: 'trato', texto: 'Llegó tarde.', at: 1_760_000_000_000 })
    expect(JSON.stringify(f)).not.toContain('base64')
    expect(f.abierto_en).toBe(new Date(1_760_000_000_000).toISOString())
  })
  it('una resolución viaja con su hora', () => {
    const f = filaDeCaso(caso({ resolucion: { como: 'cancelado', nota: 'Se anuló.', at: 1_760_000_100_000 } }))
    expect(f.resolucion).toEqual({ como: 'cancelado', nota: 'Se anuló.', at: 1_760_000_100_000 })
    expect(f.resuelto_en).toBe(new Date(1_760_000_100_000).toISOString())
  })
  it('un monto que no es número no se manda', () => {
    expect(filaDeCaso(caso({ monto: Number.NaN })).monto).toBeNull()
  })
})

describe('casoDeFila', () => {
  it('va y vuelve (menos la foto)', () => {
    const original = caso()
    const vuelta = casoDeFila({ ...filaDeCaso(original) })!
    expect(vuelta).toMatchObject({ id: original.id, jobId: 'p-1', tipo: 'disputa', perro: 'Max', estadoPaseo: 'en_disputa', pagoEstado: 'sin_pagar', monto: 22, abiertoAt: original.abiertoAt })
    expect(vuelta.reporte).toEqual(reporteDeCaso(original.reporte!))
    expect(vuelta.registro).toHaveLength(1)
  })
  it('el monto numérico de la base llega como texto: se lee igual', () => {
    expect(casoDeFila({ ...filaDeCaso(caso()), monto: '17.60' })!.monto).toBe(17.6)
  })
  it('una fila sin tipo, sin paseo o sin hora no sirve', () => {
    const f = { ...filaDeCaso(caso()) }
    expect(casoDeFila({ ...f, tipo: 'inventado' })).toBeNull()
    expect(casoDeFila({ ...f, paseo_id: '' })).toBeNull()
    expect(casoDeFila({ ...f, abierto_en: 'ayer' })).toBeNull()
  })
  it('un estado raro no rompe: el paseo queda «en disputa» y el pago «sin registro»', () => {
    const c = casoDeFila({ ...filaDeCaso(caso()), estado_paseo: 'raro', pago_estado: 'raro' })!
    expect(c.estadoPaseo).toBe('en_disputa')
    expect(c.pagoEstado).toBe('sin_registro')
  })
  it('una resolución de la base se lee con su nota', () => {
    const c = casoDeFila({ ...filaDeCaso(caso()), resolucion: { como: 'cerrado', nota: 'Listo.', at: 5 }, resuelto_en: new Date(5).toISOString() })!
    expect(c.resolucion).toEqual({ como: 'cerrado', nota: 'Listo.', at: 5 })
  })
  it('casosDeFilas deja los más viejos primero y descarta lo que no sirve', () => {
    const a = { ...filaDeCaso(caso({ id: 'pago-p-2', jobId: 'p-2', tipo: 'pago', abiertoAt: 2000 })) }
    const b = { ...filaDeCaso(caso({ abiertoAt: 1000 })) }
    expect(casosDeFilas([a, { id: '' }, b]).map((c) => c.id)).toEqual(['disputa-p-1', 'pago-p-2'])
  })
})

describe('cambioParaLaBase', () => {
  const enBase = caso({ reporte: undefined })
  it('un caso igual no manda nada', () => expect(cambioParaLaBase(enBase, enBase)).toBeNull())
  it('el reporte que la base no tiene se suma', () => {
    expect(cambioParaLaBase(caso(), enBase)).toEqual({ reporte: reporteDeCaso(caso().reporte!) })
  })
  it('la resolución del equipo se manda con su hora', () => {
    const resuelto = caso({ resolucion: { como: 'cerrado', nota: 'ok', at: 9000 } })
    expect(cambioParaLaBase(resuelto, caso())).toEqual({ resolucion: resuelto.resolucion, resuelto_en: new Date(9000).toISOString() })
  })
  it('lo que la base ya resolvió no se vuelve a tocar', () => {
    const yaResuelto = caso({ resolucion: { como: 'cancelado', nota: 'antes', at: 1 } })
    expect(cambioParaLaBase(caso({ resolucion: { como: 'cerrado', nota: 'después', at: 2 } }), yaResuelto)).toBeNull()
  })
})
