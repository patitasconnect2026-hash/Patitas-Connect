/**
 * Los casos y disputas con el servidor (paso 7b), de punta a punta y SIN red: la familia, el paseador y el equipo, cada uno con
 * la copia en memoria de la app conectada a un servidor de prueba con SU sesión. Cada escenario corre tres veces:
 *   1. contra el servidor simulado en memoria (siempre),
 *   2. contra las migraciones SQL de verdad en PGlite, y
 *   3. con el cliente de Supabase de verdad por HTTP contra el servidor simulado sobre PGlite
 * (las dos últimas solo si PGlite está instalado: `npm i --no-save @electric-sql/pglite@0.2.17`).
 *
 * Se comprueba lo que pidió el plan: el reporte de la familia o del paseador llega al equipo; solo el equipo resuelve; la otra
 * familia no ve nada; sin internet el caso espera y sale sin duplicarse; la foto del reporte no sube.
 */
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { moverPaseo, reportarJob, resolverJob } from '../bus'
import { abrirCaso, casoDePago, casoDeReporte, casoEntregaSinConfirmar, resolverCaso, type Caso, type Reporte } from '../casos'
import { CLAVES } from '../datos/claves'
import { filaDeCaso } from './casosMapeo'
import { paseadoresDeVista } from './paseadoresReales'
import { ErrorDeBase } from './paseosTipos'
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

/** Con HTTP y PGlite cada vuelta a la base tarda más (y más aún con la computadora ocupada): se espera hasta 45 s. */
const esperar = (condicion: () => boolean | Promise<boolean>, descripcion: string) => esperarPoco(condicion, descripcion, 45_000)

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
  await s.paseadorAprobado({ id: MATEO, nombre: 'Mateo', apellido: 'Rojas' })
  return s
}

async function telefono(s: ServidorDePrueba, uid: string | null): Promise<Telefono> {
  // Cada teléfono pregunta cada 80 ms (no cada 30): con cinco teléfonos y la computadora ocupada, menos vueltas a la base de prueba.
  const t = abrirTelefono(s, uid, { intervaloMs: 80 })
  abiertos.push(t)
  await t.copia.alEstarListo()
  return t
}

const guardado = async (t: Telefono, clave: string = CLAVES.paseo) => expect(await t.copia.yaSeGuardo(clave)).toBe('guardado')
const casosDe = (t: Telefono) => t.copia.leer<Caso[]>(CLAVES.casos, [])
/** Lo mismo que `abrirCasoEnCola`: suma el caso a la cola (sin repetir uno abierto del mismo paseo y tipo). */
const abrir = (t: Telefono, caso: Caso) => t.copia.guardar(CLAVES.casos, abrirCaso(casosDe(t), caso))

/** La familia pide y la paseadora acepta, sale y recoge: el paseo queda «en_paseo». */
async function pedirYSalir(familia: Telefono, paseador: Telefono, paseadorId: string, hora = 10): Promise<string> {
  const w = paseadoresDeVista(await familia.cliente.paseadoresPublicos()).find((x) => x.id === paseadorId)!
  const { job } = jobDeSolicitud({ walker: w, hora })
  familia.actuar(() => job)
  await guardado(familia)
  await esperar(() => paseador.paseos().some((j) => j.id === job.id), 'que el paseador vea la solicitud')
  for (const accion of ['aceptar', 'salir', 'recoger'] as const) {
    paseador.actuar((j) => moverPaseo(j, accion, 'paseador', Date.now()))
    await guardado(paseador)
  }
  await esperar(() => familia.paseos().some((j) => j.id === job.id && j.paseo.estado === 'en_paseo'), 'que la familia vea el paseo en marcha')
  return job.id
}

const REPORTE: Reporte = { quien: 'dueno', motivo: 'trato', texto: 'El paseador llegó tarde y no avisó.', at: Date.now(), foto: 'data:image/jpeg;base64,AAAA' }

/** «Reportar problema» como lo hace la app de la familia: el paseo pasa a «en_disputa» y el caso entra a la cola. */
async function reportar(t: Telefono, reporte: Reporte = REPORTE) {
  t.actuar((j) => reportarJob(j, reporte))
  const job = t.activo()!
  abrir(t, casoDeReporte(job, reporte))
  return job
}

