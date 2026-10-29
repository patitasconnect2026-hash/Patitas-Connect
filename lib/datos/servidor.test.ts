/**
 * Lo que cambió en `lib/datos/` con los pasos 6a y 6b: qué claves van al servidor, quién es el paseo «activo» con varios paseos,
 * qué pasa cuando el servidor dice que NO y que el reloj del teléfono no rompe un paso.
 */
import { describe, expect, it } from 'vitest'
import { adaptadorMemoria, crearAdaptadorConCopia, RechazoDelServidor, type Remoto } from './adaptador'
import { CLAVES, CLAVES_DEL_SERVIDOR } from './claves'
import { elegirAdaptador, enrutar } from './enrutado'
import { crearRemotoDePrueba } from './adaptadorPrueba'
import { paseoActivoDe } from './paseos'
import { moverPaseo, type Job } from '../bus'
import { nuevoPaseo, aplicar } from '../paseo'

describe('con servidor, solo lo que el servidor maneja va al servidor', () => {
  it('los paseos, la bitácora, el chat, los pagos, los casos y dónde cobra el paseador van a la copia; la cuenta y la postulación se quedan en el teléfono', async () => {
    const local = adaptadorMemoria()
    const remoto = crearRemotoDePrueba({ retrasoMs: 1 })
    const eleccion = elegirAdaptador({
      valor: 'servidor',
      local,
      servidor: () => remoto,
      clavesDelServidor: CLAVES_DEL_SERVIDOR,
      esDemo: () => false,
      enNavegador: true,
    })
    const a = eleccion.adaptador
    expect(eleccion.modo).toBe('servidor')
    expect([...CLAVES_DEL_SERVIDOR].sort()).toEqual([CLAVES.casos, CLAVES.chat, CLAVES.cobros, CLAVES.eventos, CLAVES.fotosServidor, CLAVES.pagos, CLAVES.paseo, CLAVES.resenas].sort())
    a.guardar(CLAVES.paseo, [{ id: 'p1' }])
    a.guardar(CLAVES.chat, [{ id: 'm1' }])
    a.guardar(CLAVES.cuenta, { account: null })
    a.guardar(CLAVES.pagos, [{ id: 'p1' }])
    a.guardar(CLAVES.postulacion, { phone: '1' })
    for (const k of [CLAVES.paseo, CLAVES.chat, CLAVES.pagos]) expect(local.datos.has(k), k).toBe(false)
    for (const k of [CLAVES.cuenta, CLAVES.postulacion]) expect(local.datos.has(k), k).toBe(true)
    await new Promise((r) => setTimeout(r, 30))
    expect(Object.keys(remoto.contenido()).sort()).toEqual([CLAVES.chat, CLAVES.pagos, CLAVES.paseo].sort())
    expect(a.leer(CLAVES.cuenta, null)).toEqual({ account: null })
  })

  it('sin la lista de claves, todo va al servidor como antes (modo prueba)', async () => {
    const local = adaptadorMemoria()
    const remoto = crearRemotoDePrueba({ retrasoMs: 1 })
    const a = enrutar(local, crearAdaptadorConCopia(remoto, { reintentoMs: 10 }), { esDemo: () => false })
    a.guardar(CLAVES.chat, [{ id: 'm1' }])
    await new Promise((r) => setTimeout(r, 30))
    expect(local.datos.has(CLAVES.chat)).toBe(false)
    expect(Object.keys(remoto.contenido())).toEqual([CLAVES.chat])
  })

  it('la demostración sigue siempre en el teléfono aunque haya servidor', () => {
    const local = adaptadorMemoria()
    const remoto = crearRemotoDePrueba({ retrasoMs: 1 })
    const eleccion = elegirAdaptador({
      valor: 'servidor',
      local,
      servidor: () => remoto,
      clavesDelServidor: [CLAVES.paseo, CLAVES.eventos],
      esDemo: () => true,
      enNavegador: true,
    })
    eleccion.adaptador.guardar(CLAVES.paseo, { id: 'demo' })
    expect(local.leer(CLAVES.paseo, null)).toEqual({ id: 'demo' })
    expect(remoto.subidas).toBe(0)
  })
})

