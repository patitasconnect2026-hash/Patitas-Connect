/**
 * Los pagos con el servidor (paso 7), de punta a punta y SIN red: una familia, una paseadora y una persona del equipo, cada
 * una con la copia en memoria de la app conectada a un servidor de prueba con SU sesión. Cada escenario corre tres veces:
 *   1. contra el servidor simulado en memoria (siempre),
 *   2. contra las migraciones SQL de verdad en PGlite, y
 *   3. con el cliente de Supabase de verdad hablando HTTP con el servidor simulado sobre PGlite
 * (las dos últimas solo si PGlite está instalado: `npm i --no-save @electric-sql/pglite@0.2.17`).
 *
 * Se comprueba lo que pidió el plan: quién ve qué, quién puede mover un pago, que una acción inválida se rechaza con un texto
 * claro, que sin internet NADA queda marcado y que un reintento no repite la acción.
 */
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { CLAVES } from '../datos/claves'
import { confirmarEntregaJob, moverPaseo } from '../bus'
import { noEncontrados, pagoPendiente, porPagarAlPaseador, type Pago } from '../pagos'
import { paseadoresDeVista } from './paseadoresReales'
import { ErrorDeBase } from './paseosTipos'
import { TEXTO_PAGO_SERVIDOR, TEXTO_SERVIDOR } from './paseosTextos'
import { crearServidorFalso, type ServidorDePrueba } from './pruebas/servidorFalso'
import { crearServidorHttp } from './pruebas/servidorHttp'
import { crearServidorPglite } from './pruebas/servidorPglite'
import { abrirTelefono, esperar as esperarPoco, jobDeSolicitud, type Telefono } from './pruebas/telefonos'

const RAIZ = path.resolve(__dirname, '..', '..')
const FAMILIA_A = 'aaaaaaaa-0000-4000-8000-000000000001'
const FAMILIA_B = 'aaaaaaaa-0000-4000-8000-000000000002'
const LUCIA = 'bbbbbbbb-0000-4000-8000-000000000001'
const MATEO = 'bbbbbbbb-0000-4000-8000-000000000002'
const EQUIPO = 'cccccccc-0000-4000-8000-000000000001'

const hayPglite = (await crearServidorPglite(RAIZ).then(
  async (s) => {
    await s?.cerrar()
    return s !== null
  },
  () => false,
)) as boolean

/** Con HTTP y PGlite cada vuelta a la base tarda más (y los teléfonos preguntan seguido): se espera hasta 30 s. */
const esperar = (condicion: () => boolean | Promise<boolean>, descripcion: string) => esperarPoco(condicion, descripcion, 30_000)

const abiertos: Telefono[] = []
const servidoresAbiertos: ServidorDePrueba[] = []
afterEach(async () => {
  abiertos.splice(0).forEach((t) => t.cerrar())
  await Promise.all(servidoresAbiertos.splice(0).map((s) => s.cerrar()))
})

async function nuevoServidor(fabrica: () => Promise<ServidorDePrueba | null>): Promise<ServidorDePrueba> {
  const s = await fabrica()
  if (!s) throw new Error('El servidor de prueba no está disponible')
  servidoresAbiertos.push(s)
  await s.persona({ id: FAMILIA_A, rol: 'familia', nombre: 'Valeria' })
  await s.persona({ id: FAMILIA_B, rol: 'familia', nombre: 'Rosa' })
  await s.persona({ id: EQUIPO, rol: 'equipo', nombre: 'Equipo' })
  await s.paseadorAprobado({ id: LUCIA, nombre: 'Lucía', apellido: 'Quispe', cobro: { metodo: 'yape', celular: '987111222', titular: 'Lucía Quispe' } })
  await s.paseadorAprobado({ id: MATEO, nombre: 'Mateo', apellido: 'Rojas', cobro: { metodo: 'plin', celular: '987333444', titular: 'Mateo Rojas' } })
  return s
}

async function telefono(s: ServidorDePrueba, uid: string | null, opciones?: Parameters<typeof abrirTelefono>[2]): Promise<Telefono> {
  const t = abrirTelefono(s, uid, opciones)
  abiertos.push(t)
  await t.copia.alEstarListo()
  return t
}

