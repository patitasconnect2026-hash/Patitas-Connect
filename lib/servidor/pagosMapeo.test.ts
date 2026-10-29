import { describe, expect, it } from 'vitest'
import { cobrosDeFilas, filaDeCobro, mismoCobro, pagoDeFila, pagosDeFilas } from './pagosMapeo'

const paseo = { id: 'p-1', paseador_nombre: 'Lucía', dueno_nombre: 'Valeria', horario: 'Hoy · 10:00 am', perro: { name: 'Max', size: 'large' } }
const fila = {
  paseo_id: 'p-1',
  familia_id: 'aaaaaaaa-0000-4000-8000-000000000001',
  paseador_id: 'bbbbbbbb-0000-4000-8000-000000000001',
  monto: 22,
  comision: 4.4,
  neto: 17.6,
  estado: 'sin_pagar',
  paseo_estado: 'entregado',
  hecho_en: '2026-10-14T15:00:00.000Z',
  visto_en: null,
  hora_pago: null,
  no_encontrado_en: null,
  pagado_paseador_en: null,
  nota: null,
  demo: false,
  creado_en: '2026-10-14T14:00:00.000Z',
}

describe('un pago de la base, en lo que la app entiende', () => {
  it('une la fila con los nombres de su paseo y pasa las horas a milisegundos', () => {
    const p = pagoDeFila(fila, paseo)!
    expect(p).toMatchObject({ id: 'p-1', walkerId: fila.paseador_id, paseador: 'Lucía', dueno: 'Valeria', perro: 'Max', cuando: 'Hoy · 10:00 am', monto: 22, comision: 4.4, neto: 17.6, estado: 'sin_pagar', paseo: 'entregado' })
    expect(p.hechoAt).toBe(Date.parse('2026-10-14T15:00:00.000Z'))
    expect(p.creado).toBe(Date.parse('2026-10-14T14:00:00.000Z'))
    expect(p.vistoAt).toBeUndefined()
    expect(p.demo).toBeUndefined()
  })

  it('sin el paseo a mano igual se entiende (los nombres quedan vacíos)', () => {
    expect(pagoDeFila(fila)).toMatchObject({ id: 'p-1', paseador: '', dueno: '', perro: '', cuando: '' })
  })

  it('los montos pueden llegar como texto (numeric) y se leen igual', () => {
    expect(pagoDeFila({ ...fila, monto: '22.00', comision: '4.40', neto: '17.60' }, paseo)).toMatchObject({ monto: 22, comision: 4.4, neto: 17.6 })
  })

  it('«visto», «no encontrado» y «pagado» traen sus horas, la nota y la hora anotada', () => {
    const visto = pagoDeFila({ ...fila, estado: 'visto', visto_en: '2026-10-14T15:30:00.000Z', hora_pago: '10:45' }, paseo)!
    expect(visto).toMatchObject({ estado: 'visto', horaPago: '10:45' })
    expect(visto.vistoAt).toBe(Date.parse('2026-10-14T15:30:00.000Z'))
    const perdido = pagoDeFila({ ...fila, estado: 'no_encontrado', visto_en: '2026-10-14T15:30:00.000Z', no_encontrado_en: '2026-10-14T16:00:00.000Z', nota: 'No aparece' }, paseo)!
    expect(perdido).toMatchObject({ estado: 'no_encontrado', nota: 'No aparece' })
    const pagado = pagoDeFila({ ...fila, estado: 'pagado_paseador', visto_en: '2026-10-14T15:30:00.000Z', pagado_paseador_en: '2026-10-14T17:00:00.000Z' }, paseo)!
    expect(pagado.estado).toBe('pagado_paseador')
    expect(pagado.pagadoPaseadorAt).toBe(Date.parse('2026-10-14T17:00:00.000Z'))
  })

  it('una fila que no se entiende se descarta (nunca lanza)', () => {
    expect(pagoDeFila({ ...fila, paseo_id: '' }, paseo)).toBeNull()
    expect(pagoDeFila({ ...fila, monto: null }, paseo)).toBeNull()
    expect(pagoDeFila({ ...fila, paseo_estado: 'inventado' }, paseo)).toBeNull()
    expect(pagosDeFilas([fila, { ...fila, paseo_id: '' }, { x: 1 }], [paseo]).map((p) => p.id)).toEqual(['p-1'])
  })

  it('un estado raro del pago se lee como «sin pagar», nunca como pagado', () => {
    expect(pagoDeFila({ ...fila, estado: 'inventado' }, paseo)?.estado).toBe('sin_pagar')
  })
})

describe('dónde cobra el paseador', () => {
  it('lee solo filas completas y las guarda por id', () => {
    const mapa = cobrosDeFilas([
      { paseador_id: 'a', metodo: 'yape', celular: '987654321', titular: 'Ana Rojas' },
      { paseador_id: 'b', metodo: 'efectivo', celular: '987654321', titular: 'Beto' },
      { paseador_id: 'c', metodo: 'plin', celular: '', titular: 'Cora' },
    ])
    expect(Object.keys(mapa)).toEqual(['a'])
    expect(mapa.a).toEqual({ metodo: 'yape', telefono: '987654321', titular: 'Ana Rojas' })
  })

  it('arma la fila de la base solo si lo escrito está completo, con el celular ya normalizado', () => {
    expect(filaDeCobro({ metodo: 'plin', telefono: '987 654 321', titular: ' Ana Rojas ' }, 'id-1')).toEqual({ paseador_id: 'id-1', metodo: 'plin', celular: '+51987654321', titular: 'Ana Rojas' })
    expect(filaDeCobro({ metodo: '', telefono: '987654321', titular: 'Ana' }, 'id-1')).toBeNull()
    expect(filaDeCobro({ metodo: 'yape', telefono: '123', titular: 'Ana Rojas' }, 'id-1')).toBeNull()
    expect(filaDeCobro({ metodo: 'yape', telefono: '987654321', titular: '  ' }, 'id-1')).toBeNull()
    expect(filaDeCobro(undefined, 'id-1')).toBeNull()
  })

  it('«es lo mismo» ignora espacios y el +51, para no volver a subir lo que la base ya tiene', () => {
    const a = { metodo: 'yape' as const, telefono: '987 654 321', titular: 'Ana Rojas' }
    expect(mismoCobro(a, { metodo: 'yape', telefono: '+51987654321', titular: 'Ana Rojas ' })).toBe(true)
    expect(mismoCobro(a, { metodo: 'plin', telefono: '987654321', titular: 'Ana Rojas' })).toBe(false)
    expect(mismoCobro(a, undefined)).toBe(false)
  })
})
