import { afterEach, describe, expect, it, vi } from 'vitest'
import { adaptadorMemoria, type Adaptador } from './adaptador'
import { valorCompartido } from './compartido'
import { reiniciarPropietario } from './propietario'

afterEach(() => reiniciarPropietario())

/** Un adaptador en memoria que además deja avisar a quien escucha (como hace la copia del servidor al bajar datos). */
function adaptadorConAvisos() {
  const base = adaptadorMemoria()
  const oyentes = new Set<{ clave: string | null; aviso: () => void }>()
  const a: Adaptador = {
    leer: base.leer,
    guardar: base.guardar,
    borrar: base.borrar,
    suscribir(clave, aviso) {
      const o = { clave, aviso }
      oyentes.add(o)
      return () => void oyentes.delete(o)
    },
  }
  return {
    a,
    /** Lo que hace el servidor al bajar datos: cambia la copia y avisa a quien escucha en ese momento. */
    llega(clave: string, valor: unknown) {
      base.guardar(clave, valor)
      oyentes.forEach((o) => {
        if (o.clave === null || o.clave === clave) o.aviso()
      })
    },
    escuchando: () => oyentes.size,
  }
}

describe('valorCompartido: datos que llegan antes de que alguien escuche', () => {
  it('quien se suscribe después ve lo último (la pantalla no se queda con la lista vacía)', () => {
    const { a, llega } = adaptadorConAvisos()
    const lista = valorCompartido<string[]>(a, 'pagos', [])
    // La pantalla se arma y lee: todavía no hay nada.
    expect(lista.leer()).toEqual([])
    // Los datos bajan del servidor cuando NADIE escucha todavía: no hay a quién avisar.
    llega('pagos', ['p1'])
    // Recién ahora la pantalla se suscribe (React vuelve a preguntar al hacerlo).
    const aviso = vi.fn()
    const baja = lista.suscribir(aviso)
    expect(lista.leer()).toEqual(['p1'])
    baja()
  })

  it('si nada cambió, devuelve el mismo objeto (React no vuelve a dibujar de más)', () => {
    const { a, llega } = adaptadorConAvisos()
    llega('pagos', ['p1'])
    const lista = valorCompartido<string[]>(a, 'pagos', [])
    const antes = lista.leer()
    const baja = lista.suscribir(() => undefined)
    expect(lista.leer()).toBe(antes)
    expect(lista.leer()).toBe(lista.leer())
    baja()
  })

  it('lo que llega con la pantalla escuchando avisa y se lee al instante', () => {
    const { a, llega } = adaptadorConAvisos()
    const lista = valorCompartido<string[]>(a, 'pagos', [])
    const aviso = vi.fn()
    const baja = lista.suscribir(aviso)
    expect(lista.leer()).toEqual([])
    llega('pagos', ['p1', 'p2'])
    expect(aviso).toHaveBeenCalledTimes(1)
    expect(lista.leer()).toEqual(['p1', 'p2'])
    baja()
  })

  it('lo que se normaliza al leer también se vuelve a leer al suscribirse', () => {
    const { a, llega } = adaptadorConAvisos()
    const soloTextos = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
    const lista = valorCompartido<string[]>(a, 'pagos', [], soloTextos)
    expect(lista.leer()).toEqual([])
    llega('pagos', ['p1', 7, 'p2'])
    const baja = lista.suscribir(() => undefined)
    expect(lista.leer()).toEqual(['p1', 'p2'])
    baja()
  })

  it('lo que esta pantalla puso con `poner` no se pierde al suscribirse otra (aunque el adaptador no lo haya guardado)', () => {
    const { a } = adaptadorConAvisos()
    // Un adaptador que no puede guardar (sin espacio): la demostración sigue en memoria.
    const sinEspacio: Adaptador = { ...a, guardar: () => undefined }
    const lista = valorCompartido<string[]>(sinEspacio, 'pagos', [])
    lista.poner(['p1'])
    const baja = lista.suscribir(() => undefined)
    expect(lista.leer()).toEqual(['p1'])
    baja()
  })

  it('al irse la pantalla ya no queda nadie escuchando', () => {
    const { a, escuchando } = adaptadorConAvisos()
    const lista = valorCompartido<string[]>(a, 'pagos', [])
    const baja = lista.suscribir(() => undefined)
    expect(escuchando()).toBe(1)
    baja()
    expect(escuchando()).toBe(0)
  })
})
