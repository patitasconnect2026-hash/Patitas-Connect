import { afterEach, describe, expect, it, vi } from 'vitest'
import { crearAdaptadorConCopia, esConCopia, adaptadorMemoria } from './index'
import { adaptadorDePrueba, crearRemotoDePrueba } from './adaptadorPrueba'

afterEach(() => vi.useRealTimers())

describe('adaptador con copia en memoria y subida en segundo plano', () => {
  it('lo que se guarda se lee AL INSTANTE; llega al servidor después, y avisa «ya se guardó»', async () => {
    const a = adaptadorDePrueba({ retrasoMs: 20 })
    expect(esConCopia(a)).toBe(true)
    expect(esConCopia(adaptadorMemoria())).toBe(false)
    a.guardar('x', { n: 1 })
    expect(a.leer('x', null)).toEqual({ n: 1 })
    expect(a.remoto.contenido().x).toBeUndefined()
    expect(a.estadoGuardado('x')).toBe('subiendo')
    expect(await a.yaSeGuardo('x')).toBe('guardado')
    expect(a.remoto.contenido().x).toEqual({ n: 1 })
    expect(a.estadoGuardado()).toBe('guardado')
  })

  it('lo que se guarda ANTES de bajar lo del servidor no lo pisa (una pantalla rápida no borra lo que había)', async () => {
    const a = adaptadorDePrueba({ retrasoMs: 15, inicial: { cuenta: { nombre: 'Valeria' } } })
    // la pantalla lee «vacío» y lo escribe de vuelta antes de que baje lo del servidor
    a.guardar('cuenta', { nombre: '' })
    a.guardar('nueva', 1)
    expect(a.leer('cuenta', null)).toEqual({ nombre: '' })
    expect(a.estadoGuardado()).toBe('subiendo')
    expect(await a.yaSeGuardo()).toBe('guardado')
    expect(a.leer('cuenta', null)).toEqual({ nombre: 'Valeria' })
    expect(a.remoto.contenido().cuenta).toEqual({ nombre: 'Valeria' })
    expect(a.remoto.contenido().nueva).toBe(1)
  })

  it('si no se puede bajar, no se queda colgado: dice «error» y reintenta', async () => {
    const remoto = crearRemotoDePrueba({ retrasoMs: 5 })
    let falla = true
    const original = remoto.bajar.bind(remoto)
    remoto.bajar = async () => {
      if (falla) throw new Error('sin internet')
      return original()
    }
    const a = crearAdaptadorConCopia(remoto, { reintentoMs: 20 })
    a.guardar('x', 1)
    expect(await a.yaSeGuardo()).toBe('error')
    falla = false
    await a.alEstarListo()
    expect(await a.yaSeGuardo()).toBe('guardado')
    expect(remoto.contenido().x).toBe(1)
    a.detener()
  })

  it('si la misma clave cambia varias veces seguidas, manda lo último (y no sube de más)', async () => {
    const a = adaptadorDePrueba({ retrasoMs: 10 })
    a.guardar('x', 1)
    a.guardar('x', 2)
    a.guardar('x', 3)
    await a.yaSeGuardo()
    expect(a.remoto.contenido().x).toBe(3)
    expect(a.remoto.subidas).toBeLessThanOrEqual(2)
  })

  it('guardar lo mismo que ya hay no sube nada (dos pantallas que se escriben de vuelta no hacen un ciclo)', async () => {
    const a = adaptadorDePrueba({ retrasoMs: 5 })
    await a.alEstarListo()
    a.guardar('x', { n: 1 })
    await a.yaSeGuardo()
    const antes = a.remoto.subidas
    a.guardar('x', { n: 1 })
    expect(a.estadoGuardado('x')).toBe('guardado')
    await a.yaSeGuardo()
    expect(a.remoto.subidas).toBe(antes)
  })

  it('borrar también se sube', async () => {
    const a = adaptadorDePrueba({ retrasoMs: 5, inicial: { y: 'hola' } })
    await a.alEstarListo()
    expect(a.leer('y', '')).toBe('hola')
    a.borrar('y')
    expect(a.leer('y', 'nada')).toBe('nada')
    await a.yaSeGuardo()
    expect(a.remoto.contenido().y).toBeUndefined()
  })

  it('antes de bajar lo del servidor lee el valor por defecto; al bajar avisa a las pantallas', async () => {
    const a = adaptadorDePrueba({ retrasoMs: 15, inicial: { cuenta: { nombre: 'Valeria' } } })
    const aviso = vi.fn()
    a.suscribir('cuenta', aviso)
    expect(a.listo()).toBe(false)
    expect(a.leer('cuenta', null)).toBeNull()
    await a.alEstarListo()
    expect(a.listo()).toBe(true)
    expect(a.leer('cuenta', null)).toEqual({ nombre: 'Valeria' })
    expect(aviso).toHaveBeenCalled()
  })

  it('lo que cambia OTRA persona baja y avisa; lo que cambio yo no me avisa a mí', async () => {
    const a = adaptadorDePrueba({ retrasoMs: 10 })
    await a.alEstarListo()
    const aviso = vi.fn()
    a.suscribir('chat', aviso)
    a.guardar('chat', ['mío'])
    await a.yaSeGuardo()
    expect(aviso).not.toHaveBeenCalled()
    a.remoto.simularCambioAjeno('chat', ['mío', 'del paseador'])
    await new Promise((r) => setTimeout(r, 40))
    expect(aviso).toHaveBeenCalledTimes(1)
    expect(a.leer('chat', [])).toEqual(['mío', 'del paseador'])
  })

  it('lo mío que todavía no subió manda sobre lo que baja', async () => {
    const a = adaptadorDePrueba({ retrasoMs: 30 })
    await a.alEstarListo()
    a.guardar('x', 'mío')
    a.remoto.simularCambioAjeno('x', 'ajeno', 5)
    expect(a.leer('x', '')).toBe('mío')
    await a.yaSeGuardo()
    await new Promise((r) => setTimeout(r, 60))
    expect(a.leer('x', '')).toBe('mío')
  })

  it('si falla el guardado: queda en «error», la pantalla sigue con lo suyo y se reintenta solo', async () => {
    const a = adaptadorDePrueba({ retrasoMs: 5, reintentoMs: 15 })
    await a.alEstarListo()
    a.remoto.fallar(1)
    a.guardar('x', 'valor')
    expect(await a.yaSeGuardo('x')).toBe('error')
    expect(a.leer('x', '')).toBe('valor')
    await new Promise((r) => setTimeout(r, 80))
    expect(a.estadoGuardado('x')).toBe('guardado')
    expect(a.remoto.contenido().x).toBe('valor')
  })

  it('avisa cuando cambia el estado del guardado (para un «Guardando…»)', async () => {
    const a = adaptadorDePrueba({ retrasoMs: 5 })
    const estados: string[] = []
    a.suscribirGuardado(() => estados.push(a.estadoGuardado()))
    a.guardar('x', 1)
    await a.yaSeGuardo()
    expect(estados).toContain('subiendo')
    expect(estados[estados.length - 1]).toBe('guardado')
  })

  it('detener no deja a nadie esperando', async () => {
    const a = adaptadorDePrueba({ retrasoMs: 1000 })
    a.guardar('x', 1)
    const espera = a.yaSeGuardo()
    a.detener()
    await expect(espera).resolves.toBeDefined()
  })

  it('el retraso se puede simular con reloj falso (sin esperar de verdad)', async () => {
    vi.useFakeTimers()
    const remoto = crearRemotoDePrueba({ retrasoMs: 500 })
    const a = crearAdaptadorConCopia(remoto)
    a.guardar('x', 7)
    expect(a.leer('x', 0)).toBe(7)
    expect(remoto.contenido().x).toBeUndefined()
    await vi.advanceTimersByTimeAsync(1500)
    expect(remoto.contenido().x).toBe(7)
    a.detener()
  })
})
