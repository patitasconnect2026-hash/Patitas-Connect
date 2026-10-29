import { describe, expect, it } from 'vitest'
import { aLectura, esPermisoNegado, puedeUsarUbicacion, tocaProcesar } from './ubicacion'

describe('aLectura', () => {
  it('convierte una posición del navegador en una lectura del motor', () => {
    const l = aLectura({ coords: { latitude: -12.09993, longitude: -77.03739, accuracy: 12 }, timestamp: 1_700_000_000_000 })
    expect(l).toEqual({ pos: [-12.09993, -77.03739], precisionM: 12, t: 1_700_000_000_000 })
  })

  it('descarta posiciones que no sirven', () => {
    expect(aLectura({ coords: { latitude: NaN, longitude: -77, accuracy: 10 }, timestamp: 1 })).toBeNull()
    expect(aLectura({ coords: { latitude: -12, longitude: -77, accuracy: -1 }, timestamp: 1 })).toBeNull()
    expect(aLectura({ coords: { latitude: 120, longitude: -77, accuracy: 10 }, timestamp: 1 })).toBeNull()
    expect(aLectura({ coords: { latitude: -12, longitude: -77, accuracy: 10 }, timestamp: NaN })).toBeNull()
  })
})

describe('tocaProcesar: una lectura cada 45 s', () => {
  it('la primera siempre; las siguientes, pasado el tiempo', () => {
    expect(tocaProcesar(null, 1_000, 45)).toBe(true)
    expect(tocaProcesar(1_000, 1_000 + 44_999, 45)).toBe(false)
    expect(tocaProcesar(1_000, 1_000 + 45_000, 45)).toBe(true)
  })
})

describe('permisos y soporte', () => {
  it('el código 1 es permiso negado; 2 y 3 son «sin señal por ahora»', () => {
    expect(esPermisoNegado(1)).toBe(true)
    expect(esPermisoNegado(2)).toBe(false)
    expect(esPermisoNegado(3)).toBe(false)
  })

  it('hace falta la API y una conexión segura', () => {
    expect(puedeUsarUbicacion({ geolocation: {}, isSecureContext: true })).toBe(true)
    expect(puedeUsarUbicacion({ geolocation: {}, isSecureContext: false })).toBe(false)
    expect(puedeUsarUbicacion({ isSecureContext: true })).toBe(false)
  })
})