const fabricas: Array<[string, () => Promise<ServidorDePrueba | null>, boolean]> = [
  ['servidor simulado', async () => crearServidorFalso(), true],
  ['reglas SQL en PGlite', () => crearServidorPglite(RAIZ), hayPglite],
  ['cliente de Supabase por HTTP sobre PGlite', () => crearServidorHttp(RAIZ), hayPglite],
]

describe.each(fabricas)('casos y disputas con el servidor · %s', (_nombre, fabrica, disponible) => {
  const prueba = (nombre: string, f: () => Promise<void>) => it.skipIf(!disponible)(nombre, f, 120_000)

  prueba('el reporte de la familia llega al equipo y a la paseadora del paseo; la otra familia no ve nada; la foto del reporte no sube', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const otra = await telefono(s, FAMILIA_B)
    const lucia = await telefono(s, LUCIA)
    const mateo = await telefono(s, MATEO)
    const equipo = await telefono(s, EQUIPO)
    const id = await pedirYSalir(familia, lucia, LUCIA)

    await reportar(familia)
    await guardado(familia, CLAVES.casos)
    await guardado(familia)
    expect(await s.estadoDe(id)).toBe('en_disputa')
    expect(await s.contar('casos')).toBe(1)

    await esperar(() => casosDe(equipo).length === 1 && casosDe(lucia).length === 1, 'que el equipo y la paseadora vean el caso')
    const delEquipo = casosDe(equipo)[0]
    expect(delEquipo).toMatchObject({ id: `disputa-${id}`, jobId: id, tipo: 'disputa', perro: expect.any(String), reporte: { quien: 'dueno', motivo: 'trato', texto: REPORTE.texto } })
    expect(delEquipo.resolucion).toBeUndefined()
    // La foto del reporte se queda en el teléfono: ni en la fila ni en lo que ven los demás.
    expect(JSON.stringify(await s.volcar('casos'))).not.toContain('base64')
    expect(delEquipo.reporte?.foto).toBeUndefined()
    // Otra familia y otro paseador: nada.
    await new Promise((r) => setTimeout(r, 150))
    expect(casosDe(otra)).toEqual([])
    expect(casosDe(mateo)).toEqual([])
  })

  prueba('el equipo resuelve la disputa: el paseo se cierra con su nota y la familia y la paseadora lo ven', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    const equipo = await telefono(s, EQUIPO)
    const id = await pedirYSalir(familia, lucia, LUCIA)
    await reportar(familia)
    await guardado(familia, CLAVES.casos)
    await esperar(() => casosDe(equipo).length === 1 && equipo.paseos().some((j) => j.id === id && j.paseo.estado === 'en_disputa'), 'que el equipo vea el caso y el paseo en disputa')

    const caso = casosDe(equipo)[0]
    const r = resolverCaso(casosDe(equipo), caso.id, 'cerrado', 'Hablamos con las dos partes.', Date.now())
    expect(r.ok).toBe(true)
    if (!r.ok) return
    equipo.copia.guardar(CLAVES.casos, r.casos)
    equipo.actuar((j) => resolverJob(j, caso, 'cerrado', 'Hablamos con las dos partes.', Date.now() + 1))
    await guardado(equipo, CLAVES.casos)
    await guardado(equipo)

    expect(await s.estadoDe(id)).toBe('cerrado')
    const fila = (await s.volcar('casos'))[0]
    expect(fila.resuelto_en).toBeTruthy()
    expect(fila.resolucion).toMatchObject({ como: 'cerrado', nota: 'Hablamos con las dos partes.' })
    await esperar(() => casosDe(familia)[0]?.resolucion?.como === 'cerrado' && casosDe(lucia)[0]?.resolucion?.nota === 'Hablamos con las dos partes.', 'que la familia y la paseadora vean la resolución')
    await esperar(() => familia.paseos().some((j) => j.id === id && j.paseo.estado === 'cerrado'), 'que la familia vea el paseo cerrado')
  })

  prueba('la familia y la paseadora NO pueden resolver un caso (solo el equipo)', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    const id = await pedirYSalir(familia, lucia, LUCIA)
    await reportar(familia)
    await guardado(familia, CLAVES.casos)

    const resolucion = { como: 'cerrado' as const, nota: 'me doy la razón', at: Date.now() }
    for (const t of [familia, lucia]) {
      await expect(t.cliente.cambiarCaso(`disputa-${id}`, { resolucion, resuelto_en: new Date().toISOString() })).rejects.toBeInstanceOf(ErrorDeBase)
    }
    // Ni siquiera abriéndolo ya resuelto.
    const resuelto: Caso = { ...casoDeReporte(familia.activo()!, REPORTE), id: 'disputa-otro', resolucion }
    await expect(familia.cliente.crearCaso(filaDeCaso(resuelto))).rejects.toBeInstanceOf(ErrorDeBase)
    expect((await s.volcar('casos')).map((f) => f.resuelto_en)).toEqual([null])
  })

  prueba('el paseador también puede reportar, y la familia lo ve', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    const equipo = await telefono(s, EQUIPO)
    const id = await pedirYSalir(familia, lucia, LUCIA)
    await reportar(lucia, { quien: 'paseador', motivo: 'entrega', texto: 'Nadie abrió la puerta.', at: Date.now() })
    await guardado(lucia, CLAVES.casos)
    await esperar(() => casosDe(familia).length === 1 && casosDe(equipo).length === 1, 'que la familia y el equipo vean el caso')
    expect(casosDe(equipo)[0]).toMatchObject({ jobId: id, reporte: { quien: 'paseador', motivo: 'entrega' } })
  })

  prueba('sin internet el caso espera en el teléfono, sale al volver y abrirlo dos veces es UN caso', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    const equipo = await telefono(s, EQUIPO)
    await pedirYSalir(familia, lucia, LUCIA)

    familia.cliente.fallarConRed('siempre')
    const job = await reportar(familia)
    await new Promise((r) => setTimeout(r, 200))
    expect(await s.contar('casos')).toBe(0)
    expect(casosDe(familia)).toHaveLength(1)

    familia.cliente.fallarConRed(0)
    await esperar(async () => (await s.contar('casos')) === 1, 'que el caso llegue al volver internet')
    // Tocar «Reportar» otra vez no lo duplica.
    abrir(familia, casoDeReporte(job, REPORTE))
    await new Promise((r) => setTimeout(r, 200))
    expect(await s.contar('casos')).toBe(1)
    await esperar(() => casosDe(equipo).length === 1, 'que el equipo lo vea')
    expect(casosDe(equipo)).toHaveLength(1)
  })

  prueba('una entrega sin confirmar y un problema de pago también llegan al equipo, y la familia B no los ve', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const otra = await telefono(s, FAMILIA_B)
    const lucia = await telefono(s, LUCIA)
    const equipo = await telefono(s, EQUIPO)
    const id = await pedirYSalir(familia, lucia, LUCIA)
    lucia.actuar((j) => moverPaseo(j, 'entregar', 'paseador', Date.now()))
    await guardado(lucia)
    await esperar(() => familia.paseos().some((j) => j.id === id && j.paseo.estado === 'entregado') && equipo.pagos().length === 1, 'que la familia vea el paseo entregado y el equipo el pago')

    abrir(familia, casoEntregaSinConfirmar(familia.activo()!, Date.now()))
    await guardado(familia, CLAVES.casos)
    abrir(equipo, casoDePago(equipo.pagos()[0], Date.now()))
    await guardado(equipo, CLAVES.casos)

    await esperar(() => casosDe(lucia).length === 2 && casosDe(familia).length === 2 && casosDe(equipo).length === 2, 'que los dos del paseo y el equipo vean los dos casos')
    expect(casosDe(equipo).map((c) => c.tipo).sort()).toEqual(['entrega_sin_confirmar', 'pago'])
    expect(await s.contar('casos')).toBe(2)
    await new Promise((r) => setTimeout(r, 150))
    expect(casosDe(otra)).toEqual([])
  })
})