async function guardado(t: Telefono): Promise<void> {
  expect(await t.copia.yaSeGuardo(CLAVES.paseo)).toBe('guardado')
}

/** La familia pide, el paseador acepta y hace el recorrido hasta «Entregué». Devuelve el id del paseo. */
async function pedirYEntregar(s: ServidorDePrueba, familia: Telefono, paseador: Telefono, paseadorId: string, hora = 10): Promise<string> {
  const w = paseadoresDeVista(await familia.cliente.paseadoresPublicos()).find((x) => x.id === paseadorId)!
  const { job } = jobDeSolicitud({ walker: w, hora })
  familia.actuar(() => job)
  await guardado(familia)
  await esperar(() => paseador.paseos().some((j) => j.id === job.id), 'que el paseador vea la solicitud')
  for (const accion of ['aceptar', 'salir', 'recoger', 'entregar'] as const) {
    paseador.actuar((j) => moverPaseo(j, accion, 'paseador', Date.now()))
    await guardado(paseador)
  }
  expect(await s.estadoDe(job.id)).toBe('entregado')
  return job.id
}

const pagoDe = (t: Telefono, id: string): Pago | undefined => t.pagos().find((p) => p.id === id)

const fabricas: Array<[string, () => Promise<ServidorDePrueba | null>, boolean]> = [
  ['servidor simulado', async () => crearServidorFalso(), true],
  ['reglas SQL en PGlite', () => crearServidorPglite(RAIZ), hayPglite],
  ['cliente de Supabase por HTTP sobre PGlite', () => crearServidorHttp(RAIZ), hayPglite],
]

