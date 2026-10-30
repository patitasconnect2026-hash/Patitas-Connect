import { describe, expect, it } from 'vitest'
import { chequeoSalida, enlaceUltimaUbicacion, enVehiculo, escalonDe, estadoSenal, mensajeUltimaUbicacion, puedeSalir, velocidadKmh } from './protocoloSenal'

const MIN = 60_000
// ~111 m por cada 0.001 de latitud
const p = (lat: number, min: number) => ({ lat, lng: -77.03, en: min * MIN })

describe('señal del paseo', () => {
  it('los escalones suben con los minutos', () => {
    expect(escalonDe(1, false)).toBe('normal')
    expect(escalonDe(4, false)).toBe('debil')
    expect(escalonDe(7, false)).toBe('perdida')
    expect(escalonDe(13, false)).toBe('llamada')
    expect(escalonDe(25, false)).toBe('alerta')
    expect(escalonDe(0, true)).toBe('alerta')
  })
  it('caminar no es un vehículo; dos tramos rápidos seguidos sí', () => {
    const caminando = [p(-12.1, 0), p(-12.1007, 1), p(-12.1014, 2), p(-12.1021, 3)] // ~4,7 km/h
    expect(velocidadKmh(caminando[0], caminando[1])).toBeLessThan(6)
    expect(enVehiculo(caminando)).toBe(false)
    const taxi = [p(-12.1, 0), p(-12.1007, 1), p(-12.107, 2), p(-12.114, 3)] // ~42 km/h
    expect(enVehiculo(taxi)).toBe(true)
    const saltoGps = [p(-12.1, 0), p(-12.107, 1), p(-12.1071, 2)]
    expect(enVehiculo(saltoGps)).toBe(false)
  })
  it('el estado arma título, pasos y botones', () => {
    const lecturas = [p(-12.1, 0)]
    const e = estadoSenal(lecturas, 21 * MIN)
    expect(e.escalon).toBe('alerta')
    expect(e.minutos).toBe(21)
    expect(e.botones).toEqual(['serenazgo', 'policia', 'patitas', 'mapa'])
    expect(estadoSenal(lecturas, 1 * MIN).botones).toEqual(['chat', 'mapa'])
    // Con solo puntos de control, la foto llega cada 10 minutos: 12 minutos todavía es normal.
    expect(estadoSenal(lecturas, 12 * MIN, undefined, 'puntos').escalon).toBe('normal')
    expect(estadoSenal(lecturas, 12 * MIN).escalon).toBe('llamada')
  })
  it('comparte la última ubicación en Google Maps', () => {
    expect(enlaceUltimaUbicacion([])).toBeNull()
    expect(enlaceUltimaUbicacion([p(-12.1, 0)])).toMatch(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=-12\.10000,-77\.03000$/)
    expect(mensajeUltimaUbicacion({ perro: 'Toby', paseador: 'Ana', lecturas: [p(-12.1, 0)], ahora: 5 * MIN })).toMatch(/Toby.*Ana.*hace 5 min.*google/)
    expect(mensajeUltimaUbicacion({ perro: 'Toby', paseador: 'Ana', lecturas: [], ahora: 0 })).toMatch(/Todavía no hay ubicación/)
  })
})

describe('antes de salir', () => {
  it('batería baja sin cargar no deja salir; sin dato de batería, el paseador la revisa', () => {
    expect(puedeSalir(chequeoSalida({ bateria: 0.2, cargando: false, ubicacionPermitida: true, enLinea: true }))).toBe(false)
    expect(puedeSalir(chequeoSalida({ bateria: 0.2, cargando: true, ubicacionPermitida: true, enLinea: true }))).toBe(true)
    expect(puedeSalir(chequeoSalida({ bateria: null, cargando: false, ubicacionPermitida: null, enLinea: true }))).toBe(true)
    expect(puedeSalir(chequeoSalida({ bateria: 0.9, cargando: false, ubicacionPermitida: false, enLinea: true }))).toBe(false)
  })
})
