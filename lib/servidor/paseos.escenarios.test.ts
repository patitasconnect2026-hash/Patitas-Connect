/**
 * Los paseos con el servidor, de punta a punta y SIN red: dos teléfonos (una familia y una paseadora) con la copia en
 * memoria de la app, conectados a un servidor de prueba. Cada escenario corre dos veces:
 *   1. contra el servidor simulado en memoria (siempre), y
 *   2. contra las migraciones SQL de verdad en PGlite, si está instalado (`npm i --no-save @electric-sql/pglite@0.2.17`).
 * Así lo que se prueba es la lógica de la app Y que coincide con las reglas reales de la base.
 */
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { CLAVES } from '../datos/claves'
import { RechazoDelServidor } from '../datos/adaptador'
import { confirmarEntregaJob, moverPaseo, type Job } from '../bus'
import { DEMO_DOGS } from '../data'
import { necesitaReasignacion, paseadoresCompatibles } from '../reasignacion'
import { solicitudVencida } from '../paseo'
import { paseadoresDeVista } from './paseadoresReales'
import { TEXTO_SERVIDOR } from './paseosTextos'
import { crearServidorFalso, type ServidorDePrueba } from './pruebas/servidorFalso'
import { crearServidorHttp } from './pruebas/servidorHttp'
import { crearServidorPglite } from './pruebas/servidorPglite'
import { abrirTelefono, esperar, jobDeSolicitud, type Telefono } from './pruebas/telefonos'

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
  await s.paseadorAprobado({ id: LUCIA, nombre: 'Lucía', apellido: 'Quispe' })
  await s.paseadorAprobado({ id: MATEO, nombre: 'Mateo', apellido: 'Rojas', perfil: { rate: 25, sizes: ['small', 'medium', 'large'], times: ['Mañana (6–12)', 'Tarde (12–18)'] } })
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

const fabricas: Array<[string, () => Promise<ServidorDePrueba | null>, boolean]> = [
  ['servidor simulado', async () => crearServidorFalso(), true],
  ['reglas SQL en PGlite', () => crearServidorPglite(RAIZ), hayPglite],
  ['cliente de Supabase por HTTP sobre PGlite', () => crearServidorHttp(RAIZ), hayPglite],
]

