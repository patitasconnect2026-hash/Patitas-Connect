/**
 * Los puntos de control con el servidor (paso 9), de punta a punta y SIN red: la familia, la paseadora y el equipo, cada uno
 * con la copia en memoria de la app conectada a un servidor de prueba con SU sesión. Cada escenario corre tres veces:
 *   1. contra el servidor simulado en memoria (siempre),
 *   2. contra las migraciones SQL de verdad en PGlite, y
 *   3. con el cliente de Supabase de verdad por HTTP contra el servidor simulado sobre PGlite
 * (las dos últimas solo si PGlite está instalado: `npm i --no-save @electric-sql/pglite@0.2.17`).
 *
 * Se comprueba lo que pidió el plan: el inicio, cada foto y el fin aparecen en los DOS teléfonos; la ubicación del paseo la ven
 * la familia del paseo, la paseadora y el equipo y nadie más; solo la paseadora de ese paseo escribe; sin ubicación se anota
 * el motivo; y NO hay ubicación continua: del teléfono de la paseadora solo salen esos puntos (y la de cada foto).
 */
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { CONFIG } from '../config'
import { CLAVES } from '../datos/claves'
import { moverPaseo, registrarPunto } from '../bus'
import type { LatLng } from '../geo'
import { armarPunto, puntosDelPaseo } from '../puntosControl'
import { nuevaVigilancia } from '../zona'
import { paseadoresDeVista } from './paseadoresReales'
import { ErrorDeBase } from './paseosTipos'
import { filaDePunto, idDePunto } from './puntosMapeo'
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
/** Un punto dentro de San Isidro (el Olivar). */
const OLIVAR: LatLng = [-12.0999, -77.0374]

const hayPglite = (await crearServidorPglite(RAIZ).then(
  async (s) => {
    await s?.cerrar()
    return s !== null
  },
  () => false,
)) as boolean

/** Con HTTP y PGlite cada vuelta a la base tarda más: se espera hasta 30 s. */
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
  await s.paseadorAprobado({ id: LUCIA, nombre: 'Lucía', apellido: 'Quispe' })
  await s.paseadorAprobado({ id: MATEO, nombre: 'Mateo', apellido: 'Rojas' })
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

/** La familia pide y el paseador acepta, sale y recoge: el paseo queda «en_paseo». Devuelve el id del paseo. */
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
  return job.id
}

/** Lo que hace la app del paseador al empezar el paseo: anota el inicio con la última lectura (si sirve). */
const anotarInicio = (t: Telefono, pos: LatLng | null, decision: 'activa' | 'negada' | 'omitida' | 'no_disponible' | null = 'activa') => {
  const ahora = Date.now()
  t.actuar((j) => registrarPunto(j, armarPunto('inicio', ahora, pos ? { pos, precisionM: 10, t: ahora - 5000 } : null, pos ? 'activa' : decision)))
}
const anotarFin = (t: Telefono, pos: LatLng | null, decision: 'activa' | 'negada' | 'omitida' | 'no_disponible' | null = 'negada') => {
  const ahora = Date.now()
  t.actuar((j) => registrarPunto(j, armarPunto('fin', ahora, pos ? { pos, precisionM: 10, t: ahora - 5000 } : null, pos ? 'activa' : decision)))
}
const puntosDe = (t: Telefono, id: string) => t.paseos().find((j) => j.id === id)?.puntos ?? []

const fabricas: Array<[string, () => Promise<ServidorDePrueba | null>, boolean]> = [
  ['servidor simulado', async () => crearServidorFalso(), true],
  ['reglas SQL en PGlite', () => crearServidorPglite(RAIZ), hayPglite],
  ['cliente de Supabase por HTTP sobre PGlite', () => crearServidorHttp(RAIZ), hayPglite],
]

