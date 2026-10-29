import { describe, expect, it, vi } from 'vitest'
import { adaptadorMemoria, adaptadorDePrueba, CLAVES, elegirAdaptador, esEnrutado, crearRemotoDePrueba, esConCopia } from './index'
import { DEMO_ACCOUNT } from '../data'
import { EMPTY } from '../store'

const base = () => ({
  local: adaptadorMemoria(),
  esDemo: () => false,
  enNavegador: true,
})

describe('el selector NEXT_PUBLIC_DATOS', () => {
  it('sin variable o con «local»: el teléfono, sin avisos', () => {
    for (const valor of [undefined, '', '  ', 'local', 'LOCAL']) {
      const e = elegirAdaptador({ ...base(), valor })
      expect(e.modo).toBe('local')
      expect(e.adaptador).toBe(e.adaptador)
      expect(e.avisos).toEqual([])
    }
    const o = base()
    expect(elegirAdaptador({ ...o, valor: 'local' }).adaptador).toBe(o.local)
  })

  it('«servidor» sin servidor configurado: vuelve a local, lo dice en la consola y no rompe', () => {
    const o = base()
    const registrar = vi.fn()
    const e = elegirAdaptador({ ...o, valor: 'servidor', servidor: () => null, registrar })
    expect(e.modo).toBe('local')
    expect(e.adaptador).toBe(o.local)
    expect(e.avisos[0]).toMatch(/servidor no está configurado/)
    expect(registrar).toHaveBeenCalledTimes(1)
    // sin ni siquiera la función de servidor
    expect(elegirAdaptador({ ...o, valor: 'servidor' }).modo).toBe('local')
  })

  it('un valor desconocido también vuelve a local, con aviso', () => {
    const e = elegirAdaptador({ ...base(), valor: 'firebase' })
    expect(e.modo).toBe('local')
    expect(e.avisos[0]).toMatch(/no se reconoce/)
  })

  it('en el servidor de Next (sin navegador) siempre local', () => {
    const e = elegirAdaptador({ ...base(), valor: 'prueba', prueba: () => crearRemotoDePrueba(), enNavegador: false })
    expect(e.modo).toBe('local')
  })

  it('«prueba»: el de prueba, con la demostración aparte en el teléfono', () => {
    const e = elegirAdaptador({ ...base(), valor: 'prueba', prueba: () => crearRemotoDePrueba({ retrasoMs: 1 }) })
    expect(e.modo).toBe('prueba')
    expect(esEnrutado(e.adaptador)).toBe(true)
    const t = elegirAdaptador({ ...base(), valor: 'prueba-todo', prueba: () => crearRemotoDePrueba({ retrasoMs: 1 }) })
    expect(t.modo).toBe('prueba-todo')
    expect(esConCopia(t.adaptador)).toBe(true)
  })
})

describe('la demostración usa SIEMPRE el teléfono', () => {
  const armar = (esDemo: () => boolean, siempreLocal?: (c: string, v?: unknown) => boolean) => {
    const local = adaptadorMemoria()
    const prueba = adaptadorDePrueba({ retrasoMs: 1 })
    const e = elegirAdaptador({ valor: 'prueba', local, esDemo, siempreLocal, enNavegador: true, prueba: () => prueba.remoto })
    return { local, prueba, e }
  }

  it('sin demostración, lo que se guarda va al servidor y no al teléfono', async () => {
    const { local, e } = armar(() => false)
    e.adaptador.guardar('patitas:bus:chat', ['hola'])
    expect(e.adaptador.leer('patitas:bus:chat', [])).toEqual(['hola'])
    expect(local.leer('patitas:bus:chat', null)).toBeNull()
  })

  it('en demostración, todo va al teléfono y nada al servidor', async () => {
    const { local, prueba, e } = armar(() => true)
    e.adaptador.guardar('patitas:bus:chat', ['hola'])
    expect(local.leer('patitas:bus:chat', null)).toEqual(['hola'])
    await new Promise((r) => setTimeout(r, 30))
    expect(prueba.remoto.contenido()).toEqual({})
  })

  it('las marcas de la demostración nunca salen del teléfono, aunque todavía no se sepa que es demostración', () => {
    const { local, e } = armar(
      () => false,
      (clave, valor) => clave === CLAVES.demo || (clave === CLAVES.cuenta && (valor as { account?: { firstName?: string } })?.account?.firstName === DEMO_ACCOUNT.firstName),
    )
    e.adaptador.guardar(CLAVES.demo, 1)
    expect(local.leer(CLAVES.demo, 0)).toBe(1)
    e.adaptador.guardar(CLAVES.cuenta, { ...EMPTY, account: DEMO_ACCOUNT })
    expect(local.leer(CLAVES.cuenta, null)).not.toBeNull()
    e.adaptador.borrar(CLAVES.demo)
    expect(local.leer(CLAVES.demo, 0)).toBe(0)
  })

  it('suscribir avisa de los dos lados', async () => {
    const { local, e } = armar(() => false)
    const aviso = vi.fn()
    const baja = e.adaptador.suscribir('x', aviso)
    expect(typeof baja).toBe('function')
    baja()
    expect(local).toBeDefined()
  })
})
