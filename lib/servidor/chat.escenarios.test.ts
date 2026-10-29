/**
 * El chat y la actividad entre dos teléfonos (paso 6b), de punta a punta y SIN red: dos teléfonos (una familia y una
 * paseadora) con la copia en memoria de la app conectados a un servidor de prueba. Cada escenario corre contra el servidor
 * simulado, contra las reglas SQL reales en PGlite y contra el cliente de Supabase por HTTP (si PGlite está instalado).
 * No se usa el Supabase real: no hay red, ni claves, ni cuentas.
 */
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { CLAVES } from '../datos/claves'
import { moverPaseo, newMessageId, registrarLecturas, type ChatMsg } from '../bus'
import { textoDeActividad, ultimaActividadDe } from '../chatServidor'
import { lecturasDeEscenario } from '../zonaDemo'
import { paseadoresDeVista } from './paseadoresReales'
import { TEXTO_SERVIDOR } from './paseosTextos'
import { crearServidorFalso, type ServidorDePrueba } from './pruebas/servidorFalso'
import { crearServidorHttp } from './pruebas/servidorHttp'
import { crearServidorPglite } from './pruebas/servidorPglite'
import { abrirTelefono, esperar, jobDeSolicitud, type Telefono } from './pruebas/telefonos'
import { ErrorDeBase } from './paseosTipos'

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
  await s.paseadorAprobado({ id: MATEO, nombre: 'Mateo', apellido: 'Rojas' })
  return s
}

async function telefono(s: ServidorDePrueba, uid: string | null, opciones?: Parameters<typeof abrirTelefono>[2]): Promise<Telefono> {
  const t = abrirTelefono(s, uid, opciones)
  abiertos.push(t)
  await t.copia.alEstarListo()
  return t
}

const guardado = async (t: Telefono, clave: string = CLAVES.paseo) => expect(await t.copia.yaSeGuardo(clave)).toBe('guardado')

/** La familia pide a `paseadorId` y esa persona acepta: ya hay un paseo con chat posible. */
async function paseoAceptado(s: ServidorDePrueba, familia: Telefono, paseador: Telefono, paseadorId: string, hora = 10) {
  const w = paseadoresDeVista(await familia.cliente.paseadoresPublicos()).find((x) => x.id === paseadorId)!
  const { job } = jobDeSolicitud({ walker: w, hora })
  familia.actuar(() => job)
  await guardado(familia)
  await esperar(() => paseador.paseos().some((j) => j.id === job.id), 'que el paseador vea la solicitud')
  paseador.actuar((j) => moverPaseo(j, 'aceptar', 'paseador', Date.now()))
  await guardado(paseador)
  await esperar(() => familia.activo()?.paseo.estado === 'aceptado', 'que la familia vea que aceptó')
  return job
}

const fabricas: Array<[string, () => Promise<ServidorDePrueba | null>, boolean]> = [
  ['servidor simulado', async () => crearServidorFalso(), true],
  ['reglas SQL en PGlite', () => crearServidorPglite(RAIZ), hayPglite],
  ['cliente de Supabase por HTTP sobre PGlite', () => crearServidorHttp(RAIZ), hayPglite],
]