describe('el paseo «activo» con varios paseos', () => {
  const T0 = Date.UTC(2026, 9, 13, 15, 0, 0)
  const job = (id: string, createdAt: number, estado: 'solicitado' | 'aceptado' | 'cerrado', walkerId = 'p1', familiaId = 'f1'): Job => {
    let paseo = nuevoPaseo(createdAt)
    if (estado !== 'solicitado') paseo = aplicar(paseo, 'aceptar', 'paseador', createdAt + 1)
    return {
      id,
      familiaId,
      walkerFirst: 'L',
      walkerId,
      ownerFirst: 'V',
      dog: { name: 'Max', breed: 'x', size: 'large', fur: 'dorado', shape: 'floppy', notes: '', medical: '', vet: '', temperament: [], sociable: true, vaccinated: true },
      slotLabel: 'Hoy',
      durationMin: 60,
      pin: '',
      handoff: 'door',
      doormanName: '',
      address: '',
      groupDogs: 0,
      groupSize: 'large',
      walkerPay: 10,
      createdAt,
      paseo: estado === 'cerrado' ? { ...paseo, estado: 'cerrado' } : paseo,
    }
  }

  it('la familia ve el más reciente de los suyos y no los de otra familia', () => {
    const lista = [job('a', T0, 'cerrado'), job('b', T0 + 100, 'solicitado'), job('c', T0 + 200, 'solicitado', 'p1', 'f2')]
    expect(paseoActivoDe(lista, { rol: 'familia', id: 'f1' })!.id).toBe('b')
    expect(paseoActivoDe(lista, { rol: 'familia', id: 'f2' })!.id).toBe('c')
    expect(paseoActivoDe(lista, { rol: 'familia', id: 'f3' })).toBeNull()
  })

  it('al paseador le toca primero el que está en curso y, si no hay, la solicitud más antigua (la que primero vence)', () => {
    const lista = [job('vieja', T0, 'solicitado'), job('nueva', T0 + 500, 'solicitado'), job('ajena', T0 + 900, 'solicitado', 'p2')]
    expect(paseoActivoDe(lista, { rol: 'paseador', id: 'p1' })!.id).toBe('vieja')
    const conUnoEnCurso = [...lista, job('encurso', T0 + 300, 'aceptado')]
    expect(paseoActivoDe(conUnoEnCurso, { rol: 'paseador', id: 'p1' })!.id).toBe('encurso')
    // Un solo paseo (el teléfono): es ese.
    expect(paseoActivoDe([job('x', T0, 'cerrado')], { rol: 'paseador', id: 'p1' })!.id).toBe('x')
  })

  it('sin identidad (el teléfono, un solo paseo) no cambia nada: es el único', () => {
    expect(paseoActivoDe([job('x', T0, 'solicitado')], null)!.id).toBe('x')
    expect(paseoActivoDe([], null)).toBeNull()
  })
})

describe('el reloj del teléfono no pierde un paso', () => {
  it('si el reloj va atrasado respecto del registro (la base trae su hora), el paso se hace a la hora del último evento', () => {
    const adelante = Date.now() + 60_000
    const paseo = nuevoPaseo(adelante)
    const j = { paseo } as unknown as Job
    const r = moverPaseo(j, 'aceptar', 'paseador', Date.now())!
    expect(r.paseo.estado).toBe('aceptado')
    expect(r.paseo.eventos[1].at).toBe(adelante)
  })
})

describe('cuando el servidor dice que NO', () => {
  function remotoQueRechaza(): Remoto & { llamadas: number; datos: Record<string, unknown> } {
    const r = {
      llamadas: 0,
      datos: { x: 'servidor' } as Record<string, unknown>,
      async bajar() {
        return { ...r.datos }
      },
      async subir() {
        r.llamadas += 1
        throw new RechazoDelServidor('Ese cambio ya no se pudo hacer.', '22023')
      },
      async quitar() {
        r.llamadas += 1
      },
      escuchar: () => () => undefined,
      identidad: () => null,
    }
    return r
  }

  it('se descarta el cambio, no se reintenta, se avisa con el texto y la copia vuelve a lo que dice el servidor', async () => {
    const remoto = remotoQueRechaza()
    const a = crearAdaptadorConCopia(remoto, { reintentoMs: 10 })
    await a.alEstarListo()
    const avisos: string[] = []
    a.suscribirRechazos((r) => avisos.push(`${r.clave}: ${r.mensaje}`))
    a.guardar('x', 'mi cambio')
    expect(a.leer('x', '')).toBe('mi cambio')
    await new Promise((r) => setTimeout(r, 60))
    expect(avisos).toEqual(['x: Ese cambio ya no se pudo hacer.'])
    expect(remoto.llamadas).toBe(1)
    expect(a.leer('x', '')).toBe('servidor')
    expect(a.estadoGuardado()).toBe('guardado')
    expect(a.estadoConexion()).toBe('conectado')
    a.detener()
  })

  it('un corte de internet NO es un rechazo: se queda esperando y dice «sin conexión»', async () => {
    let cortado = true
    const remoto: Remoto = {
      async bajar() {
        return {}
      },
      async subir() {
        if (cortado) throw new Error('Failed to fetch')
      },
      async quitar() {},
      escuchar: () => () => undefined,
      identidad: () => null,
    }
    const a = crearAdaptadorConCopia(remoto, { reintentoMs: 15 })
    await a.alEstarListo()
    expect(a.estadoConexion()).toBe('conectado')
    const avisos: unknown[] = []
    a.suscribirRechazos((r) => avisos.push(r))
    a.guardar('x', 1)
    expect(await a.yaSeGuardo('x')).toBe('error')
    expect(a.estadoConexion()).toBe('sin_conexion')
    expect(a.leer('x', 0)).toBe(1)
    cortado = false
    a.reintentar()
    expect(await a.yaSeGuardo('x')).toBe('guardado')
    expect(a.estadoConexion()).toBe('conectado')
    expect(avisos).toEqual([])
    a.detener()
  })

  it('al abrir sin internet dice «conectando» y luego «sin conexión», y se recupera solo', async () => {
    let cortado = true
    const remoto: Remoto = {
      async bajar() {
        if (cortado) throw new Error('Failed to fetch')
        return { x: 1 }
      },
      async subir() {},
      async quitar() {},
      escuchar: () => () => undefined,
      identidad: () => null,
    }
    const a = crearAdaptadorConCopia(remoto, { reintentoMs: 15 })
    expect(a.estadoConexion()).toBe('conectando')
    await new Promise((r) => setTimeout(r, 40))
    expect(a.estadoConexion()).toBe('sin_conexion')
    cortado = false
    await a.alEstarListo()
    expect(a.estadoConexion()).toBe('conectado')
    expect(a.leer('x', 0)).toBe(1)
    a.detener()
  })
})
