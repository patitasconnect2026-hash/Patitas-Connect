/**
 * Las reseñas con el servidor (parte 3b), de punta a punta y SIN red: la familia, otra familia, la paseadora y el equipo, cada uno
 * con la copia en memoria de la app conectada a un servidor de prueba con SU sesión. Cada escenario corre tres veces:
 *   1. contra el servidor simulado en memoria (siempre),
 *   2. contra las migraciones SQL de verdad en PGlite, y
 *   3. con el cliente de Supabase de verdad por HTTP contra el servidor simulado sobre PGlite
 * (las dos últimas solo si PGlite está instalado: `npm i --no-save @electric-sql/pglite@0.2.17`).
 *
 * Se comprueba lo que pide la parte 3b: la reseña de un paseo cerrado llega a la base (una por paseo, aunque se toque dos veces),
 * la ve otra familia en la tarjeta de la paseadora con su calificación, sin internet espera y sale sola sin duplicarse, un paseo
 * que no se cerró no se puede reseñar (la base lo rechaza y la pantalla lo dice), y nadie más que la familia del paseo escribe.
 */
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { confirmarEntregaJob, moverPaseo } from '../bus'
import { tieneCalificacion } from '../calificacion'
import { REVIEW_TAGS } from '../data'
import { CLAVES } from '../datos/claves'
import type { Review } from '../types'
import { conResenas, paseadoresDeVista } from './paseadoresReales'
import { ErrorDeBase } from './paseosTipos'
import { TEXTO_SERVIDOR } from './paseosTextos'
import { crearServidorFalso, type ServidorDePrueba } from './pruebas/servidorFalso'
import { crearServidorHttp } from './pruebas/servidorHttp'
import { crearServidorPglite } from './pruebas/servidorPglite'
import { abrirTelefono, esperar as esperarPoco, jobDeSolicitud, type Telefono } from './pruebas/telefonos'
import { filaDeResena } from './resenasMapeo'

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
  // Cada teléfono pregunta cada 80 ms: con varios teléfonos y la computadora ocupada, menos vueltas a la base de prueba.
  const t = abrirTelefono(s, uid, { intervaloMs: 80 })
  abiertos.push(t)
  await t.copia.alEstarListo()
  return t
}

const guardado = async (t: Telefono, clave: string = CLAVES.paseo) => expect(await t.copia.yaSeGuardo(clave)).toBe('guardado')
const resenasDe = (t: Telefono) => t.copia.leer<Review[]>(CLAVES.resenas, [])

/** Lo mismo que hace la app al publicar: la reseña entra a la lista de la persona (como una sola por paseo) y sale sola a la base. */
const escribir = (t: Telefono, r: Review) => t.copia.guardar(CLAVES.resenas, [r, ...resenasDe(t).filter((x) => x.paseoId !== r.paseoId)])
const resena = (paseoId: string, walkerId: string, rating = 5, text = 'Muy puntual y cariñosa.'): Review => ({
  id: `resena-${paseoId}`,
  author: 'Valeria R.',
  district: 'San Isidro',
  rating,
  text,
  tags: [REVIEW_TAGS[0]],
  when: 'Hoy',
  mine: true,
  walkerId,
  paseoId,
})

/** La familia pide, la paseadora acepta, sale, recoge y entrega; la familia confirma la entrega: el paseo queda «cerrado». */
async function pedirYCerrar(s: ServidorDePrueba, familia: Telefono, paseador: Telefono, paseadorId: string, hora = 10): Promise<string> {
  const w = paseadoresDeVista(await familia.cliente.paseadoresPublicos()).find((x) => x.id === paseadorId)!
  const { job } = jobDeSolicitud({ walker: w, hora })
  familia.actuar(() => job)
  await guardado(familia)
  await esperar(() => paseador.paseos().some((j) => j.id === job.id), 'que el paseador vea la solicitud')
  for (const accion of ['aceptar', 'salir', 'recoger'] as const) {
    paseador.actuar((j) => moverPaseo(j, accion, 'paseador', Date.now()))
    await guardado(paseador)
  }
  paseador.actuar((j) => moverPaseo(j, 'entregar', 'paseador', Date.now() + 5000))
  await guardado(paseador)
  await esperar(() => familia.paseos().some((j) => j.id === job.id && j.paseo.estado === 'entregado'), 'que la familia vea la entrega')
  familia.actuar((j) => confirmarEntregaJob(j, Date.now()))
  await guardado(familia)
  await esperar(async () => (await s.estadoDe(job.id)) === 'cerrado', 'que la base tenga el paseo cerrado')
  return job.id
}

