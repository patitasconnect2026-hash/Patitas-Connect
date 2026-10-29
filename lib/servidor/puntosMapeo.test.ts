import { describe, expect, it } from 'vitest'
import { CONFIG } from '../config'
import type { PuntoControl } from '../puntosControl'
import { filaDePunto, idDePunto, mezclarPuntos, puntoDeFila, puntosDeFilas, puntosPorSubir } from './puntosMapeo'

const T = Date.UTC(2026, 9, 14, 15, 0, 0)
const inicio = (p: Partial<PuntoControl> = {}): PuntoControl => ({ tipo: 'inicio', t: T, ubicacion: { pos: [-12.1, -77.03], lecturaT: T - 20_000 }, ...p })
const fin = (p: Partial<PuntoControl> = {}): PuntoControl => ({ tipo: 'fin', t: T + 3_600_000, ubicacion: null, sinUbicacion: 'negada', ...p })

describe('el inicio y el fin del paseo, a la fila de la base', () => {
  it('el id sale siempre igual del paseo y el tipo (guardar dos veces el mismo punto no lo duplica)', () => {
    expect(idDePunto('p-1', 'inicio')).toBe(idDePunto('p-1', 'inicio'))
    expect(idDePunto('p-1', 'inicio')).not.toBe(idDePunto('p-1', 'fin'))
    expect(idDePunto('p-1', 'inicio')).not.toBe(idDePunto('p-2', 'inicio'))
    expect(idDePunto('p-1', 'fin')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('con ubicación: hora, lat y lng; sin motivo', () => {
    expect(filaDePunto('p-1', inicio())).toEqual({ id: idDePunto('p-1', 'inicio'), paseo_id: 'p-1', tipo: 'inicio', en: new Date(T).toISOString(), lat: -12.1, lng: -77.03, precision_m: null, sin_ubicacion: null })
  })

  it('sin ubicación: se anota el motivo, como hoy', () => {
    expect(filaDePunto('p-1', fin())).toMatchObject({ tipo: 'fin', lat: null, lng: null, sin_ubicacion: 'negada' })
    expect(filaDePunto('p-1', fin({ sinUbicacion: undefined }))).toMatchObject({ sin_ubicacion: 'sin_lectura' })
  })

  it('una lectura vieja o de demostración no sube como lugar del punto', () => {
    const vieja = inicio({ ubicacion: { pos: [-12.1, -77.03], lecturaT: T - (CONFIG.minutosUbicacionVieja + 1) * 60_000 } })
    expect(filaDePunto('p-1', vieja)).toMatchObject({ lat: null, lng: null, sin_ubicacion: 'sin_lectura' })
    const demo = inicio({ ubicacion: { pos: [-12.1, -77.03], lecturaT: T, demo: true } })
    expect(filaDePunto('p-1', demo)).toMatchObject({ lat: null, lng: null, sin_ubicacion: 'sin_lectura' })
  })

  it('la fila no lleva nada más que lo del punto (nada de recorrido ni de «última lectura»)', () => {
    expect(Object.keys(filaDePunto('p-1', inicio())).sort()).toEqual(['en', 'id', 'lat', 'lng', 'paseo_id', 'precision_m', 'sin_ubicacion', 'tipo'])
  })
})

describe('de la base a la app', () => {
  const fila = { id: idDePunto('p-1', 'inicio'), paseo_id: 'p-1', tipo: 'inicio', en: new Date(T).toISOString(), lat: -12.1, lng: -77.03, precision_m: null, sin_ubicacion: null }

  it('un punto con lugar y uno sin él', () => {
    expect(puntoDeFila(fila)).toEqual({ paseoId: 'p-1', punto: { tipo: 'inicio', t: T, ubicacion: { pos: [-12.1, -77.03], lecturaT: T } } })
    expect(puntoDeFila({ ...fila, tipo: 'fin', lat: null, lng: null, sin_ubicacion: 'omitida' })?.punto).toEqual({ tipo: 'fin', t: T, ubicacion: null, sinUbicacion: 'omitida' })
    expect(puntoDeFila({ ...fila, lat: null, lng: null, sin_ubicacion: null })?.punto.sinUbicacion).toBe('sin_lectura')
  })

  it('lo que no se entiende se descarta (nunca lanza)', () => {
    expect(puntoDeFila({ ...fila, tipo: 'foto' })).toBeNull()
    expect(puntoDeFila({ ...fila, en: 'ayer' })).toBeNull()
    expect(puntoDeFila({ ...fila, paseo_id: '' })).toBeNull()
    expect(puntosDeFilas([fila, { x: 1 }, { ...fila, tipo: 'foto' }]).get('p-1')).toHaveLength(1)
  })

  it('por paseo y uno por tipo: si la base tuviera dos inicios, vale el primero', () => {
    const mapa = puntosDeFilas([fila, { ...fila, id: 'otro', en: new Date(T + 5000).toISOString() }, { ...fila, paseo_id: 'p-2' }])
    expect(mapa.get('p-1')).toHaveLength(1)
    expect(mapa.get('p-1')?.[0].t).toBe(T)
    expect(mapa.get('p-2')).toHaveLength(1)
  })
})

describe('mezclar y enviar', () => {
  it('manda el del teléfono; lo que solo tiene la base se suma; siempre inicio y fin en ese orden', () => {
    const local = inicio({ t: T + 1 })
    const remoto = [inicio({ t: T }), fin()]
    expect(mezclarPuntos([local], remoto)?.map((p) => [p.tipo, p.t])).toEqual([
      ['inicio', T + 1],
      ['fin', T + 3_600_000],
    ])
    expect(mezclarPuntos(undefined, undefined)).toBeUndefined()
    expect(mezclarPuntos([], [])).toBeUndefined()
    expect(mezclarPuntos(undefined, remoto)?.map((p) => p.tipo)).toEqual(['inicio', 'fin'])
  })

  it('por enviar: solo lo que la base todavía no tiene', () => {
    const enBase = new Set([idDePunto('p-1', 'inicio')])
    expect(puntosPorSubir('p-1', [inicio(), fin()], enBase).map((p) => p.tipo)).toEqual(['fin'])
    expect(puntosPorSubir('p-1', undefined, enBase)).toEqual([])
    expect(puntosPorSubir('p-1', [inicio(), fin()], new Set())).toHaveLength(2)
  })
})
