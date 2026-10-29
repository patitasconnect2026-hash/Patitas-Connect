/**
 * Las fotos con el servidor (paso 8), de punta a punta y SIN red: la familia, la paseadora y el equipo, cada uno con la copia
 * en memoria de la app conectada a un servidor de prueba con SU sesión. Cada escenario corre tres veces:
 *   1. contra el servidor simulado en memoria (siempre),
 *   2. contra las migraciones SQL de verdad en PGlite (reglas de fila de `fotos` y de `storage.objects`), y
 *   3. con el cliente de Supabase de verdad (también su librería de almacenamiento) por HTTP contra el servidor simulado.
 * (Las dos últimas solo si PGlite está instalado: `npm i --no-save @electric-sql/pglite@0.2.17`.)
 *
 * Se comprueba lo que pidió el plan: las ve la familia del paseo, la paseadora y el equipo y nadie más; sin sesión no se ve
 * nada; los enlaces vencen; el tope de 1 MB y los topes de `lib/config.ts` se respetan; y sin internet la foto queda en el
 * teléfono y se sube al volver sin duplicarse.
 */
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { CONFIG } from '../config'
import { CLAVES } from '../datos/claves'
import { moverPaseo } from '../bus'
import { codigoDeFotos, lugarDeFoto } from '../fotos'
import type { LatLng } from '../geo'
import { selfieDeHoy, textoSelfie } from '../selfie'
import { filaDeFoto, LIMITE_BYTES_ALMACEN } from './fotosMapeo'
import { paseadoresDeVista } from './paseadoresReales'
import { TEXTO_FOTO_SERVIDOR } from './paseosTextos'
import { ErrorDeBase } from './paseosTipos'
import { crearServidorFalso, type ServidorDePrueba } from './pruebas/servidorFalso'
import { crearServidorHttp } from './pruebas/servidorHttp'
import { crearServidorPglite } from './pruebas/servidorPglite'
import { abrirTelefono, bytesDeFoto, esperar as esperarPoco, jobDeSolicitud, type Telefono } from './pruebas/telefonos'

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

/**
 * La familia pide y el paseador acepta y recoge: el paseo queda «en_paseo». Con `hasta: 'pedir'` solo se pide (el paseador
 * todavía no acepta). Devuelve el id del paseo.
 */
async function pedirYSalir(familia: Telefono, paseador: Telefono, paseadorId: string, hora = 10, hasta: 'pedir' | 'recoger' = 'recoger'): Promise<string> {
  const w = paseadoresDeVista(await familia.cliente.paseadoresPublicos()).find((x) => x.id === paseadorId)!
  const { job } = jobDeSolicitud({ walker: w, hora })
  familia.actuar(() => job)
  await guardado(familia)
  await esperar(() => paseador.paseos().some((j) => j.id === job.id), 'que el paseador vea la solicitud')
  if (hasta === 'pedir') return job.id
  for (const accion of ['aceptar', 'salir', 'recoger'] as const) {
    paseador.actuar((j) => moverPaseo(j, accion, 'paseador', Date.now()))
    await guardado(paseador)
  }
  return job.id
}

const sinEnviar = (t: Telefono) => t.remoto.fotosSinSubir()
const mismosBytes = (a: Uint8Array | undefined, b: ArrayBuffer) => !!a && a.length === b.byteLength && a.every((x, i) => x === new Uint8Array(b)[i])

const fabricas: Array<[string, () => Promise<ServidorDePrueba | null>, boolean]> = [
  ['servidor simulado', async () => crearServidorFalso(), true],
  ['reglas SQL en PGlite', () => crearServidorPglite(RAIZ), hayPglite],
  ['cliente de Supabase por HTTP sobre PGlite', () => crearServidorHttp(RAIZ), hayPglite],
]