/** Pide y deja el paseo en marcha (sin cerrar). */
async function pedirYSalir(familia: Telefono, paseador: Telefono, paseadorId: string, hora = 11): Promise<string> {
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

const fabricas: Array<[string, () => Promise<ServidorDePrueba | null>, boolean]> = [
  ['servidor simulado', async () => crearServidorFalso(), true],
  ['reglas SQL en PGlite', () => crearServidorPglite(RAIZ), hayPglite],
  ['cliente de Supabase por HTTP sobre PGlite', () => crearServidorHttp(RAIZ), hayPglite],
]

describe.each(fabricas)('reseñas con el servidor · %s', (_nombre, fabrica, disponible) => {
  const prueba = (nombre: string, f: () => Promise<void>) => it.skipIf(!disponible)(nombre, f, 120_000)

  prueba('la reseña de un paseo cerrado llega a la base y la ve otra familia en la tarjeta de la paseadora, con su calificación', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const otra = await telefono(s, FAMILIA_B)
    const lucia = await telefono(s, LUCIA)
    const id = await pedirYCerrar(s, familia, lucia, LUCIA)

    // Antes: sin reseñas no hay calificación (no se inventa), pero sí cuenta el paseo que terminó.
    const antes = paseadoresDeVista(await otra.cliente.paseadoresPublicos()).find((w) => w.id === LUCIA)!
    expect(antes).toMatchObject({ rating: 0, resenasN: 0, walks: 1 })
    expect(tieneCalificacion(antes)).toBe(false)

    escribir(familia, resena(id, LUCIA, 5, 'Muy puntual y cariñosa.'))
    await guardado(familia, CLAVES.resenas)
    expect(await s.contar('resenas')).toBe(1)
    const fila = (await s.volcar('resenas'))[0]
    expect(fila).toMatchObject({ paseo_id: id, familia_id: FAMILIA_A, paseador_id: LUCIA, estrellas: 5, texto: 'Muy puntual y cariñosa.' })
    // El nombre lo pone la base (aquí solo el nombre de pila: la persona sembrada no dejó apellido).
    expect(String(fila.autor)).toMatch(/^Valeria/)

    // Otra familia la ve en la tarjeta de la paseadora: calificación, cuántas reseñas y el comentario con quién lo escribió.
    const despues = paseadoresDeVista(await otra.cliente.paseadoresPublicos())
    const conTexto = conResenas(despues, await otra.cliente.resenasDePaseadores([LUCIA, MATEO]), FAMILIA_B, Date.now())
    const w = conTexto.find((x) => x.id === LUCIA)!
    expect(w).toMatchObject({ rating: 5, resenasN: 1, walks: 1 })
    expect(tieneCalificacion(w)).toBe(true)
    expect(w.reviews).toHaveLength(1)
    expect(w.reviews[0]).toMatchObject({ text: 'Muy puntual y cariñosa.', rating: 5, paseoId: id, when: 'Hoy' })
    expect(w.reviews[0].author).toMatch(/^Valeria/)
    expect(w.reviews[0].mine).toBeUndefined()
    // Mateo no tiene nada.
    expect(conTexto.find((x) => x.id === MATEO)).toMatchObject({ rating: 0, resenasN: 0, reviews: [] })

    // La familia la sigue teniendo como «suya» después de volver a leer lo que dice la base.
    await esperar(() => resenasDe(familia).some((r) => r.paseoId === id && r.mine === true), 'que la familia vea su reseña como suya')
  })

  prueba('tocar «Publicar reseña» dos veces es una sola reseña', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    const id = await pedirYCerrar(s, familia, lucia, LUCIA)

    escribir(familia, resena(id, LUCIA, 4, 'Todo bien.'))
    escribir(familia, resena(id, LUCIA, 4, 'Todo bien.'))
    await guardado(familia, CLAVES.resenas)
    // También con un reintento directo (como si la respuesta anterior se hubiera perdido): sigue siendo una.
    await familia.cliente.crearResena(filaDeResena({ paseoId: id, walkerId: LUCIA, rating: 4, text: 'Todo bien.', tags: [] }, FAMILIA_A)!)
    expect(await s.contar('resenas')).toBe(1)
    expect(resenasDe(familia).filter((r) => r.paseoId === id)).toHaveLength(1)
  })

  prueba('sin internet la reseña espera en el teléfono y sale sola al volver, sin duplicarse', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    const id = await pedirYCerrar(s, familia, lucia, LUCIA)

    familia.cliente.fallarConRed('siempre')
    escribir(familia, resena(id, LUCIA, 5, 'Excelente.'))
    await esperar(() => familia.copia.estadoGuardado(CLAVES.resenas) === 'error', 'que la copia sepa que no pudo enviar')
    // Mientras tanto la reseña sigue en pantalla (es de la persona) y la base no tiene nada.
    expect(resenasDe(familia).filter((r) => r.paseoId === id)).toHaveLength(1)
    expect(await s.contar('resenas')).toBe(0)

    familia.cliente.fallarConRed(0)
    familia.copia.reintentar()
    await guardado(familia, CLAVES.resenas)
    expect(await s.contar('resenas')).toBe(1)
    expect(resenasDe(familia).filter((r) => r.paseoId === id)).toHaveLength(1)
  })

  prueba('un paseo que todavía no se cerró no se puede reseñar: la base lo rechaza y la lista vuelve a lo que dice la base', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    const id = await pedirYSalir(familia, lucia, LUCIA)

    const mensajes: string[] = []
    const baja = familia.copia.suscribirRechazos((r) => {
      if (r.clave === CLAVES.resenas) mensajes.push(r.mensaje)
    })
    escribir(familia, resena(id, LUCIA))
    await esperar(() => mensajes.length > 0, 'que la base rechace la reseña')
    baja()
    expect(mensajes[0]).toBe(TEXTO_SERVIDOR.resenaNoSePudo)
    expect(await s.contar('resenas')).toBe(0)
    await esperar(() => resenasDe(familia).length === 0, 'que la lista vuelva a lo que dice la base')
  })

  prueba('solo la familia de ese paseo escribe: ni otra familia, ni la paseadora, ni el equipo; y las estrellas son de 1 a 5', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const otra = await telefono(s, FAMILIA_B)
    const lucia = await telefono(s, LUCIA)
    const equipo = await telefono(s, EQUIPO)
    const id = await pedirYCerrar(s, familia, lucia, LUCIA)

    const de = (quien: string, extra: Partial<Parameters<typeof filaDeResena>[0]> = {}) => filaDeResena({ paseoId: id, walkerId: LUCIA, rating: 5, text: 'Intento.', tags: [], ...extra }, quien)!
    await expect(otra.cliente.crearResena(de(FAMILIA_B))).rejects.toBeInstanceOf(ErrorDeBase)
    await expect(otra.cliente.crearResena(de(FAMILIA_A))).rejects.toBeInstanceOf(ErrorDeBase)
    await expect(lucia.cliente.crearResena(de(LUCIA))).rejects.toBeInstanceOf(ErrorDeBase)
    await expect(equipo.cliente.crearResena(de(EQUIPO))).rejects.toBeInstanceOf(ErrorDeBase)
    // La de la propia familia con otro paseador que el del paseo tampoco entra.
    await expect(familia.cliente.crearResena(de(FAMILIA_A, { walkerId: MATEO }))).rejects.toBeInstanceOf(ErrorDeBase)
    // Estrellas fuera de rango: la base lo rechaza (la app ni lo manda).
    await expect(familia.cliente.crearResena({ ...de(FAMILIA_A), estrellas: 0 })).rejects.toBeInstanceOf(ErrorDeBase)
    await expect(familia.cliente.crearResena({ ...de(FAMILIA_A), estrellas: 6 })).rejects.toBeInstanceOf(ErrorDeBase)
    expect(await s.contar('resenas')).toBe(0)
    // Y la de verdad entra.
    await familia.cliente.crearResena(de(FAMILIA_A))
    expect(await s.contar('resenas')).toBe(1)
  })

  prueba('quién ve qué: la paseadora ve lo que le escribieron; otra familia ve las de paseadores aprobados; la reseña es de la familia en cualquier teléfono', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    const mateo = await telefono(s, MATEO)
    const id = await pedirYCerrar(s, familia, lucia, LUCIA)
    escribir(familia, resena(id, LUCIA, 3, 'Regular.'))
    await guardado(familia, CLAVES.resenas)

    // La paseadora ve la reseña que le hicieron; Mateo, que es de otra paseadora aprobada, también la puede ver (es pública).
    expect((await lucia.cliente.resenasDePaseadores([LUCIA])).map((f) => f.paseo_id)).toEqual([id])
    expect((await mateo.cliente.resenasDePaseadores([LUCIA])).map((f) => f.paseo_id)).toEqual([id])

    // La misma familia, en OTRO teléfono: su reseña vuelve de la base como suya y no se puede reseñar el mismo paseo otra vez.
    const otroTelefono = await telefono(s, FAMILIA_A)
    await esperar(() => resenasDe(otroTelefono).some((r) => r.paseoId === id && r.mine === true), 'que el otro teléfono reciba la reseña')
    expect(resenasDe(otroTelefono)[0]).toMatchObject({ rating: 3, text: 'Regular.', walkerId: LUCIA })
  })
})