describe.each(fabricas)('chat entre teléfonos · %s', (_nombre, fabrica, disponible) => {
  const prueba = it.skipIf(!disponible)

  prueba('la familia y la paseadora se escriben desde SU teléfono, en orden y sin repetirse', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    const job = await paseoAceptado(s, familia, lucia, LUCIA)

    const m1 = familia.escribir('Hola Lucía, ¿ya vas en camino?')
    await guardado(familia, CLAVES.chat)
    expect(await s.contar('mensajes')).toBe(1)
    await esperar(() => lucia.chat().some((m) => m.id === m1.id), 'que la paseadora lea el mensaje')
    const visto = lucia.chat().find((m) => m.id === m1.id)!
    expect(visto).toMatchObject({ from: 'owner', text: 'Hola Lucía, ¿ya vas en camino?', jobId: job.id })

    lucia.escribir('¡Sí! Llego en 5 minutos 👋')
    await guardado(lucia, CLAVES.chat)
    await esperar(() => familia.chat().length === 2, 'que la familia lea la respuesta')
    const textos = familia.chat().map((m) => `${m.from}:${m.text}`)
    expect(textos).toEqual(['owner:Hola Lucía, ¿ya vas en camino?', 'walker:¡Sí! Llego en 5 minutos 👋'])
    expect(await s.contar('mensajes')).toBe(2)
    // Cada uno ve lo mismo y no se repite nada.
    await esperar(() => lucia.chat().length === 2, 'que la paseadora vea los dos')
    expect(new Set(lucia.chat().map((m) => m.id)).size).toBe(2)
    expect(new Set(familia.chat().map((m) => m.id)).size).toBe(2)
  })

  prueba('la familia A no lee los chats de la B; quien no es del paseo no puede leer ni escribir; el equipo solo lee', async () => {
    const s = await nuevoServidor(fabrica)
    const familiaA = await telefono(s, FAMILIA_A)
    const familiaB = await telefono(s, FAMILIA_B)
    const lucia = await telefono(s, LUCIA)
    const mateo = await telefono(s, MATEO)
    const paseoA = await paseoAceptado(s, familiaA, lucia, LUCIA)
    const paseoB = await paseoAceptado(s, familiaB, mateo, MATEO, 11)

    familiaA.escribir('Secreto de la familia A')
    await guardado(familiaA, CLAVES.chat)
    familiaB.escribir('Mensaje de la familia B')
    await guardado(familiaB, CLAVES.chat)
    mateo.escribir('Respuesta de Mateo a la B')
    await guardado(mateo, CLAVES.chat)
    await esperar(() => lucia.chat().length === 1 && familiaB.chat().length === 2 && familiaA.chat().length === 1, 'que cada uno reciba lo suyo')

    // Cada teléfono tiene SOLO los mensajes de sus paseos.
    expect(familiaA.chat().map((m) => m.jobId)).toEqual([paseoA.id])
    expect(lucia.chat().map((m) => m.text)).toEqual(['Secreto de la familia A'])
    expect(familiaB.chat().every((m) => m.jobId === paseoB.id)).toBe(true)
    expect(mateo.chat().every((m) => m.jobId === paseoB.id)).toBe(true)

    // Lo que la base entrega con la sesión de cada persona (no lo que la app filtra).
    expect(await s.cliente(FAMILIA_B).listarMensajes([paseoA.id])).toEqual([])
    expect(await s.cliente(MATEO).listarMensajes([paseoA.id])).toEqual([])
    expect((await s.cliente(EQUIPO).listarMensajes([paseoA.id, paseoB.id])).length).toBe(3)
    expect(await s.cliente(null).listarMensajes([paseoA.id]).then((f) => f, () => 'sin sesión')).toSatisfy((r: unknown) => r === 'sin sesión' || (Array.isArray(r) && r.length === 0))

    // Un tercero no puede escribir en el chat ajeno, ni «como» la otra persona, ni el equipo.
    const intento = (uid: string | null, de: 'owner' | 'walker', paseo: string) =>
      s.cliente(uid).crearMensaje({ id: newMessageId(), paseo_id: paseo, de, texto: 'intruso' })
    await expect(intento(FAMILIA_B, 'owner', paseoA.id)).rejects.toBeInstanceOf(ErrorDeBase)
    await expect(intento(FAMILIA_B, 'walker', paseoA.id)).rejects.toBeInstanceOf(ErrorDeBase)
    await expect(intento(MATEO, 'walker', paseoA.id)).rejects.toBeInstanceOf(ErrorDeBase)
    await expect(intento(MATEO, 'owner', paseoA.id)).rejects.toBeInstanceOf(ErrorDeBase)
    // Ni siquiera en SU paseo puede escribir como el otro lado.
    await expect(intento(FAMILIA_A, 'walker', paseoA.id)).rejects.toBeInstanceOf(ErrorDeBase)
    await expect(intento(LUCIA, 'owner', paseoA.id)).rejects.toBeInstanceOf(ErrorDeBase)
    await expect(intento(EQUIPO, 'owner', paseoA.id)).rejects.toBeInstanceOf(ErrorDeBase)
    await expect(intento(EQUIPO, 'walker', paseoA.id)).rejects.toBeInstanceOf(ErrorDeBase)
    await expect(intento(null, 'owner', paseoA.id)).rejects.toBeInstanceOf(ErrorDeBase)
    expect(await s.contar('mensajes')).toBe(3)

    // El teléfono del equipo no baja el chat (no lo usa).
    const equipo = await telefono(s, EQUIPO)
    await new Promise((r) => setTimeout(r, 60))
    expect(equipo.chat()).toEqual([])
  })

  prueba('sin internet el mensaje espera en la pantalla y llega UNA sola vez al volver; un reintento no lo duplica', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    await paseoAceptado(s, familia, lucia, LUCIA)

    familia.cliente.fallarConRed('siempre')
    const m = familia.escribir('¿Me avisas cuando llegues?')
    // Se ve en la pantalla de quien lo escribió y la copia dice que no pudo enviarlo.
    expect(familia.chat().map((x) => x.id)).toContain(m.id)
    await esperar(() => familia.copia.estadoGuardado(CLAVES.chat) === 'error', 'que diga que no pudo enviarlo')
    expect(familia.copia.estadoConexion()).toBe('sin_conexion')
    expect(await s.contar('mensajes')).toBe(0)

    // Vuelve internet: se envía solo, una vez.
    familia.cliente.fallarConRed(0)
    await esperar(async () => (await s.contar('mensajes')) === 1, 'que el mensaje llegue al volver internet')
    await guardado(familia, CLAVES.chat)
    await esperar(() => lucia.chat().some((x) => x.id === m.id), 'que la paseadora lo lea')
    await new Promise((r) => setTimeout(r, 120))
    expect(await s.contar('mensajes')).toBe(1)
    expect(familia.chat().filter((x) => x.id === m.id)).toHaveLength(1)
    expect(lucia.chat().filter((x) => x.id === m.id)).toHaveLength(1)

    // La respuesta se perdió pero el mensaje SÍ había llegado: mandarlo otra vez con el mismo id no lo duplica.
    const ya = await s.cliente(FAMILIA_A).listarMensajes([familia.activo()!.id])
    await s.cliente(FAMILIA_A).crearMensaje({ id: m.id, paseo_id: familia.activo()!.id, de: 'owner', texto: String(ya[0].texto) })
    expect(await s.contar('mensajes')).toBe(1)

    // Y si es el teléfono el que reenvía algo que ya estaba (un mensaje con el mismo id), tampoco.
    const guardadoYa = familia.escribir('Mismo id', m.id)
    expect(guardadoYa.id).toBe(m.id)
    await guardado(familia, CLAVES.chat)
    await new Promise((r) => setTimeout(r, 60))
    expect(await s.contar('mensajes')).toBe(1)
  })

  prueba('varios mensajes con corte a la mitad: lo que ya llegó no se repite y el orden se mantiene', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    await paseoAceptado(s, familia, lucia, LUCIA)

    familia.escribir('uno')
    await guardado(familia, CLAVES.chat)
    // El segundo falla una vez (corte) y el tercero se escribe mientras tanto.
    familia.cliente.fallarConRed(1)
    familia.escribir('dos')
    familia.escribir('tres')
    await esperar(async () => (await s.contar('mensajes')) === 3, 'que lleguen los tres')
    await guardado(familia, CLAVES.chat)
    await esperar(() => lucia.chat().length === 3, 'que la paseadora vea los tres')
    expect(lucia.chat().map((m) => m.text)).toEqual(['uno', 'dos', 'tres'])
    await new Promise((r) => setTimeout(r, 120))
    expect(await s.contar('mensajes')).toBe(3)
  })

  prueba('un mensaje de la persona que la base no acepta se descarta con un texto claro (no se reintenta)', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    await paseoAceptado(s, familia, lucia, LUCIA)
    const rechazos: string[] = []
    lucia.copia.suscribirRechazos((r) => rechazos.push(r.mensaje))
    // La paseadora escribe «como» la familia (un teléfono manipulado): la base lo rechaza.
    const mal: ChatMsg = { id: newMessageId(), from: 'owner', text: 'Soy la familia', at: Date.now(), jobId: familia.activo()!.id }
    await expect(s.cliente(LUCIA).crearMensaje({ id: mal.id, paseo_id: mal.jobId!, de: 'owner', texto: 'Soy la familia' })).rejects.toBeInstanceOf(ErrorDeBase)
    expect(await s.contar('mensajes')).toBe(0)
    // Desde la app, un mensaje «de la otra persona» ni siquiera se manda.
    lucia.copia.guardar(CLAVES.chat, [...lucia.chat(), mal])
    await guardado(lucia, CLAVES.chat)
    expect(await s.contar('mensajes')).toBe(0)
    expect(rechazos).toEqual([])
  })

  prueba('un mensaje con foto y sin texto no viaja todavía (las fotos del chat llegan con el paso de las fotos)', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    const job = await paseoAceptado(s, familia, lucia, LUCIA)
    familia.copia.guardar(CLAVES.chat, [...familia.chat(), { id: newMessageId(), from: 'owner', image: 'data:image/jpeg;base64,AAAA', at: Date.now(), jobId: job.id }])
    await guardado(familia, CLAVES.chat)
    expect(await s.contar('mensajes')).toBe(0)
  })

  prueba('los avisos de zona del teléfono del paseador los ve la familia, sin subir ninguna ubicación', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    const job = await paseoAceptado(s, familia, lucia, LUCIA)
    lucia.actuar((j) => moverPaseo(j, 'salir', 'paseador', Date.now()))
    await guardado(lucia)
    lucia.actuar((j) => moverPaseo(j, 'recoger', 'paseador', Date.now()))
    await guardado(lucia)
    await esperar(() => familia.activo()?.paseo.estado === 'en_paseo', 'que la familia vea que van de paseo')

    // El teléfono de la paseadora mide la ubicación y deja los avisos en el registro del paseo (como la app).
    lucia.actuar((j) => registrarLecturas(j, lecturasDeEscenario('salida', Date.now()), { demo: false, desdeCero: true }))
    await guardado(lucia)
    const delPaseador = lucia.activo()!.paseo.eventos.filter((e) => e.accion === 'avisar').map((e) => e.aviso)
    expect(delPaseador).toContain('salida')

    await esperar(() => familia.activo()!.paseo.eventos.filter((e) => e.accion === 'avisar').length === delPaseador.length, 'que la familia vea todos los avisos')
    const avisos = familia.activo()!.paseo.eventos.filter((e) => e.accion === 'avisar')
    expect(avisos.map((a) => a.aviso)).toEqual(delPaseador)
    for (const a of avisos) {
      expect(a.quien).toBe('sistema')
      expect(a.demo).toBeFalsy()
    }

    // En la base solo quedan el tipo de aviso y su nota: ninguna coordenada.
    const filas = (await s.cliente(FAMILIA_A).listarEventos([job.id])).filter((f) => f.accion === 'avisar')
    expect(filas.length).toBe(avisos.length)
    expect(JSON.stringify(filas)).not.toMatch(/-?\d{1,3}\.\d{4,}/)
    for (const f of filas) expect(Object.keys(f).sort()).toEqual(['a', 'accion', 'aviso', 'de', 'demo', 'en', 'id', 'nota', 'paseo_id', 'quien'].sort())
    // Lo que sigue en el teléfono de la paseadora (la memoria del motor de avisos) no sube.
    expect(JSON.stringify(await s.cliente(FAMILIA_A).listarPaseos(5))).not.toContain('vigilancia":{')
  })

  prueba('«Activo hace…» sale solo de lo que la otra persona hizo en la base; sin nada, no se dice nada', async () => {
    const s = await nuevoServidor(fabrica)
    const familia = await telefono(s, FAMILIA_A)
    const lucia = await telefono(s, LUCIA)
    const w = paseadoresDeVista(await familia.cliente.paseadoresPublicos()).find((x) => x.id === LUCIA)!
    const { job } = jobDeSolicitud({ walker: w })
    familia.actuar(() => job)
    await guardado(familia)
    await esperar(() => lucia.paseos().length === 1, 'que la paseadora vea la solicitud')

    // La paseadora todavía no hizo nada: la familia no sabe nada de ella.
    const antes = ultimaActividadDe('walker', familia.chat(), familia.activo()!.paseo)
    expect(antes).toBeNull()
    expect(textoDeActividad(antes, Date.now())).toBeNull()

    // Acepta y escribe: ahora sí hay una hora (la de la base).
    lucia.actuar((j) => moverPaseo(j, 'aceptar', 'paseador', Date.now()))
    await guardado(lucia)
    lucia.escribir('Hola, soy Lucía')
    await guardado(lucia, CLAVES.chat)
    await esperar(() => familia.chat().some((m) => m.from === 'walker') && familia.activo()?.paseo.estado === 'aceptado', 'que llegue lo de la paseadora')
    const ultima = ultimaActividadDe('walker', familia.chat(), familia.activo()!.paseo)
    expect(ultima).not.toBeNull()
    expect(textoDeActividad(ultima, Date.now())).toBe('Activo hace un momento')
    expect(textoDeActividad(ultima, Date.now() + 5 * 60_000)).toBe('Activo hace 5 min')
    expect(textoDeActividad(ultima, Date.now() + 3 * 60 * 60_000)).toBeNull()
    expect(TEXTO_SERVIDOR.chatSinFotos).toMatch(/solo se escribe/)
  })
})