describe.each(fabricas)('fotos con el servidor · %s', (_nombre, fabrica, disponible) => {
  // Cada escenario hace muchas idas y vueltas a la base y al almacén: más tiempo que el de siempre.
  const prueba = (nombre: string, f: () => Promise<void>) => it.skipIf(!disponible)(nombre, f, 60_000)

  prueba('la foto de la paseadora llega al teléfono de la familia con su hora, su lugar y su código, y se ve con un enlace que vence', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    const equipo = await telefono(s, EQUIPO)
    const id = await pedirYSalir(familia, lucia, LUCIA)

    const bytes = bytesDeFoto(2048, 11)
    const olivar: LatLng = [-12.0999, -77.0374]
    const r = await lucia.tomarFoto({ jobId: id, bytes, ubicacion: { pos: olivar, lecturaT: Date.now() - 30_000 } })
    expect(r.ok).toBe(true)
    // Queda primero en el teléfono y de ahí sale sola.
    await esperar(() => familia.fotos().some((f) => f.jobId === id), 'que la familia vea la foto')
    await esperar(() => sinEnviar(lucia).size === 0, 'que la app de la paseadora sepa que ya llegó')
    expect(await s.contar('fotos')).toBe(1)
    expect(await s.imagenes()).toBe(1)

    const f = familia.fotos().find((x) => x.jobId === id)!
    expect(f).toMatchObject({ almacen: 'servidor', codigo: codigoDeFotos(id), bytes: 2048 })
    expect(f.ruta).toMatch(new RegExp(`^paseo/${id}/[0-9a-f-]{36}\\.jpg$`))
    expect(f.ubicacion?.pos).toEqual(olivar)
    expect(lugarDeFoto(f).conLugar).toBe(true)
    expect(JSON.stringify(f)).not.toMatch(/https?:|signed|token/)

    // La imagen se ve con un enlace corto que vence: la familia, la paseadora y el equipo lo piden; el enlace no es público.
    const enlace = await familia.cliente.enlaceDeFoto(f.ruta!, 120)
    const imagen = await s.leerEnlace(enlace)
    expect(imagen?.tipo).toBe('image/jpeg')
    expect(mismosBytes(imagen?.bytes, bytes)).toBe(true)
    await expect(lucia.cliente.enlaceDeFoto(f.ruta!, 120)).resolves.toBeTruthy()
    await expect(equipo.cliente.enlaceDeFoto(f.ruta!, 120)).resolves.toBeTruthy()
    expect(await familia.remoto.enlaceDeFoto(f.ruta!)).toBeTruthy()
    await s.vencerEnlaces()
    expect(await s.leerEnlace(enlace)).toBeNull()

    // El equipo ve la misma foto con sus datos.
    await esperar(() => equipo.fotos().some((x) => x.jobId === id), 'que el equipo vea la foto')

    // Una lectura de ubicación vieja NO se sube como lugar de la foto (la base no guarda la hora de la lectura).
    const vieja = await lucia.tomarFoto({ jobId: id, ubicacion: { pos: olivar, lecturaT: Date.now() - (CONFIG.minutosUbicacionVieja + 5) * 60_000 } })
    expect(vieja.ok).toBe(true)
    await esperar(() => familia.fotos().filter((x) => x.jobId === id).length === 2, 'que llegue la segunda foto')
    const sinLugar = familia.fotos().find((x) => x.jobId === id && x.id !== f.id)!
    expect(sinLugar.ubicacion).toBeNull()
    expect(lugarDeFoto(sinLugar).texto).toBe('Sin ubicación')
  })

  prueba('cada persona ve solo lo suyo: la familia B no ve las fotos de A, otro paseador no ve las de Lucía y sin sesión no se ve nada', async () => {
    const s = await nuevoServidor(fabrica)
    const familiaA = await telefono(s, FAMILIA_A)
    const familiaB = await telefono(s, FAMILIA_B)
    const lucia = await telefono(s, LUCIA)
    const mateo = await telefono(s, MATEO)
    const equipo = await telefono(s, EQUIPO)
    const idA = await pedirYSalir(familiaA, lucia, LUCIA)
    const idB = await pedirYSalir(familiaB, mateo, MATEO)

    await lucia.tomarFoto({ jobId: idA })
    await mateo.tomarFoto({ jobId: idB })
    await esperar(() => familiaA.fotos().some((f) => f.jobId === idA) && familiaB.fotos().some((f) => f.jobId === idB) && equipo.fotos().length === 2, 'que cada uno vea la suya')

    expect(familiaA.fotos().map((f) => f.jobId)).toEqual([idA])
    expect(familiaB.fotos().map((f) => f.jobId)).toEqual([idB])
    expect(lucia.fotos().map((f) => f.jobId)).toEqual([idA])
    expect(mateo.fotos().map((f) => f.jobId)).toEqual([idB])
    expect(equipo.fotos().map((f) => f.jobId).sort()).toEqual([idA, idB].sort())

    const rutaA = familiaA.fotos()[0].ruta!
    const rutaB = familiaB.fotos()[0].ruta!
    // Nadie ve la imagen de otro paseo: ni un enlace.
    await expect(familiaB.cliente.enlaceDeFoto(rutaA, 120)).rejects.toBeInstanceOf(ErrorDeBase)
    await expect(mateo.cliente.enlaceDeFoto(rutaA, 120)).rejects.toBeInstanceOf(ErrorDeBase)
    await expect(familiaA.cliente.enlaceDeFoto(rutaB, 120)).rejects.toBeInstanceOf(ErrorDeBase)
    await expect(lucia.cliente.enlaceDeFoto(rutaB, 120)).rejects.toBeInstanceOf(ErrorDeBase)
    // Ni sus datos: la base no las entrega aunque se pidan a propósito.
    expect(await familiaB.cliente.listarFotos([idA], '2000-01-01')).toEqual([])
    expect(await mateo.cliente.listarFotos([idA], '2000-01-01')).toEqual([])

    // Sin sesión no se ve nada.
    const anonimo = await telefono(s, null)
    expect(anonimo.fotos()).toEqual([])
    await expect(anonimo.cliente.listarFotos([idA], '2000-01-01')).rejects.toBeInstanceOf(ErrorDeBase)
    await expect(anonimo.cliente.enlaceDeFoto(rutaA, 120)).rejects.toBeInstanceOf(ErrorDeBase)
    await expect(anonimo.cliente.subirFoto(`paseo/${idA}/intruso.jpg`, bytesDeFoto(), 'image/jpeg')).rejects.toBeInstanceOf(ErrorDeBase)

    // Quién puede subir a una carpeta: solo la paseadora de ese paseo (ni otro paseador, ni la familia).
    await expect(mateo.cliente.subirFoto(`paseo/${idA}/intruso.jpg`, bytesDeFoto(), 'image/jpeg')).rejects.toMatchObject({ status: 403 })
    await expect(familiaA.cliente.subirFoto(`paseo/${idA}/familia.jpg`, bytesDeFoto(), 'image/jpeg')).rejects.toMatchObject({ status: 403 })
    await expect(lucia.cliente.subirFoto(`hoy/${MATEO}/de-otro.jpg`, bytesDeFoto(), 'image/jpeg')).rejects.toMatchObject({ status: 403 })
    await expect(lucia.cliente.guardarFoto({ id: 'aaaaaaaa-1111-4000-8000-000000000001', tipo: 'paseo', paseo_id: idB, paseador_id: LUCIA, dia: null, en: new Date().toISOString(), codigo: '', lat: null, lng: null, sin_ubicacion: 'omitida', bytes: 1, ruta: `paseo/${idB}/x.jpg` })).rejects.toBeInstanceOf(ErrorDeBase)
    // Tampoco se puede guardar una fila de SU paseo apuntando a la imagen de OTRO paseo para verla.
    await expect(
      lucia.cliente.guardarFoto({ id: 'aaaaaaaa-2222-4000-8000-000000000001', tipo: 'paseo', paseo_id: idA, paseador_id: LUCIA, dia: null, en: new Date().toISOString(), codigo: '', lat: null, lng: null, sin_ubicacion: 'omitida', bytes: 1, ruta: rutaB }),
    ).rejects.toBeInstanceOf(ErrorDeBase)
    await expect(lucia.cliente.enlaceDeFoto(rutaB, 120)).rejects.toBeInstanceOf(ErrorDeBase)
    expect(await s.imagenes()).toBe(2)
    expect(await s.contar('fotos')).toBe(2)

    // Las imágenes del chat siguen la regla del chat: los dos del paseo, nadie más.
    await expect(familiaA.cliente.subirFoto(`chat/${idA}/m1.jpg`, bytesDeFoto(), 'image/jpeg')).resolves.toBeUndefined()
    await expect(lucia.cliente.subirFoto(`chat/${idA}/m2.jpg`, bytesDeFoto(), 'image/jpeg')).resolves.toBeUndefined()
    await expect(familiaB.cliente.subirFoto(`chat/${idA}/m3.jpg`, bytesDeFoto(), 'image/jpeg')).rejects.toMatchObject({ status: 403 })
    await expect(mateo.cliente.subirFoto(`chat/${idA}/m4.jpg`, bytesDeFoto(), 'image/jpeg')).rejects.toMatchObject({ status: 403 })
    await expect(lucia.cliente.enlaceDeFoto(`chat/${idA}/m1.jpg`, 120)).resolves.toBeTruthy()
    await expect(familiaB.cliente.enlaceDeFoto(`chat/${idA}/m1.jpg`, 120)).rejects.toBeInstanceOf(ErrorDeBase)
  })

  prueba('el tamaño se respeta: el almacén no recibe más de 1 MB y el tope de fotos por paseo es el de la configuración', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    const id = await pedirYSalir(familia, lucia, LUCIA)
    const ruta = (n: string) => `paseo/${id}/${n}.jpg`

    // El almacén mismo rechaza lo que pasa de 1 MB o no es una imagen; exactamente 1 MB entra.
    expect(LIMITE_BYTES_ALMACEN).toBe(1_048_576)
    await expect(lucia.cliente.subirFoto(ruta('grande'), new ArrayBuffer(LIMITE_BYTES_ALMACEN + 1), 'image/jpeg')).rejects.toMatchObject({ status: 413 })
    await expect(lucia.cliente.subirFoto(ruta('texto'), bytesDeFoto(), 'text/plain')).rejects.toMatchObject({ status: 415 })
    await expect(lucia.cliente.subirFoto(ruta('justa'), new ArrayBuffer(LIMITE_BYTES_ALMACEN), 'image/jpeg')).resolves.toBeUndefined()
    expect(await s.imagenes()).toBe(1)

    // La app ni lo intenta con una foto de más de 1 MB: queda marcada y no se reintenta ni sube nada.
    const pesada = await lucia.tomarFoto({ jobId: id, bytes: new ArrayBuffer(LIMITE_BYTES_ALMACEN + 1) })
    expect(pesada.ok).toBe(true)
    if (!pesada.ok) return
    await esperar(() => sinEnviar(lucia).get(pesada.foto.id) === TEXTO_FOTO_SERVIDOR.grande, 'que la app la marque como demasiado pesada')
    expect(await s.imagenes()).toBe(1)
    expect(await s.contar('fotos')).toBe(0)
    expect(familia.fotos().some((f) => f.id === pesada.foto.id)).toBe(false)

    // Una foto normal (160 KB como máximo, lo que saca la cámara) sí pasa, y pasadas las 12 de la configuración la app no guarda más.
    const normal = await lucia.tomarFoto({ jobId: id, bytes: bytesDeFoto(CONFIG.pesoMaximoFotoKB * 1024, 3) })
    expect(normal.ok).toBe(true)
    await esperar(() => familia.fotos().some((f) => f.bytes === CONFIG.pesoMaximoFotoKB * 1024), 'que llegue la foto de 160 KB')
    for (let i = 0; i < CONFIG.maxFotosPorPaseo; i++) await lucia.tomarFoto({ jobId: id, bytes: bytesDeFoto(256, i) })
    const demas = await lucia.tomarFoto({ jobId: id })
    expect(demas).toEqual({ ok: false, error: 'tope' })
    // Se guardaron 12 en el teléfono (la pesada cuenta); la pesada no sube, así que en la base hay una menos.
    await esperar(() => familia.fotos().length === CONFIG.maxFotosPorPaseo - 1 && sinEnviar(lucia).size === 1, 'que solo quede por enviar la pesada')
    expect(await s.contar('fotos')).toBe(CONFIG.maxFotosPorPaseo - 1)
  })

  prueba('sin internet la foto queda en el teléfono y se sube al volver, una sola vez, aunque se cierre la app o se pierda una respuesta', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    let lucia = await telefono(s, LUCIA)
    const id = await pedirYSalir(familia, lucia, LUCIA)

    // Sin internet: la foto se guarda en el teléfono, sale como «sin enviar» y la familia no ve nada.
    lucia.cliente.fallarConRed('siempre')
    const a = await lucia.tomarFoto({ jobId: id, bytes: bytesDeFoto(300, 1) })
    const b = await lucia.tomarFoto({ jobId: id, bytes: bytesDeFoto(300, 2) })
    expect(a.ok && b.ok).toBe(true)
    await esperar(() => lucia.copia.estadoConexion() === 'sin_conexion', 'que la app diga que no hay conexión')
    expect(sinEnviar(lucia).size).toBe(2)
    expect(lucia.fotos().filter((f) => f.jobId === id)).toHaveLength(2) // ella las sigue viendo
    expect(await s.imagenes()).toBe(0)
    expect(await s.contar('fotos')).toBe(0)
    expect(familia.fotos()).toEqual([])

    // Cierra la app con las fotos sin enviar y la vuelve a abrir: siguen en el teléfono (datos y bytes).
    const { local, almacenFotos } = lucia
    lucia.cerrar()
    abiertos.splice(abiertos.indexOf(lucia), 1)
    lucia = await telefono(s, LUCIA, { local, almacenFotos })
    expect(sinEnviar(lucia).size).toBe(2)

    // Al abrir la app con internet, se envían solas, cada una una sola vez.
    await esperar(() => sinEnviar(lucia).size === 0 && familia.fotos().length === 2, 'que lleguen las dos fotos')
    expect(await s.imagenes()).toBe(2)
    expect(await s.contar('fotos')).toBe(2)

    // Si la respuesta de la base se pierde (la foto SÍ llegó), el reintento no la duplica.
    const original = lucia.cliente.guardarFoto.bind(lucia.cliente)
    let intentos = 0
    lucia.cliente.guardarFoto = async (fila) => {
      intentos += 1
      await original(fila)
      if (intentos === 1) throw new ErrorDeBase('Failed to fetch', 0)
    }
    const originalSubir = lucia.cliente.subirFoto.bind(lucia.cliente)
    let subidas = 0
    lucia.cliente.subirFoto = async (ruta, bytes, tipo) => {
      subidas += 1
      await originalSubir(ruta, bytes, tipo)
    }
    const c = await lucia.tomarFoto({ jobId: id, bytes: bytesDeFoto(300, 3) })
    expect(c.ok).toBe(true)
    await esperar(() => familia.fotos().length === 3 && sinEnviar(lucia).size === 0, 'que llegue la tercera foto')
    // La base ya tenía la foto: al volver a leer, la app lo ve y no la manda otra vez. Si una lectura que ya iba en camino
    // todavía no la traía y se manda de nuevo, la base lo reconoce («ya estaba»). De las dos formas, queda UNA sola.
    expect(intentos).toBeGreaterThanOrEqual(1)
    expect(intentos).toBeLessThanOrEqual(2)
    expect(subidas).toBeLessThanOrEqual(2)
    expect(await s.imagenes()).toBe(3)
    expect(await s.contar('fotos')).toBe(3)

    // Y si de todos modos llegara dos veces (dos teléfonos abiertos a la vez, por ejemplo), la base lo reconoce y no la duplica.
    const propia = lucia.fotos().find((f) => f.almacen !== 'servidor' && f.jobId === id)!
    const fila = filaDeFoto(propia, LUCIA)
    await expect(lucia.cliente.guardarFoto(fila)).resolves.toBeUndefined()
    await expect(lucia.cliente.subirFoto(fila.ruta, bytesDeFoto(300, 1), 'image/jpeg')).resolves.toBeUndefined()
    expect(await s.imagenes()).toBe(3)
    expect(await s.contar('fotos')).toBe(3)

    // Abrir la app otra vez con todo ya enviado no manda nada de nuevo.
    const { local: l2, almacenFotos: a2 } = lucia
    lucia.cerrar()
    abiertos.splice(abiertos.indexOf(lucia), 1)
    lucia = await telefono(s, LUCIA, { local: l2, almacenFotos: a2 })
    await new Promise((r) => setTimeout(r, 200))
    expect(await s.imagenes()).toBe(3)
    expect(await s.contar('fotos')).toBe(3)
  })

  prueba('la foto de hoy va al mismo almacén: la ve la familia con un paseo aceptado y el equipo, no otra familia ni otro paseador; al tomar otra, la anterior se reemplaza', async () => {
    const s = await nuevoServidor(fabrica)
    const familiaA = await telefono(s, FAMILIA_A)
    const familiaB = await telefono(s, FAMILIA_B)
    const lucia = await telefono(s, LUCIA)
    const mateo = await telefono(s, MATEO)
    const equipo = await telefono(s, EQUIPO)
    // Antes de que la paseadora acepte un paseo, la familia todavía no ve su foto de hoy.
    const id = await pedirYSalir(familiaA, lucia, LUCIA, 10, 'pedir')
    const primera = bytesDeFoto(500, 5)
    expect((await lucia.tomarSelfie({ walkerId: LUCIA, bytes: primera })).ok).toBe(true)
    await esperar(() => sinEnviar(lucia).size === 0 && equipo.fotos().some((f) => f.jobId.startsWith('selfie:')), 'que la foto de hoy llegue')
    expect(await s.contar('fotos')).toBe(1)
    expect(await s.imagenes()).toBe(1)
    await new Promise((r) => setTimeout(r, 120))
    expect(selfieDeHoy(familiaA.fotos(), LUCIA, Date.now())).toBeNull()

    // Cuando acepta, la familia con ese paseo ACEPTADO sí la ve: «Foto de hoy, hora».
    lucia.actuar((j) => moverPaseo(j, 'aceptar', 'paseador', Date.now()))
    await guardado(lucia)
    expect(await s.estadoDe(id)).toBe('aceptado')
    await esperar(() => !!selfieDeHoy(familiaA.fotos(), LUCIA, Date.now()), 'que la familia vea la foto de hoy')
    const vista = selfieDeHoy(familiaA.fotos(), LUCIA, Date.now())!
    expect(textoSelfie(vista)).toMatch(/^Foto de hoy, \d{2}:\d{2}$/)
    expect(vista.almacen).toBe('servidor')
    expect(vista.ruta).toMatch(new RegExp(`^hoy/${LUCIA}/[0-9a-f-]{36}\\.jpg$`))
    expect(mismosBytes((await s.leerEnlace(await familiaA.cliente.enlaceDeFoto(vista.ruta!, 120)))?.bytes, primera)).toBe(true)

    // Otra familia, otro paseador y sin sesión: no la ven.
    await new Promise((r) => setTimeout(r, 120))
    expect(selfieDeHoy(familiaB.fotos(), LUCIA, Date.now())).toBeNull()
    expect(selfieDeHoy(mateo.fotos(), LUCIA, Date.now())).toBeNull()
    await expect(familiaB.cliente.enlaceDeFoto(vista.ruta!, 120)).rejects.toBeInstanceOf(ErrorDeBase)
    await expect(mateo.cliente.enlaceDeFoto(vista.ruta!, 120)).rejects.toBeInstanceOf(ErrorDeBase)
    expect(selfieDeHoy(equipo.fotos(), LUCIA, Date.now())).not.toBeNull()

    // Nadie borra la imagen de otro: ni otro paseador, ni la familia, ni el equipo (desde la app).
    for (const quien of [mateo, familiaA, equipo]) {
      await quien.cliente.quitarImagenes([vista.ruta!])
      expect(await s.hayImagen(vista.ruta!)).toBe(true)
    }
    await mateo.cliente.borrarFilaFoto(vista.id)
    expect(await s.contar('fotos')).toBe(1)

    // Toma otra el mismo día: la anterior se reemplaza (una foto de hoy por día) y no queda ninguna imagen huérfana.
    const segunda = bytesDeFoto(700, 9)
    expect((await lucia.tomarSelfie({ walkerId: LUCIA, bytes: segunda })).ok).toBe(true)
    // (Durante el cambio la fila anterior se borra un instante antes de guardar la nueva: se espera a ver LA NUEVA.)
    await esperar(() => {
      const hoy = selfieDeHoy(familiaA.fotos(), LUCIA, Date.now())
      return !!hoy && hoy.id !== vista.id && sinEnviar(lucia).size === 0
    }, 'que la familia vea la foto nueva')
    expect(await s.contar('fotos')).toBe(1)
    expect(await s.imagenes()).toBe(1)
    expect(await s.hayImagen(vista.ruta!)).toBe(false)
    const nueva = selfieDeHoy(familiaA.fotos(), LUCIA, Date.now())!
    expect(mismosBytes((await s.leerEnlace(await familiaA.cliente.enlaceDeFoto(nueva.ruta!, 120)))?.bytes, segunda)).toBe(true)
  })
})