describe.each(fabricas)('pagos con el servidor · %s', (_nombre, fabrica, disponible) => {
  // Cada escenario hace muchas idas y vueltas a la base (sobre todo con HTTP y PGlite): más tiempo que el de siempre.
  const prueba = (nombre: string, f: () => Promise<void>) => it.skipIf(!disponible)(nombre, f, 40_000)

  prueba('el pago nace con el paseo, sale en los dos teléfonos y el recorrido llega hasta «Pagado al paseador»', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    const equipo = await telefono(s, EQUIPO)

    const id = await pedirYEntregar(s, familia, lucia, LUCIA)
    // La base lo creó sola al pedir el paseo (la app no escribe en `pagos`).
    expect(await s.contar('pagos')).toBe(1)
    await esperar(() => !!pagoDe(familia, id) && !!pagoDe(lucia, id) && !!pagoDe(equipo, id), 'que los tres vean el pago')
    const p = pagoDe(familia, id)!
    expect(p).toMatchObject({ estado: 'sin_pagar', walkerId: LUCIA, paseador: 'Lucía', dueno: 'Valeria', perro: 'Max' })
    expect(p.monto).toBeCloseTo(p.comision + p.neto, 2)

    // El paseo ya fue entregado: a la familia le toca pagar, y mientras no lo haga no puede pedir otro paseo.
    await esperar(() => pagoDe(familia, id)?.paseo === 'entregado' && pagoDe(familia, id)?.hechoAt !== undefined, 'que el pago sepa que el paseo se entregó')
    expect(pagoPendiente(familia.pagos())?.id).toBe(id)

    // La familia confirma la entrega y el paseo se cierra.
    await esperar(() => familia.activo()?.paseo.estado === 'entregado', 'que la familia vea la entrega')
    familia.actuar((j) => confirmarEntregaJob(j, Date.now()))
    await guardado(familia)
    await esperar(() => pagoDe(lucia, id)?.paseo === 'cerrado', 'que el pago sepa que el paseo se cerró')

    // La paseadora toca «Vi el pago» (y anota la hora). Recién cuando la base contesta, se ve.
    const visto = await lucia.remoto.moverPago(id, 'ver_pago', { hora: '10:45' })
    expect(visto.ok).toBe(true)
    expect(pagoDe(lucia, id)).toMatchObject({ estado: 'visto', horaPago: '10:45' })
    expect((await s.pagoDe(id))?.estado).toBe('visto')

    // Hallazgo del 6a: la familia ya no tiene un pago pendiente (antes vivía en el teléfono del paseador).
    await esperar(() => pagoDe(familia, id)?.estado === 'visto', 'que la familia vea que el paseador vio el pago')
    expect(pagoPendiente(familia.pagos())).toBeNull()

    // El equipo lo ve en «Por pagar al paseador» con dónde cobra la paseadora, y lo marca recién cuando confirma.
    await esperar(() => porPagarAlPaseador(equipo.pagos()).length === 1, 'que el equipo vea el pago por pagar')
    expect(equipo.cobros()[LUCIA]).toEqual({ metodo: 'yape', telefono: '987111222', titular: 'Lucía Quispe' })
    const pagado = await equipo.remoto.moverPago(id, 'pagar_al_paseador')
    expect(pagado.ok).toBe(true)
    expect(pagoDe(equipo, id)?.estado).toBe('pagado_paseador')
    expect((await s.pagoDe(id))?.estado).toBe('pagado_paseador')
    await esperar(() => pagoDe(lucia, id)?.estado === 'pagado_paseador' && pagoDe(familia, id)?.estado === 'pagado_paseador', 'que los dos vean que ya se le pagó')
  })

  prueba('cada persona ve solo lo suyo: la familia B no ve los pagos de A, el paseador no ve el Yape de otro y la familia no ve ninguno', async () => {
    const s = await nuevoServidor(fabrica)
    const familiaA = await telefono(s, FAMILIA_A)
    const familiaB = await telefono(s, FAMILIA_B)
    const lucia = await telefono(s, LUCIA)
    const mateo = await telefono(s, MATEO)
    const equipo = await telefono(s, EQUIPO)

    const idA = await pedirYEntregar(s, familiaA, lucia, LUCIA)
    const idB = await pedirYEntregar(s, familiaB, mateo, MATEO)
    await esperar(() => equipo.pagos().length === 2, 'que el equipo vea los dos pagos')

    expect(familiaA.pagos().map((p) => p.id)).toEqual([idA])
    expect(familiaB.pagos().map((p) => p.id)).toEqual([idB])
    expect(lucia.pagos().map((p) => p.id)).toEqual([idA])
    expect(mateo.pagos().map((p) => p.id)).toEqual([idB])
    expect(equipo.pagos().map((p) => p.id).sort()).toEqual([idA, idB].sort())

    // Dónde cobra cada paseador: él mismo y el equipo. La familia, nunca.
    expect(Object.keys(lucia.cobros())).toEqual([LUCIA])
    expect(Object.keys(mateo.cobros())).toEqual([MATEO])
    expect(Object.keys(equipo.cobros()).sort()).toEqual([LUCIA, MATEO].sort())
    expect(familiaA.cobros()).toEqual({})
    expect(await familiaA.cliente.listarCobros([LUCIA, MATEO])).toEqual([])
    expect(await mateo.cliente.listarCobros([LUCIA])).toEqual([])
    expect(await mateo.cliente.miCobro(LUCIA)).toBeNull()
    expect(JSON.stringify(familiaA.pagos())).not.toContain('987111222')
    expect(JSON.stringify(familiaB.copia.leer(CLAVES.pagos, []))).not.toContain(idA)

    // Sin sesión no se ve nada.
    const anonimo = await telefono(s, null)
    expect(anonimo.pagos()).toEqual([])
    await expect(anonimo.cliente.listarPagos(10)).rejects.toBeInstanceOf(ErrorDeBase)
  })

  prueba('solo quien corresponde mueve un pago: el paseador no se marca «pagado» y la familia no toca nada', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    const mateo = await telefono(s, MATEO)
    const equipo = await telefono(s, EQUIPO)
    const id = await pedirYEntregar(s, familia, lucia, LUCIA)
    await esperar(() => pagoDe(equipo, id)?.paseo === 'entregado', 'que el pago sepa que el paseo se entregó')

    // La familia no marca nada, ni «Vi el pago» (es del paseador).
    expect(await familia.remoto.moverPago(id, 'ver_pago')).toEqual({ ok: false, motivo: TEXTO_PAGO_SERVIDOR.soloPaseador })
    expect(await familia.remoto.moverPago(id, 'pagar_al_paseador')).toEqual({ ok: false, motivo: TEXTO_PAGO_SERVIDOR.soloEquipo })
    // Otro paseador tampoco: «Vi el pago» es solo del paseador de ese paseo.
    expect(await mateo.remoto.moverPago(id, 'ver_pago')).toEqual({ ok: false, motivo: TEXTO_PAGO_SERVIDOR.soloPaseador })
    expect((await s.pagoDe(id))?.estado).toBe('sin_pagar')

    // La paseadora ve el pago y, aun así, NO puede marcarse «pagado» ni decir «no lo encuentro»: eso es del equipo.
    expect((await lucia.remoto.moverPago(id, 'ver_pago')).ok).toBe(true)
    expect(await lucia.remoto.moverPago(id, 'pagar_al_paseador')).toEqual({ ok: false, motivo: TEXTO_PAGO_SERVIDOR.soloEquipo })
    expect(await lucia.remoto.moverPago(id, 'no_encontrado', { nota: 'No lo veo en mi cuenta' })).toEqual({ ok: false, motivo: TEXTO_PAGO_SERVIDOR.soloEquipo })
    expect((await s.pagoDe(id))?.estado).toBe('visto')
    expect(pagoDe(lucia, id)?.estado).toBe('visto')

    // Solo el equipo marca «Pagado al paseador».
    expect((await equipo.remoto.moverPago(id, 'pagar_al_paseador')).ok).toBe(true)
    expect((await s.pagoDe(id))?.estado).toBe('pagado_paseador')
  })

  prueba('una acción que no corresponde se rechaza con un texto claro y no rompe nada', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    const equipo = await telefono(s, EQUIPO)

    // Antes de que el paseo termine no hay nada que ver.
    const w = paseadoresDeVista(await familia.cliente.paseadoresPublicos()).find((x) => x.id === LUCIA)!
    const { job } = jobDeSolicitud({ walker: w })
    familia.actuar(() => job)
    await guardado(familia)
    // (Se espera también la solicitud en el teléfono de la paseadora: una bajada puede traer el pago un instante antes que el paseo.)
    await esperar(() => !!pagoDe(lucia, job.id) && !!pagoDe(equipo, job.id) && lucia.paseos().some((j) => j.id === job.id), 'que los dos vean el pago y la paseadora la solicitud')
    expect(await lucia.remoto.moverPago(job.id, 'ver_pago')).toEqual({ ok: false, motivo: TEXTO_PAGO_SERVIDOR.paseoNoTermino })
    expect(pagoDe(lucia, job.id)?.estado).toBe('sin_pagar')
    // Un pago que no existe.
    expect(await equipo.remoto.moverPago('no-existe', 'pagar_al_paseador')).toEqual({ ok: false, motivo: TEXTO_PAGO_SERVIDOR.noExiste })

    // Con el paseo entregado: el equipo no puede pagar lo que el paseador todavía no vio, ni decir «no lo encuentro» sin nota.
    for (const accion of ['aceptar', 'salir', 'recoger', 'entregar'] as const) {
      lucia.actuar((j) => moverPaseo(j, accion, 'paseador', Date.now()))
      await guardado(lucia)
    }
    await esperar(() => pagoDe(equipo, job.id)?.paseo === 'entregado', 'que el pago sepa que el paseo se entregó')
    expect((await equipo.remoto.moverPago(job.id, 'pagar_al_paseador')).ok).toBe(false)
    expect((await s.pagoDe(job.id))?.estado).toBe('sin_pagar')
    expect(await lucia.remoto.moverPago(job.id, 'ver_pago')).toMatchObject({ ok: true })
    expect(await equipo.remoto.moverPago(job.id, 'no_encontrado')).toEqual({ ok: false, motivo: TEXTO_PAGO_SERVIDOR.notaObligatoria })
    expect(await equipo.remoto.moverPago(job.id, 'no_encontrado', { nota: '  ' })).toEqual({ ok: false, motivo: TEXTO_PAGO_SERVIDOR.notaObligatoria })
    // Una acción desconocida tampoco llega a cambiar nada (el cliente de Supabase la manda tal cual).
    await expect(equipo.cliente.moverPago(job.id, 'inventada' as never)).rejects.toBeInstanceOf(ErrorDeBase)
    expect((await s.pagoDe(job.id))?.estado).toBe('visto')

    // «No lo encuentro» con nota: queda a la vista de la familia y del paseador; el paseador puede volver a decir «Vi el pago».
    expect((await equipo.remoto.moverPago(job.id, 'no_encontrado', { nota: 'No aparece en mi Yape' })).ok).toBe(true)
    await esperar(() => noEncontrados(familia.pagos()).length === 1, 'que la familia vea la nota del equipo')
    expect(pagoDe(familia, job.id)).toMatchObject({ estado: 'no_encontrado', nota: 'No aparece en mi Yape' })
    // Mientras el equipo no lo encuentre, la familia sigue debiendo: no puede pedir otro paseo.
    expect(pagoPendiente(familia.pagos())?.id).toBe(job.id)
    // La paseadora vuelve a decir «Vi el pago» (ya lo aclararon): la nota se limpia y la familia queda al día.
    expect((await lucia.remoto.moverPago(job.id, 'ver_pago')).ok).toBe(true)
    await esperar(() => pagoDe(familia, job.id)?.estado === 'visto', 'que la familia vea el pago visto de nuevo')
    expect(pagoDe(familia, job.id)?.nota).toBeUndefined()
    expect(pagoPendiente(familia.pagos())).toBeNull()
  })

  prueba('sin internet la acción espera y NADA queda marcado; al volver se envía una sola vez', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    const equipo = await telefono(s, EQUIPO)
    const id = await pedirYEntregar(s, familia, lucia, LUCIA)
    await esperar(() => pagoDe(equipo, id)?.paseo === 'entregado', 'que el pago sepa que el paseo se entregó')

    // La paseadora toca «Vi el pago» sin internet, dos veces (doble toque): queda UNA acción en la cola.
    lucia.cliente.fallarConRed('siempre')
    const a = lucia.remoto.moverPago(id, 'ver_pago', { hora: '11:05' })
    const b = lucia.remoto.moverPago(id, 'ver_pago', { hora: '11:05' })
    expect(a).toBe(b)
    await esperar(() => lucia.copia.estadoConexion() === 'sin_conexion', 'que la app diga que no hay conexión')
    expect(lucia.remoto.pagosEnCola()).toEqual([{ id, accion: 'ver_pago' }])
    expect(pagoDe(lucia, id)?.estado).toBe('sin_pagar') // no se marca nada sin la respuesta de la base
    expect((await s.pagoDe(id))?.estado).toBe('sin_pagar')

    // Vuelve internet: se envía sola y la base la recibe una vez.
    lucia.cliente.fallarConRed(0)
    const r = await a
    expect(r.ok).toBe(true)
    expect(lucia.remoto.pagosEnCola()).toEqual([])
    expect((await s.pagoDe(id))?.estado).toBe('visto')
    expect(pagoDe(lucia, id)).toMatchObject({ estado: 'visto', horaPago: '11:05' })

    // El equipo, sin internet, tampoco queda «pagado» a la vista hasta que la base lo confirme.
    equipo.cliente.fallarConRed('siempre')
    const pagar = equipo.remoto.moverPago(id, 'pagar_al_paseador')
    await esperar(() => equipo.remoto.pagosEnCola().length === 1, 'que la acción quede en la cola')
    await new Promise((r2) => setTimeout(r2, 80))
    expect(pagoDe(equipo, id)?.estado).not.toBe('pagado_paseador')
    expect((await s.pagoDe(id))?.estado).toBe('visto')
    equipo.cliente.fallarConRed(0)
    expect((await pagar).ok).toBe(true)
    expect((await s.pagoDe(id))?.estado).toBe('pagado_paseador')
  })

  prueba('si la respuesta se perdió, el reintento no repite la acción: la base ya la tenía y se da por hecha', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    const id = await pedirYEntregar(s, familia, lucia, LUCIA)
    await esperar(() => pagoDe(lucia, id)?.paseo === 'entregado', 'que el pago sepa que el paseo se entregó')

    // El primer intento SÍ llegó a la base, pero la respuesta se perdió (se cortó internet justo después).
    const original = lucia.cliente.moverPago.bind(lucia.cliente)
    let intentos = 0
    lucia.cliente.moverPago = async (...a) => {
      intentos += 1
      const fila = await original(...a)
      if (intentos === 1) throw new ErrorDeBase('Failed to fetch', 0)
      return fila
    }
    const r = await lucia.remoto.moverPago(id, 'ver_pago', { hora: '09:30' })
    expect(r.ok).toBe(true)
    expect(intentos).toBe(2) // el segundo intento fue rechazado por la base («ya está visto») y se tomó como hecho
    const enBase = await s.pagoDe(id)
    expect(enBase?.estado).toBe('visto')
    expect(enBase?.hora_pago).toBe('09:30')
    expect(pagoDe(lucia, id)).toMatchObject({ estado: 'visto', horaPago: '09:30' })
  })

  prueba('dónde cobra el paseador: lo guarda él, lo ve el equipo y la familia nunca', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    const mateo = await telefono(s, MATEO)
    const equipo = await telefono(s, EQUIPO)

    // Lucía cambia a Plin: sube SOLO su fila.
    lucia.copia.guardar(CLAVES.cobros, { [LUCIA]: { metodo: 'plin', telefono: '912 345 678', titular: 'Lucía Quispe' } })
    expect(await lucia.copia.yaSeGuardo(CLAVES.cobros)).toBe('guardado')
    expect(await s.contar('cobros_paseador')).toBe(2)
    expect((await equipo.cliente.listarCobros([LUCIA]))[0]).toMatchObject({ metodo: 'plin', celular: '+51912345678', titular: 'Lucía Quispe' })
    expect(await familia.cliente.listarCobros([LUCIA])).toEqual([])
    expect(await mateo.cliente.listarCobros([LUCIA])).toEqual([])

    // Un cobro incompleto no se sube; el de otra persona, tampoco (la base lo rechaza).
    lucia.copia.guardar(CLAVES.cobros, { [LUCIA]: { metodo: 'plin', telefono: '123', titular: '' } })
    expect(await lucia.copia.yaSeGuardo(CLAVES.cobros)).toBe('guardado')
    expect((await equipo.cliente.listarCobros([LUCIA]))[0]).toMatchObject({ celular: '+51912345678' })
    await expect(mateo.cliente.guardarCobro({ paseador_id: LUCIA, metodo: 'yape', celular: '900000000', titular: 'Intruso' })).rejects.toBeInstanceOf(ErrorDeBase)
    await expect(familia.cliente.guardarCobro({ paseador_id: FAMILIA_A, metodo: 'yape', celular: '900000000', titular: 'Valeria' })).rejects.toBeInstanceOf(ErrorDeBase)
    expect((await equipo.cliente.listarCobros([LUCIA]))[0]).toMatchObject({ metodo: 'plin', celular: '+51912345678' })
  })

  prueba('con un pago pendiente la base no deja pedir otro paseo (y la pantalla dice por qué); al mostrar el pago, sí', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    const id = await pedirYEntregar(s, familia, lucia, LUCIA)
    await esperar(() => pagoPendiente(familia.pagos())?.id === id, 'que la familia vea que debe el paseo')

    // La app ya frena el botón de reservar; aquí se prueba la base (por ejemplo, con datos viejos en el teléfono).
    const mateo = paseadoresDeVista(await familia.cliente.paseadoresPublicos()).find((x) => x.id === MATEO)!
    const rechazos: string[] = []
    familia.copia.suscribirRechazos((r) => rechazos.push(r.mensaje))
    const { job: otro } = jobDeSolicitud({ walker: mateo, hora: 14 })
    familia.actuar(() => otro)
    await esperar(() => rechazos.length === 1, 'el aviso de que la base no dejó pedir otro paseo')
    expect(rechazos[0]).toBe(TEXTO_SERVIDOR.pagoPendiente)
    expect(await s.contar('paseos')).toBe(1)
    await esperar(() => !familia.paseos().some((j) => j.id === otro.id), 'que la solicitud rechazada salga de la copia')

    // La paseadora ve el pago («Vi el pago»): la familia ya no debe nada y puede pedir otro paseo.
    const visto = await lucia.remoto.moverPago(id, 'ver_pago', { hora: '11:15' })
    expect(visto.ok).toBe(true)
    await esperar(() => pagoPendiente(familia.pagos()) === null, 'que la familia deje de deber')
    const { job: segundo } = jobDeSolicitud({ walker: mateo, hora: 15 })
    familia.actuar(() => segundo)
    await esperar(async () => (await s.contar('paseos')) === 2, 'que el segundo paseo llegue a la base')
    expect(rechazos).toHaveLength(1)
  })
})