describe.each(fabricas)('puntos de control con el servidor · %s', (_nombre, fabrica, disponible) => {
  // Cada escenario hace muchas idas y vueltas a la base: más tiempo que el de siempre.
  const prueba = (nombre: string, f: () => Promise<void>) => it.skipIf(!disponible)(nombre, f, 60_000)

  prueba('el inicio, cada foto y el fin del paseo aparecen en los DOS teléfonos, en orden y con su lugar o el motivo de no tenerlo', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    const equipo = await telefono(s, EQUIPO)
    const id = await pedirYSalir(familia, lucia, LUCIA)

    // Inicio con ubicación, dos fotos con ubicación y un fin sin ubicación (negó el permiso).
    anotarInicio(lucia, OLIVAR)
    await guardado(lucia)
    expect((await lucia.tomarFoto({ jobId: id, t: Date.now() + 1000, ubicacion: { pos: OLIVAR, lecturaT: Date.now() } })).ok).toBe(true)
    expect((await lucia.tomarFoto({ jobId: id, t: Date.now() + 2000, ubicacion: { pos: OLIVAR, lecturaT: Date.now() } })).ok).toBe(true)
    lucia.actuar((j) => moverPaseo(j, 'entregar', 'paseador', Date.now() + 3000))
    await guardado(lucia)
    anotarFin(lucia, null, 'negada')
    await guardado(lucia)

    await esperar(() => puntosDe(familia, id).length === 2 && familia.fotos().filter((f) => f.jobId === id).length === 2, 'que la familia vea el inicio, las fotos y el fin')
    expect(await s.contar('puntos_control')).toBe(2)

    // En el teléfono de la familia: la lista que muestra la pantalla, en orden.
    const vistos = puntosDelPaseo(puntosDe(familia, id), familia.fotos().filter((f) => f.jobId === id))
    expect(vistos.map((p) => p.etiqueta)).toEqual(['Inicio', 'Foto 1', 'Foto 2', 'Fin'])
    expect(vistos[0].lugar.conLugar).toBe(true)
    expect(vistos[0].lugar.texto).toMatch(/^En San Isidro/)
    expect(vistos[1].lugar.conLugar).toBe(true)
    // Sin ubicación se anota el motivo, como hoy (y nunca se muestran coordenadas).
    expect(vistos[3].lugar.texto).toBe('Sin ubicación')
    expect(vistos[3].lugar.nota).toBeTruthy()
    expect(vistos[3].sinUbicacion).toBe('negada')
    expect(JSON.stringify(vistos.map((p) => p.lugar))).not.toMatch(/-12\.0|-77\.0/)

    // En el teléfono de la paseadora y en el del equipo: lo mismo.
    expect(puntosDelPaseo(puntosDe(lucia, id), lucia.fotos().filter((f) => f.jobId === id)).map((p) => p.etiqueta)).toEqual(['Inicio', 'Foto 1', 'Foto 2', 'Fin'])
    await esperar(() => puntosDe(equipo, id).length === 2, 'que el equipo vea el inicio y el fin')

    // Las filas de la base: una por tipo, con la hora del suceso y sin nada de más.
    const filas = await s.volcar('puntos_control')
    expect(filas.map((f) => f.tipo).sort()).toEqual(['fin', 'inicio'])
    expect(filas.find((f) => f.tipo === 'inicio')).toMatchObject({ paseo_id: id, lat: OLIVAR[0], lng: OLIVAR[1], sin_ubicacion: null })
    expect(filas.find((f) => f.tipo === 'fin')).toMatchObject({ paseo_id: id, lat: null, lng: null, sin_ubicacion: 'negada' })
  })

  prueba('la ubicación del paseo la ven la familia del paseo, la paseadora y el equipo; la familia B, otro paseador y quien no tiene sesión, no', async () => {
    const s = await nuevoServidor(fabrica)
    const familiaA = await telefono(s, FAMILIA_A)
    const familiaB = await telefono(s, FAMILIA_B)
    const lucia = await telefono(s, LUCIA)
    const mateo = await telefono(s, MATEO)
    const equipo = await telefono(s, EQUIPO)
    const idA = await pedirYSalir(familiaA, lucia, LUCIA)
    const idB = await pedirYSalir(familiaB, mateo, MATEO)

    anotarInicio(lucia, OLIVAR)
    await guardado(lucia)
    anotarInicio(mateo, [-12.0702, -77.0501])
    await guardado(mateo)
    await esperar(() => puntosDe(familiaA, idA).length === 1 && puntosDe(familiaB, idB).length === 1 && puntosDe(equipo, idA).length === 1 && puntosDe(equipo, idB).length === 1, 'que cada uno vea el suyo')

    expect(familiaA.paseos().map((j) => j.id)).toEqual([idA])
    expect(familiaB.paseos().map((j) => j.id)).toEqual([idB])
    expect(puntosDe(lucia, idA)).toHaveLength(1)
    expect(puntosDe(mateo, idB)).toHaveLength(1)
    // Ni siquiera pidiéndolo a propósito: la base no lo entrega.
    expect(await familiaB.cliente.listarPuntos([idA])).toEqual([])
    expect(await mateo.cliente.listarPuntos([idA])).toEqual([])
    expect(await familiaA.cliente.listarPuntos([idB])).toEqual([])
    expect((await familiaA.cliente.listarPuntos([idA])).length).toBe(1)
    expect((await equipo.cliente.listarPuntos([idA, idB])).length).toBe(2)
    // Sin sesión, nada.
    const anonimo = await telefono(s, null)
    expect(anonimo.paseos()).toEqual([])
    await expect(anonimo.cliente.listarPuntos([idA])).rejects.toBeInstanceOf(ErrorDeBase)
  })

  prueba('solo la paseadora de ese paseo escribe el inicio y el fin: ni la familia (aunque sea del paseo), ni otro paseador, ni el equipo, ni sin sesión', async () => {
    const s = await nuevoServidor(fabrica)
    const familiaA = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    const mateo = await telefono(s, MATEO)
    const equipo = await telefono(s, EQUIPO)
    const id = await pedirYSalir(familiaA, lucia, LUCIA)
    const fila = filaDePunto(id, { tipo: 'inicio', t: Date.now(), ubicacion: { pos: OLIVAR, lecturaT: Date.now() } })

    await expect(familiaA.cliente.crearPunto(fila)).rejects.toMatchObject({ status: 403 })
    await expect(mateo.cliente.crearPunto(fila)).rejects.toMatchObject({ status: 403 })
    await expect(equipo.cliente.crearPunto(fila)).rejects.toMatchObject({ status: 403 })
    const anonimo = await telefono(s, null)
    await expect(anonimo.cliente.crearPunto(fila)).rejects.toBeInstanceOf(ErrorDeBase)
    expect(await s.contar('puntos_control')).toBe(0)

    // La paseadora sí (y dos veces es una sola: el mismo punto no se repite).
    await expect(lucia.cliente.crearPunto(fila)).resolves.toBeUndefined()
    await expect(lucia.cliente.crearPunto(fila)).resolves.toBeUndefined()
    expect(await s.contar('puntos_control')).toBe(1)
    // Lo que no es un inicio ni un fin (las fotos tienen su propia tabla) o un motivo inventado se rechaza.
    await expect(lucia.cliente.crearPunto({ ...fila, id: 'aaaaaaaa-3333-4000-8000-000000000001', tipo: 'foto' as never })).rejects.toBeInstanceOf(ErrorDeBase)
    await expect(lucia.cliente.crearPunto({ ...fila, id: 'aaaaaaaa-3333-4000-8000-000000000002', tipo: 'fin', lat: null, lng: null, sin_ubicacion: 'inventado' })).rejects.toBeInstanceOf(ErrorDeBase)
    expect(await s.contar('puntos_control')).toBe(1)
  })

  prueba('sin internet el punto queda en el teléfono y sale al volver, una sola vez, aunque se cierre la app o se pierda una respuesta', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    let lucia = await telefono(s, LUCIA)
    const id = await pedirYSalir(familia, lucia, LUCIA)

    // Sin internet: el inicio queda en el teléfono (ella lo ve) y la familia todavía no.
    lucia.cliente.fallarConRed('siempre')
    anotarInicio(lucia, OLIVAR)
    await esperar(() => puntosDe(lucia, id).length === 1, 'que la paseadora vea su inicio')
    await new Promise((r) => setTimeout(r, 150))
    expect(await s.contar('puntos_control')).toBe(0)
    expect(puntosDe(familia, id)).toEqual([])

    // Cierra la app y la vuelve a abrir (con internet): el inicio sigue en el teléfono y sale solo.
    const { local, almacenFotos } = lucia
    lucia.cerrar()
    abiertos.splice(abiertos.indexOf(lucia), 1)
    lucia = await telefono(s, LUCIA, { local, almacenFotos })
    await esperar(() => puntosDe(familia, id).length === 1, 'que la familia vea el inicio')
    expect(await s.contar('puntos_control')).toBe(1)

    // Si la respuesta de la base se pierde (el punto SÍ llegó), no se duplica.
    const original = lucia.cliente.crearPunto.bind(lucia.cliente)
    let intentos = 0
    lucia.cliente.crearPunto = async (f) => {
      intentos += 1
      await original(f)
      if (intentos === 1) throw new ErrorDeBase('Failed to fetch', 0)
    }
    lucia.actuar((j) => moverPaseo(j, 'entregar', 'paseador', Date.now()))
    await guardado(lucia)
    anotarFin(lucia, OLIVAR)
    await esperar(() => puntosDe(familia, id).length === 2, 'que la familia vea el fin')
    expect(await s.contar('puntos_control')).toBe(2)

    // Volver a abrir la app con todo enviado no manda nada de nuevo.
    const { local: l2, almacenFotos: a2 } = lucia
    lucia.cerrar()
    abiertos.splice(abiertos.indexOf(lucia), 1)
    lucia = await telefono(s, LUCIA, { local: l2, almacenFotos: a2 })
    await new Promise((r) => setTimeout(r, 200))
    expect(await s.contar('puntos_control')).toBe(2)
    expect(idDePunto(id, 'inicio')).not.toBe(idDePunto(id, 'fin'))
  })

  prueba('NO hay ubicación continua ni «en vivo»: del teléfono de la paseadora solo salen el inicio, el fin y la ubicación de cada foto', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    const id = await pedirYSalir(familia, lucia, LUCIA)
    anotarInicio(lucia, OLIVAR)
    await guardado(lucia)

    // La paseadora camina 25 lecturas seguidas (la memoria del motor de avisos se actualiza cada vez, con la pantalla encendida).
    const vistas: string[] = []
    for (let i = 0; i < 25; i++) {
      const pos: LatLng = [-12.0888 - i * 0.0001, -77.0333 - i * 0.0001]
      vistas.push(String(pos[0]))
      lucia.actuar((j) => (j ? { ...j, ubicacion: 'activa', vigilancia: { ...nuevaVigilancia(), ultima: { pos, precisionM: 8, t: Date.now() } } } : j))
    }
    await guardado(lucia)
    expect(lucia.activo()?.vigilancia?.ultima).toBeTruthy() // en su teléfono sí está (es la memoria del motor de avisos)
    await lucia.tomarFoto({ jobId: id, ubicacion: { pos: OLIVAR, lecturaT: Date.now() } })
    await esperar(() => familia.fotos().some((f) => f.jobId === id) && puntosDe(familia, id).length === 1, 'que la familia vea la foto y el inicio')
    await new Promise((r) => setTimeout(r, 200))

    // Ninguna de esas 25 posiciones está en NINGUNA tabla de la base.
    const todo = JSON.stringify({
      paseos: await s.volcar('paseos'),
      eventos: await s.volcar('paseo_eventos'),
      bitacora: await s.volcar('bitacora'),
      mensajes: await s.volcar('mensajes'),
      pagos: await s.volcar('pagos'),
      fotos: await s.volcar('fotos'),
      puntos: await s.volcar('puntos_control'),
    })
    for (const lat of vistas) expect(todo, lat).not.toContain(lat)
    // Y el paseo no lleva «vigilancia» ni el estado del permiso: eso se queda en su teléfono.
    for (const p of await s.volcar('paseos')) {
      expect(p.vigilancia ?? null).toBeNull()
      expect(p.ubicacion ?? null).toBeNull()
    }
    // Lo único con ubicación: UN inicio y la foto (nada de recorrido).
    expect(await s.contar('puntos_control')).toBe(1)
    expect(await s.contar('fotos')).toBe(1)
    // El teléfono de la familia no recibe tampoco la memoria del motor de avisos.
    expect(familia.paseos().find((j) => j.id === id)?.vigilancia).toBeUndefined()
    expect(CONFIG.minutosPuntoControl).toBeGreaterThan(0)
  })
})
