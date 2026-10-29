import { describe, expect, it } from 'vitest'
import { CONFIG } from './config'
import { crearBuscador, lugaresDeRespuesta, urlDeBusqueda } from './direcciones'

const RESPUESTA = [
  { display_name: 'Calle Los Cedros 245, San Isidro, Lima, Perú', lat: '-12.0987', lon: '-77.0369' },
  { display_name: '', lat: '-12.1', lon: '-77.0' },
  { display_name: 'Sin punto', lat: 'x', lon: '-77.0' },
  { display_name: 'Avenida Arequipa 1200, Lince, Lima, Lima Metropolitana, Perú', lat: -12.08, lon: -77.03 },
]

describe('búsqueda de dirección (Nominatim)', () => {
  it('la dirección pide solo Perú, dentro de los dos distritos, con límite de resultados de config y en español', () => {
    const u = new URL(urlDeBusqueda('  Los Cedros 245 '))
    expect(u.origin + u.pathname).toBe(CONFIG.nominatimUrl)
    expect(u.searchParams.get('q')).toBe('Los Cedros 245, Lima, Perú')
    expect(u.searchParams.get('limit')).toBe(String(CONFIG.nominatimMaxResultados))
    expect(u.searchParams.get('countrycodes')).toBe('pe')
    expect(u.searchParams.get('bounded')).toBe('1')
    expect(u.searchParams.get('viewbox')?.split(',')).toHaveLength(4)
    expect(u.searchParams.get('accept-language')).toBe('es')
    expect(u.searchParams.has('email')).toBe(false)
  })
  it('si el equipo llena su correo de contacto, se manda', () => {
    expect(new URL(urlDeBusqueda('Los Cedros 245', { ...CONFIG, nominatimCorreo: 'equipo@ejemplo.pe' })).searchParams.get('email')).toBe('equipo@ejemplo.pe')
  })
  it('de la respuesta salen solo lugares con nombre y punto, con el nombre corto', () => {
    const l = lugaresDeRespuesta(RESPUESTA)
    expect(l).toHaveLength(2)
    expect(l[0]).toEqual({ nombre: 'Calle Los Cedros 245, San Isidro, Lima, Perú', punto: [-12.0987, -77.0369] })
    expect(l[1].nombre).toBe('Avenida Arequipa 1200, Lince, Lima, Lima Metropolitana')
    expect(lugaresDeRespuesta('basura')).toEqual([])
    expect(lugaresDeRespuesta(RESPUESTA, 1)).toHaveLength(1)
  })

  it('no pide nada con menos de 4 letras (sin autocompletar)', async () => {
    let pedidos = 0
    const buscar = crearBuscador({ pedir: async () => (pedidos++, []), ahora: () => 0, esperar: async () => undefined })
    expect(await buscar('Lo')).toEqual({ ok: false, motivo: 'corta' })
    expect(pedidos).toBe(0)
  })
  it('máximo 1 pedido por segundo: la segunda búsqueda espera lo que falta', async () => {
    let reloj = 10_000
    const esperas: number[] = []
    const marcas: number[] = []
    const buscar = crearBuscador({
      pedir: async () => (marcas.push(reloj), RESPUESTA),
      ahora: () => reloj,
      esperar: async (ms) => {
        esperas.push(ms)
        reloj += ms
      },
    })
    await buscar('Los Cedros 245')
    reloj += 300
    await buscar('Los Cedros 246')
    expect(esperas).toEqual([CONFIG.nominatimSegundosEntreBusquedas * 1000 - 300])
    expect(marcas[1] - marcas[0]).toBeGreaterThanOrEqual(CONFIG.nominatimSegundosEntreBusquedas * 1000)
  })
  it('dos búsquedas a la vez salen una detrás de otra, con la separación de config', async () => {
    let reloj = 0
    const marcas: number[] = []
    const buscar = crearBuscador({
      pedir: async () => (marcas.push(reloj), []),
      ahora: () => reloj,
      esperar: async (ms) => {
        reloj += ms
      },
    })
    await Promise.all([buscar('Los Cedros 1'), buscar('Los Cedros 2'), buscar('Los Cedros 3')])
    expect(marcas).toHaveLength(3)
    expect(marcas[1] - marcas[0]).toBeGreaterThanOrEqual(1000)
    expect(marcas[2] - marcas[1]).toBeGreaterThanOrEqual(1000)
  })
  it('sin internet o con error del buscador devuelve «sin_conexion» (no revienta)', async () => {
    const buscar = crearBuscador({ pedir: async () => Promise.reject(new Error('red')), ahora: () => 0, esperar: async () => undefined })
    expect(await buscar('Los Cedros 245')).toEqual({ ok: false, motivo: 'sin_conexion' })
  })
})