describe.each(fabricas)('paseos con el servidor · %s', (_nombre, fabrica, disponible) => {
  const prueba = it.skipIf(!disponible)

  prueba('la familia pide a una paseadora real, ella lo ve en SU teléfono, acepta y el recorrido llega hasta cerrar', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A, { emergencia: { nombre: 'Marta', telefono: '999111222' } })
    const lucia = await telefono(s, LUCIA)

    // La lista sale de la vista pública: solo aprobadas, sin DNI completo y sin la palabra «verificado».
    const walkers = paseadoresDeVista(await familia.cliente.paseadoresPublicos())
    expect(walkers.map((w) => w.firstName).sort()).toEqual(['Lucía', 'Mateo'])
    const wLucia = walkers.find((w) => w.id === LUCIA)!
    expect(wLucia.dni).toBe('678')
    expect(wLucia.deServidor).toBe(true)
    expect(JSON.stringify(wLucia)).not.toMatch(/verificad/i)

    // La familia envía la solicitud.
    const { job } = jobDeSolicitud({ walker: wLucia, emergencia: { nombre: 'Marta', telefono: '999111222' } })
    familia.actuar(() => job)
    await guardado(familia)
    expect(await s.contar('paseos')).toBe(1)
    expect(await s.contar('codigos_recojo')).toBe(1)
    expect(await s.contar('casas')).toBe(1)
    expect(await s.contar('perros')).toBe(1)
    expect(await s.estadoDe(job.id)).toBe('solicitado')

    // La paseadora lo ve en su teléfono (sondeo), pero sin la dirección, la ficha ni el código.
    await esperar(() => lucia.paseos().length === 1, 'que la paseadora vea la solicitud')
    const vistoPorLucia = lucia.activo()!
    expect(vistoPorLucia.id).toBe(job.id)
    expect(vistoPorLucia.paseo.estado).toBe('solicitado')
    expect(vistoPorLucia.dog.name).toBe('Max')
    expect(vistoPorLucia.address).toBe('')
    expect(vistoPorLucia.pin).toBe('')
    expect(vistoPorLucia.dog.medical).toBe('')
    expect(vistoPorLucia.walkerPay).toBeGreaterThan(0)
    // No puede comprobar el código antes de aceptar.
    expect(await lucia.cliente.verificarCodigo(job.id, job.pin)).toBe(false)

    // Acepta.
    lucia.actuar((j) => moverPaseo(j, 'aceptar', 'paseador', Date.now()))
    await guardado(lucia)
    expect(await s.estadoDe(job.id)).toBe('aceptado')

    // Ahora sí ve la dirección y la ficha completa.
    await esperar(() => lucia.activo()?.address !== '' && lucia.activo()?.fichaPendiente !== true, 'que llegue la ficha y la dirección')
    const aceptado = lucia.activo()!
    expect(aceptado.address).toContain('Lizardo Alzamora')
    expect(aceptado.doormanName).toBe('Don Luis')
    expect(aceptado.dog.medical).toBe(DEMO_DOGS[0].medical)
    expect(aceptado.emergencia).toEqual({ nombre: 'Marta', telefono: '999111222' })
    expect(aceptado.pin).toBe('')

    // La familia ve que aceptó, con su código de recojo (que ella sí lee).
    await esperar(() => familia.activo()?.paseo.estado === 'aceptado', 'que la familia vea que aceptó')
    expect(familia.activo()!.pin).toBe(job.pin)

    // El código lo compara la base: uno equivocado no entra, el correcto sí.
    expect(await lucia.cliente.verificarCodigo(job.id, job.pin === '0000' ? '1111' : '0000')).toBe(false)
    expect(await lucia.cliente.verificarCodigo(job.id, job.pin)).toBe(true)

    // Sale, recoge, anota en la bitácora y entrega.
    lucia.actuar((j) => moverPaseo(j, 'salir', 'paseador', Date.now()))
    await guardado(lucia)
    lucia.actuar((j) => moverPaseo(j, 'recoger', 'paseador', Date.now()))
    await guardado(lucia)
    lucia.anotar({ id: 'ev-1', kind: 'pee', text: 'Max hizo pipí 💦', at: Date.now(), jobId: job.id })
    expect(await lucia.copia.yaSeGuardo(CLAVES.eventos)).toBe('guardado')
    await esperar(() => familia.bitacora().some((e) => e.id === 'ev-1'), 'que la familia vea la bitácora')
    lucia.actuar((j) => moverPaseo(j, 'entregar', 'paseador', Date.now(), 'Con el código de recojo.'))
    await guardado(lucia)
    expect(await s.estadoDe(job.id)).toBe('entregado')

    // La familia confirma la entrega: el paseo se cierra y el registro queda en orden, con el autor de cada paso.
    await esperar(() => familia.activo()?.paseo.estado === 'entregado', 'que la familia vea la entrega')
    familia.actuar((j) => confirmarEntregaJob(j, Date.now()))
    await guardado(familia)
    expect(await s.estadoDe(job.id)).toBe('cerrado')
    await esperar(() => familia.activo()?.paseo.estado === 'cerrado' && familia.activo()!.paseo.eventos.length >= 7, 'el registro completo')
    const acciones = familia.activo()!.paseo.eventos.map((e) => e.accion)
    expect(acciones).toEqual(['solicitar', 'aceptar', 'salir', 'recoger', 'entregar', 'confirmar_entrega', 'cerrar'])
    expect(familia.activo()!.paseo.eventos.map((e) => e.quien)).toEqual(['dueno', 'paseador', 'paseador', 'paseador', 'paseador', 'dueno', 'sistema'])
  })

  prueba('si la paseadora rechaza, la familia ve la reasignación con paseadores libres de la lista pública', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    const walkers = paseadoresDeVista(await familia.cliente.paseadoresPublicos())
    const { job, booking } = jobDeSolicitud({ walker: walkers.find((w) => w.id === LUCIA)! })
    familia.actuar(() => job)
    await guardado(familia)
    await esperar(() => lucia.paseos().length === 1, 'que la paseadora vea la solicitud')

    lucia.actuar((j) => moverPaseo(j, 'rechazar', 'paseador', Date.now()))
    await guardado(lucia)
    await esperar(() => familia.activo()?.paseo.estado === 'rechazado', 'que la familia vea el rechazo')

    expect(necesitaReasignacion(familia.activo()!.paseo)).toBe(true)
    const opciones = paseadoresCompatibles({ walkers, dog: booking.dog, dayIdx: booking.dayIdx, hour: booking.startHour, excluirId: LUCIA })
    expect(opciones.map((w) => w.id)).toEqual([MATEO])

    // Elige a Mateo y la familia vuelve a pedir: ahora hay dos paseos en la base, cada uno con su paseador.
    const nuevo = jobDeSolicitud({ walker: opciones[0], hora: booking.startHour }).job
    familia.actuar(() => nuevo)
    await guardado(familia)
    expect(await s.contar('paseos')).toBe(2)
    const mateo = await telefono(s, MATEO)
    await esperar(() => mateo.paseos().length === 1, 'que Mateo vea la nueva solicitud')
    expect(mateo.activo()!.id).toBe(nuevo.id)
    expect(lucia.paseos().map((j) => j.id)).toEqual([job.id])
  })

  prueba('si vence el plazo o la paseadora cancela, también hay reasignación', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    const wLucia = paseadoresDeVista(await familia.cliente.paseadoresPublicos()).find((w) => w.id === LUCIA)!

    // Vence el plazo: lo hace «el sistema», desde cualquiera de las dos apps (aquí, la de la familia).
    const a = jobDeSolicitud({ walker: wLucia, ahora: Date.now() - 3 * 60 * 60_000 }).job
    familia.actuar(() => a)
    await guardado(familia)
    expect(solicitudVencida(familia.activo()!.paseo, Date.now(), 120)).toBe(true)
    familia.actuar((j) => moverPaseo(j, 'expirar', 'sistema', Date.now()))
    await guardado(familia)
    expect(await s.estadoDe(a.id)).toBe('expirado')
    expect(necesitaReasignacion(familia.activo()!.paseo)).toBe(true)

    // La paseadora acepta otra y después cancela ella: la familia lo ve como «canceló la paseadora».
    const b = jobDeSolicitud({ walker: wLucia, hora: 11 }).job
    familia.actuar(() => b)
    await guardado(familia)
    await esperar(() => lucia.paseos().length === 2, 'que Lucía vea las dos solicitudes')
    lucia.actuar((j) => moverPaseo(j, 'aceptar', 'paseador', Date.now()))
    await guardado(lucia)
    lucia.actuar((j) => moverPaseo(j, 'cancelar', 'paseador', Date.now()))
    await guardado(lucia)
    await esperar(() => familia.activo()?.paseo.estado === 'cancelado', 'que la familia vea la cancelación')
    expect(necesitaReasignacion(familia.activo()!.paseo)).toBe(true)
  })

  prueba('cada persona ve solo lo suyo: la familia B no ve los paseos de A y el paseador Mateo no ve los de Lucía', async () => {
    const s = await nuevoServidor(fabrica)
    const familiaA = await telefono(s, FAMILIA_A)
    const wLucia = paseadoresDeVista(await familiaA.cliente.paseadoresPublicos()).find((w) => w.id === LUCIA)!
    const { job } = jobDeSolicitud({ walker: wLucia })
    familiaA.actuar(() => job)
    await guardado(familiaA)

    const familiaB = await telefono(s, FAMILIA_B)
    const mateo = await telefono(s, MATEO)
    const equipo = await telefono(s, EQUIPO)
    await esperar(() => equipo.paseos().length === 1, 'que el equipo vea el paseo')
    expect(familiaB.paseos()).toEqual([])
    expect(mateo.paseos()).toEqual([])
    expect(familiaB.bitacora()).toEqual([])
    // Ni por la base: sus consultas vuelven vacías.
    expect(await familiaB.cliente.listarPaseos(50)).toEqual([])
    expect(await mateo.cliente.listarPaseos(50)).toEqual([])
    expect(await mateo.cliente.listarEventos([job.id])).toEqual([])
    expect(await familiaB.cliente.listarCodigos([job.id])).toEqual([])
    expect(await mateo.cliente.verificarCodigo(job.id, job.pin)).toBe(false)
    expect(equipo.copia.identidad()).toEqual({ rol: 'equipo', id: EQUIPO })
  })

  prueba('el paseador no lee el código de recojo ni la casa antes de aceptar; 5 fallos bloquean el código', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    const wLucia = paseadoresDeVista(await familia.cliente.paseadoresPublicos()).find((w) => w.id === LUCIA)!
    const { job } = jobDeSolicitud({ walker: wLucia })
    familia.actuar(() => job)
    await guardado(familia)
    await esperar(() => lucia.paseos().length === 1, 'que la paseadora vea la solicitud')

    expect(await lucia.cliente.listarCodigos([job.id])).toEqual([])
    expect(await lucia.cliente.listarCasas([FAMILIA_A])).toEqual([])
    lucia.actuar((j) => moverPaseo(j, 'aceptar', 'paseador', Date.now()))
    await guardado(lucia)
    expect(await lucia.cliente.listarCodigos([job.id])).toEqual([])
    expect((await lucia.cliente.listarCasas([FAMILIA_A])).length).toBe(1)

    const malo = job.pin === '0000' ? '1111' : '0000'
    for (let i = 0; i < 5; i++) expect(await lucia.cliente.verificarCodigo(job.id, malo)).toBe(false)
    // Bloqueado: ni el correcto entra (lo reinicia el equipo en la base).
    expect(await lucia.cliente.verificarCodigo(job.id, job.pin)).toBe(false)
  })

  prueba('un cambio que la base no acepta se descarta con un texto claro y la copia vuelve a lo que dice la base', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    const wLucia = paseadoresDeVista(await familia.cliente.paseadoresPublicos()).find((w) => w.id === LUCIA)!
    const { job } = jobDeSolicitud({ walker: wLucia })
    familia.actuar(() => job)
    await guardado(familia)
    await esperar(() => lucia.paseos().length === 1, 'que la paseadora vea la solicitud')

    // La familia cancela. Lucía todavía no se enteró (su copia dice «solicitado») y toca «Aceptar».
    familia.actuar((j) => moverPaseo(j, 'cancelar', 'dueno', Date.now()))
    await guardado(familia)
    expect(await s.estadoDe(job.id)).toBe('cancelado')
    lucia.remoto.detener()
    const rechazos: string[] = []
    lucia.copia.suscribirRechazos((r) => rechazos.push(r.mensaje))
    expect(lucia.activo()!.paseo.estado).toBe('solicitado')
    lucia.actuar((j) => moverPaseo(j, 'aceptar', 'paseador', Date.now()))
    // En su pantalla ya figura aceptado (guardado al instante), hasta que la base responde.
    expect(lucia.activo()!.paseo.estado).toBe('aceptado')
    await esperar(() => rechazos.length === 1, 'el aviso de que la base dijo que no')
    expect(rechazos[0]).toBe(TEXTO_SERVIDOR.cambioYaNoVale)
    // La base sigue como estaba y no se rompió nada.
    expect(await s.estadoDe(job.id)).toBe('cancelado')
    expect(await lucia.copia.yaSeGuardo(CLAVES.paseo)).toBe('guardado')
    expect(lucia.copia.estadoConexion()).toBe('conectado')
  })

  prueba('si las dos apps hacen vencer la misma solicitud a la vez, gana una y a nadie se le avisa de un «no»', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    const wLucia = paseadoresDeVista(await familia.cliente.paseadoresPublicos()).find((w) => w.id === LUCIA)!
    const { job } = jobDeSolicitud({ walker: wLucia, ahora: Date.now() - 3 * 60 * 60_000 })
    familia.actuar(() => job)
    await guardado(familia)
    await esperar(() => lucia.paseos().length === 1, 'que la paseadora vea la solicitud')
    // Las dos copias dicen «solicitado» y las dos apps «hacen» vencer la solicitud (lo hace el sistema).
    const avisos: string[] = []
    familia.copia.suscribirRechazos((r) => r.mensaje && avisos.push(r.mensaje))
    lucia.copia.suscribirRechazos((r) => r.mensaje && avisos.push(r.mensaje))
    familia.remoto.detener()
    lucia.remoto.detener()
    familia.actuar((j) => moverPaseo(j, 'expirar', 'sistema', Date.now()))
    lucia.actuar((j) => moverPaseo(j, 'expirar', 'sistema', Date.now()))
    await guardado(familia)
    await guardado(lucia)
    await new Promise((r) => setTimeout(r, 60))
    expect(await s.estadoDe(job.id)).toBe('expirado')
    expect(avisos).toEqual([])
    expect(await s.contar('paseo_eventos')).toBe(2)
  })

  prueba('transiciones que no existen o que no le tocan a esa persona las rechaza la base, sin romper la copia', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const wLucia = paseadoresDeVista(await familia.cliente.paseadoresPublicos()).find((w) => w.id === LUCIA)!
    const { job } = jobDeSolicitud({ walker: wLucia })
    familia.actuar(() => job)
    await guardado(familia)

    // Directo a la base (como lo haría una app manipulada): el cliente de la familia intenta aceptar por la paseadora.
    await expect(familia.cliente.cambiarPaseo(job.id, { estado: 'aceptado' }, 'solicitado')).rejects.toMatchObject({ code: '42501' })
    // Y saltarse estados: solicitado → cerrado no existe.
    const lucia = await telefono(s, LUCIA)
    await expect(lucia.cliente.cambiarPaseo(job.id, { estado: 'cerrado' })).rejects.toMatchObject({ code: '22023' })
    // Quien no participa: 0 filas, sin error.
    const mateo = await telefono(s, MATEO)
    expect(await mateo.cliente.cambiarPaseo(job.id, { estado: 'aceptado' }, 'solicitado')).toBe(0)
    expect(await s.estadoDe(job.id)).toBe('solicitado')
  })

  prueba('sin internet: el cambio queda en la copia, se dice que no hay conexión y se envía solo al volver (sin duplicar)', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const wLucia = paseadoresDeVista(await familia.cliente.paseadoresPublicos()).find((w) => w.id === LUCIA)!
    const { job } = jobDeSolicitud({ walker: wLucia })

    familia.cliente.fallarConRed('siempre')
    familia.actuar(() => job)
    // La copia lo tiene al instante; lo que la persona hizo no se pierde.
    expect(familia.activo()!.id).toBe(job.id)
    await esperar(() => familia.copia.estadoConexion() === 'sin_conexion', 'que diga que no hay conexión')
    expect(await familia.copia.yaSeGuardo(CLAVES.paseo)).toBe('error')
    expect(await s.contar('paseos')).toBe(0)
    expect(familia.activo()!.id).toBe(job.id)

    // Vuelve el internet: se reintenta solo y llega una sola vez.
    familia.cliente.fallarConRed(0)
    familia.copia.reintentar()
    await esperar(async () => (await s.contar('paseos')) === 1, 'que llegue la solicitud al volver el internet')
    await guardado(familia)
    expect(familia.copia.estadoConexion()).toBe('conectado')
    expect(await s.contar('paseos')).toBe(1)
    expect(await s.contar('codigos_recojo')).toBe(1)
    expect(await s.contar('paseo_eventos')).toBe(1)
  })

  prueba('sin internet al abrir: no queda una pantalla en blanco; dice que no hay conexión y baja todo al volver', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const wLucia = paseadoresDeVista(await familia.cliente.paseadoresPublicos()).find((w) => w.id === LUCIA)!
    const { job } = jobDeSolicitud({ walker: wLucia })
    familia.actuar(() => job)
    await guardado(familia)

    // Un teléfono que se abre sin internet.
    const s2 = s.cliente(FAMILIA_A)
    s2.fallarConRed('siempre')
    const t = abrirTelefono({ ...s, cliente: () => s2 } as ServidorDePrueba, FAMILIA_A)
    abiertos.push(t)
    await esperar(() => t.copia.estadoConexion() === 'sin_conexion', 'que diga que no hay conexión al abrir')
    expect(t.copia.listo()).toBe(false)
    expect(t.paseos()).toEqual([])
    s2.fallarConRed(0)
    await t.copia.alEstarListo()
    expect(t.copia.estadoConexion()).toBe('conectado')
    await esperar(() => t.paseos().length === 1, 'que bajen los paseos al volver el internet')
  })

  prueba('sin internet y sin nada pendiente: el sondeo también avisa «sin conexión» y se recupera solo', async () => {
    const s = await nuevoServidor(fabrica)
    const lucia = await telefono(s, LUCIA)
    expect(lucia.copia.estadoConexion()).toBe('conectado')
    const cambios: string[] = []
    lucia.copia.suscribirGuardado(() => cambios.push(lucia.copia.estadoConexion()))
    lucia.cliente.fallarConRed('siempre')
    await esperar(() => lucia.copia.estadoConexion() === 'sin_conexion', 'que el sondeo avise que no hay conexión')
    lucia.cliente.fallarConRed(0)
    await esperar(() => lucia.copia.estadoConexion() === 'conectado', 'que vuelva a decir conectado')
    expect(cambios).toContain('sin_conexion')
    expect(cambios.at(-1)).toBe('conectado')
  })

  prueba('lo que el paseador anota en la bitácora llega a la familia y no se duplica al reintentar', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    const wLucia = paseadoresDeVista(await familia.cliente.paseadoresPublicos()).find((w) => w.id === LUCIA)!
    const { job } = jobDeSolicitud({ walker: wLucia })
    familia.actuar(() => job)
    await guardado(familia)
    await esperar(() => lucia.paseos().length === 1, 'que la paseadora vea la solicitud')
    lucia.actuar((j) => moverPaseo(j, 'aceptar', 'paseador', Date.now()))
    await guardado(lucia)

    lucia.cliente.fallarConRed(1)
    lucia.anotar({ id: 'a1', kind: 'water', text: 'Pausa para tomar agua 💧', at: Date.now(), jobId: job.id })
    expect(await lucia.copia.yaSeGuardo(CLAVES.eventos)).toBe('error')
    lucia.copia.reintentar()
    await esperar(() => familia.bitacora().length === 1, 'que la familia vea el aviso')
    expect(await s.contar('bitacora')).toBe(1)
    expect(familia.bitacora()[0]).toMatchObject({ id: 'a1', kind: 'water', jobId: job.id })
  })

  prueba('sin sesión no hay nada: el cliente sin sesión no ve ni escribe paseos', async () => {
    const s = await nuevoServidor(fabrica)
    const sin = await telefono(s, null)
    expect(sin.copia.identidad()).toBeNull()
    expect(sin.paseos()).toEqual([])
    expect(await sin.cliente.sesion()).toBeNull()
    await expect(sin.cliente.paseadoresPublicos()).rejects.toMatchObject({ status: 401 })
  })

  prueba('el paseador cierra el paseo en su pantalla y deja de verlo; la familia lo sigue viendo', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    const wLucia = paseadoresDeVista(await familia.cliente.paseadoresPublicos()).find((w) => w.id === LUCIA)!
    const { job } = jobDeSolicitud({ walker: wLucia })
    familia.actuar(() => job)
    await guardado(familia)
    await esperar(() => lucia.paseos().length === 1, 'que la paseadora vea la solicitud')
    lucia.actuar((j) => moverPaseo(j, 'rechazar', 'paseador', Date.now()))
    await guardado(lucia)
    lucia.actuar((j: Job | null) => (j ? { ...j, cerradoPaseador: true } : j))
    await guardado(lucia)
    expect(lucia.activo()).toBeNull()
    await esperar(async () => (await s.cliente(LUCIA).listarPaseos(5)).some((p) => p.cerrado_paseador === true), 'que quede marcado en la base')
    await esperar(() => familia.activo()?.paseo.estado === 'rechazado', 'que la familia vea el rechazo')
    // La familia lo sigue viendo (el paseo es de los dos; «cerrado» solo oculta la tarjeta en la pantalla del paseador).
    expect(familia.activo()!.id).toBe(job.id)
  })

  prueba('un rechazo es un `RechazoDelServidor`: no se reintenta (una sola llamada a la base)', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    // Una paseadora que ya no está aprobada: la base no deja pedirle un paseo.
    const fantasma = paseadoresDeVista(await familia.cliente.paseadoresPublicos()).find((w) => w.id === LUCIA)!
    const { job } = jobDeSolicitud({ walker: { ...fantasma, id: 'bbbbbbbb-0000-4000-8000-0000000000ff' } })
    const rechazos: RechazoDelServidor[] = []
    familia.copia.suscribirRechazos((r) => rechazos.push(new RechazoDelServidor(r.mensaje, r.codigo)))
    familia.actuar(() => job)
    await esperar(() => rechazos.length === 1, 'el aviso de que no se pudo enviar')
    expect(rechazos[0].mensaje).toBe(TEXTO_SERVIDOR.solicitudNoSePudo)
    expect(await s.contar('paseos')).toBe(0)
    const llamadas = familia.cliente.conteo().crearPaseo
    await new Promise((r) => setTimeout(r, 120))
    expect(familia.cliente.conteo().crearPaseo).toBe(llamadas)
    // Y la solicitud desaparece de la copia (no queda una «solicitud enviada» que no existe).
    await esperar(() => familia.paseos().length === 0, 'que la solicitud rechazada salga de la copia')
  })
})
