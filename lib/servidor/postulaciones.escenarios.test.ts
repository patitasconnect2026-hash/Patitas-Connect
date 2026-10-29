/**
 * Las postulaciones con el servidor (paso 7b), de punta a punta y SIN red: el código de la app (`postulaciones.ts` y
 * `clientePostulaciones.ts`) con el cliente de Supabase de verdad, por HTTP, contra las migraciones SQL REALES en PGlite
 * (`servidorRevision.ts`). Cada persona entra con SU sesión. Sin PGlite (`npm i --no-save @electric-sql/pglite@0.2.17`) se saltan.
 *
 * Se comprueba lo que pidió el plan: el paseador guarda su postulación y su DNI; el equipo las lee todas, marca las casillas y
 * aprueba o rechaza; «aprobado» sale solo con las cinco casillas; el paseador ve su estado real; nadie más ve nada.
 */
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { EMPTY_APP, estadoVisible, type WalkerApplication } from '../walkerStore'
import { ErrorDeBase } from './paseosTipos'
import { enviarMiPostulacion, guardarDecision, leerPostulacionesDelEquipo } from './postulaciones'
import { appConEstadoPropio, appDeFilas } from './postulacionesMapeo'
import { crearServidorDeRevision, type ServidorDeRevision } from './pruebas/servidorRevision'

const RAIZ = path.resolve(__dirname, '..', '..')
const LUCIA = 'bbbbbbbb-0000-4000-8000-000000000001'
const MATEO = 'bbbbbbbb-0000-4000-8000-000000000002'
const FAMILIA = 'aaaaaaaa-0000-4000-8000-000000000001'
const EQUIPO = 'cccccccc-0000-4000-8000-000000000001'

const probe = await crearServidorDeRevision(RAIZ)
const hayPglite = probe !== null
await probe?.cerrar()

const abiertos: ServidorDeRevision[] = []
afterEach(async () => {
  await Promise.all(abiertos.splice(0).map((s) => s.cerrar()))
})

async function nuevoServidor(): Promise<ServidorDeRevision> {
  const s = await crearServidorDeRevision(RAIZ)
  if (!s) throw new Error('El servidor de prueba no está disponible')
  abiertos.push(s)
  await s.persona({ id: FAMILIA, rol: 'familia', nombre: 'Valeria' })
  await s.persona({ id: LUCIA, rol: 'paseador', nombre: 'Lucía', apellido: 'Quispe', celular: '987654321' })
  await s.persona({ id: MATEO, rol: 'paseador', nombre: 'Mateo', apellido: 'Rojas', celular: '912345678' })
  await s.persona({ id: EQUIPO, rol: 'equipo', nombre: 'Equipo' })
  return s
}

const postulacionDe = (code: string, nombre: string, extra: Partial<WalkerApplication> = {}): WalkerApplication => ({
  ...EMPTY_APP,
  phone: '987 654 321',
  consent: { edad: true },
  consentAt: '2026-10-10T15:00:00.000Z',
  person: { firstName: nombre, lastName: 'Prueba', dni: '12345678', birth: '2004-03-02', district: 'San Isidro', university: 'U. de prueba', career: 'Psicología', cycle: '5' },
  profile: { ...EMPTY_APP.profile, bio: 'Hola', rate: 22, spots: ['olivar'] },
  consults: { consent: true },
  videoSlot: 'Lun 7:00 pm',
  status: 'enviada',
  code,
  createdAt: '2026-10-10T15:00:00.000Z',
  ...extra,
})

const CINCO = { dni: true, distrito: true, celular: true, consultas: true, examen: true }
const conMarcas = (a: WalkerApplication, marcas: Record<string, boolean>, status = a.status): WalkerApplication => ({ ...a, status, review: { ...a.review, comprobaciones: marcas } })

describe.skipIf(!hayPglite)('postulaciones con el servidor (reglas SQL reales)', () => {
  it('el paseador guarda su postulación y su DNI; el equipo la lee completa y el paseador NO puede volver a leer su DNI', async () => {
    const s = await nuevoServidor()
    const lucia = await s.telefono(LUCIA)
    const r = await enviarMiPostulacion(lucia.postulaciones, postulacionDe('PAT-LUCI', 'Lucía'), LUCIA)
    expect(r.ok).toBe(true)

    expect((await s.sql(`select estado::text as e, nombre from public.postulaciones`))[0]).toMatchObject({ e: 'enviada', nombre: 'Lucía' })
    expect(await s.sql(`select dni from public.datos_dni`)).toEqual([{ dni: '12345678' }])
    // El paseador no puede volver a leer su DNI (la regla solo deja leerlo al equipo).
    expect(await lucia.postulaciones.listarDnis()).toEqual([])

    const equipo = await s.telefono(EQUIPO)
    const lista = await leerPostulacionesDelEquipo(equipo.postulaciones)
    expect(lista).toHaveLength(1)
    expect(lista[0].id).toBe(LUCIA)
    expect(lista[0].app.person.dni).toBe('12345678')
    expect(lista[0].app.phone).toBe('987654321')
    expect(lista[0].app.status).toBe('enviada')
    expect(lista[0].app.person.firstName).toBe('Lucía')
  })

  it('enviar dos veces lo mismo no duplica nada (un solo paseador, una sola postulación, un solo DNI)', async () => {
    const s = await nuevoServidor()
    const lucia = await s.telefono(LUCIA)
    const app = postulacionDe('PAT-LUCI', 'Lucía')
    const primero = await enviarMiPostulacion(lucia.postulaciones, app, LUCIA)
    expect(primero.ok).toBe(true)
    // Con la memoria del envío anterior no vuelve a mandar nada…
    if (primero.ok) expect((await enviarMiPostulacion(lucia.postulaciones, app, LUCIA, primero)).ok).toBe(true)
    // …y sin ella (se cerró la app) lo manda otra vez y la base lo reconoce.
    expect((await enviarMiPostulacion(lucia.postulaciones, app, LUCIA)).ok).toBe(true)
    expect(await s.sql(`select count(*)::int as n from public.postulaciones`)).toEqual([{ n: 1 }])
    expect(await s.sql(`select count(*)::int as n from public.datos_dni`)).toEqual([{ n: 1 }])
  })

  it('sin internet no se marca como enviada y al volver sale sin duplicar', async () => {
    const s = await nuevoServidor()
    const lucia = await s.telefono(LUCIA)
    const app = postulacionDe('PAT-LUCI', 'Lucía')
    lucia.fallarConRed('siempre')
    const sin = await enviarMiPostulacion(lucia.postulaciones, app, LUCIA)
    expect(sin).toMatchObject({ ok: false, sinRed: true })
    expect(await s.sql(`select count(*)::int as n from public.postulaciones`)).toEqual([{ n: 0 }])
    lucia.fallarConRed(0)
    expect((await enviarMiPostulacion(lucia.postulaciones, app, LUCIA)).ok).toBe(true)
    expect(await s.sql(`select count(*)::int as n from public.postulaciones`)).toEqual([{ n: 1 }])
  })

  it('el equipo marca las casillas, aprueba y el paseador ve su estado REAL', async () => {
    const s = await nuevoServidor()
    const lucia = await s.telefono(LUCIA)
    await enviarMiPostulacion(lucia.postulaciones, postulacionDe('PAT-LUCI', 'Lucía'), LUCIA)
    const equipo = await s.telefono(EQUIPO)
    const [antes] = await leerPostulacionesDelEquipo(equipo.postulaciones)
    const aprobada = conMarcas(antes.app, CINCO, 'supervisado')
    expect(await guardarDecision(equipo.postulaciones, LUCIA, antes.app, { ...aprobada, review: { ...aprobada.review, notes: 'Videollamada hecha', supervisedWalks: 1 } })).toEqual({ ok: true })

    const fila = (await s.sql(`select estado::text as e, paseos_acompanados as p from public.postulaciones`))[0]
    expect(fila).toEqual({ e: 'supervisado', p: 1 })
    expect(await s.sql(`select dni, distrito, celular, consultas, examen, marcado_por::text as por from public.comprobaciones`)).toEqual([{ dni: true, distrito: true, celular: true, consultas: true, examen: true, por: EQUIPO }])
    expect(await s.sql(`select nota from public.notas_revision`)).toEqual([{ nota: 'Videollamada hecha' }])

    // El paseador ve su estado real (aprobada, con sus casillas) y NUNCA las notas internas.
    const { post, comp } = await lucia.postulaciones.miPostulacion(LUCIA)
    const suya = appConEstadoPropio(postulacionDe('PAT-LUCI', 'Lucía'), post, comp)!
    expect(estadoVisible(suya)).toBe('supervisado')
    expect(suya.review.supervisedWalks).toBe(1)
    expect(suya.review.notes).toBe('')
    expect(await lucia.postulaciones.listarNotas()).toEqual([])
  })

  it('«aprobado» sale SOLO con las cinco casillas: con cuatro la app la muestra en revisión y la vista pública no la entrega', async () => {
    const s = await nuevoServidor()
    const lucia = await s.telefono(LUCIA)
    await enviarMiPostulacion(lucia.postulaciones, postulacionDe('PAT-LUCI', 'Lucía'), LUCIA)
    await s.sql(`insert into public.cobros_paseador (paseador_id, metodo, celular, titular) values ($1, 'yape', '987654321', 'Lucía Quispe')`, [LUCIA])
    const equipo = await s.telefono(EQUIPO)
    const [antes] = await leerPostulacionesDelEquipo(equipo.postulaciones)

    // El equipo (por error o por probar) deja «aprobada» con cuatro casillas: la base lo guarda, pero NO figura aprobada.
    await guardarDecision(equipo.postulaciones, LUCIA, antes.app, conMarcas(antes.app, { ...CINCO, examen: false }, 'supervisado'))
    const [conCuatro] = await leerPostulacionesDelEquipo(equipo.postulaciones)
    expect(conCuatro.app.status).toBe('supervisado')
    expect(estadoVisible(conCuatro.app)).toBe('enviada')
    expect(await s.sql(`select count(*)::int as n from public.paseadores_publicos`)).toEqual([{ n: 0 }])

    // Con la quinta casilla, sí.
    await guardarDecision(equipo.postulaciones, LUCIA, conCuatro.app, conMarcas(conCuatro.app, CINCO))
    const [conCinco] = await leerPostulacionesDelEquipo(equipo.postulaciones)
    expect(estadoVisible(conCinco.app)).toBe('supervisado')
    expect(await s.sql(`select count(*)::int as n from public.paseadores_publicos`)).toEqual([{ n: 1 }])
  })

  it('rechazar: el paseador ve «rechazada» y sus cambios ya no tocan el estado', async () => {
    const s = await nuevoServidor()
    const lucia = await s.telefono(LUCIA)
    const app = postulacionDe('PAT-LUCI', 'Lucía')
    await enviarMiPostulacion(lucia.postulaciones, app, LUCIA)
    const equipo = await s.telefono(EQUIPO)
    const [antes] = await leerPostulacionesDelEquipo(equipo.postulaciones)
    expect(await guardarDecision(equipo.postulaciones, LUCIA, antes.app, { ...antes.app, status: 'rechazada' })).toEqual({ ok: true })

    const { post, comp } = await lucia.postulaciones.miPostulacion(LUCIA)
    expect(estadoVisible(appConEstadoPropio(app, post, comp)!)).toBe('rechazada')

    // El paseador cambia su perfil: se guarda, pero el estado sigue «rechazada» (eso lo cambia el equipo).
    const editada = { ...app, profile: { ...app.profile, bio: 'Otra descripción' } }
    expect((await enviarMiPostulacion(lucia.postulaciones, editada, LUCIA)).ok).toBe(true)
    expect(await s.sql(`select estado::text as e, perfil->>'bio' as bio from public.postulaciones`)).toEqual([{ e: 'rechazada', bio: 'Otra descripción' }])
  })

  it('el paseador NO puede aprobarse a sí mismo, ni marcar casillas, ni cambiar su estado a mano', async () => {
    const s = await nuevoServidor()
    const lucia = await s.telefono(LUCIA)
    const app = postulacionDe('PAT-LUCI', 'Lucía')
    await enviarMiPostulacion(lucia.postulaciones, app, LUCIA)

    const antes = appDeFilas({ post: (await lucia.postulaciones.miPostulacion(LUCIA)).post! })
    const r = await guardarDecision(lucia.postulaciones, LUCIA, antes, conMarcas(antes, CINCO, 'activo'))
    expect(r.ok).toBe(false)
    await expect(lucia.postulaciones.decidir(LUCIA, { estado: 'activo' })).rejects.toBeInstanceOf(ErrorDeBase)
    await expect(lucia.postulaciones.marcarCasillas(LUCIA, { ...CINCO, primerPaseo: false }, LUCIA)).rejects.toBeInstanceOf(ErrorDeBase)
    await expect(lucia.postulaciones.guardarNota(LUCIA, 'me apruebo', LUCIA)).rejects.toBeInstanceOf(ErrorDeBase)
    expect(await s.sql(`select estado::text as e from public.postulaciones`)).toEqual([{ e: 'enviada' }])
    expect(await s.sql(`select count(*)::int as n from public.comprobaciones`)).toEqual([{ n: 0 }])
    expect(await s.sql(`select count(*)::int as n from public.notas_revision`)).toEqual([{ n: 0 }])
  })

  it('un paseador no ve la postulación, el DNI ni las casillas de otro; la familia no ve ninguna', async () => {
    const s = await nuevoServidor()
    for (const [id, code, nombre] of [[LUCIA, 'PAT-LUCI', 'Lucía'], [MATEO, 'PAT-MATE', 'Mateo']] as const) {
      const t = await s.telefono(id)
      await enviarMiPostulacion(t.postulaciones, postulacionDe(code, nombre), id)
    }
    const mateo = await s.telefono(MATEO)
    expect((await mateo.postulaciones.miPostulacion(LUCIA)).post).toBeNull()
    expect((await mateo.postulaciones.listarPostulaciones()).map((f) => f.paseador_id)).toEqual([MATEO])
    expect(await mateo.postulaciones.listarDnis()).toEqual([])
    const familia = await s.telefono(FAMILIA)
    expect(await familia.postulaciones.listarPostulaciones()).toEqual([])
    expect(await familia.postulaciones.listarComprobaciones()).toEqual([])
    expect(await familia.postulaciones.listarNotas()).toEqual([])
    // Sin sesión, nada.
    const anonimo = await s.telefono(null)
    expect(await anonimo.postulaciones.listarPostulaciones().catch(() => [])).toEqual([])
    // El equipo ve las dos.
    const equipo = await s.telefono(EQUIPO)
    expect((await leerPostulacionesDelEquipo(equipo.postulaciones)).map((p) => p.id).sort()).toEqual([LUCIA, MATEO])
  })

  it('una familia no puede crear una postulación (solo un paseador)', async () => {
    const s = await nuevoServidor()
    const familia = await s.telefono(FAMILIA)
    const r = await enviarMiPostulacion(familia.postulaciones, postulacionDe('PAT-FAMI', 'Valeria'), FAMILIA)
    expect(r.ok).toBe(false)
    expect(await s.sql(`select count(*)::int as n from public.postulaciones`)).toEqual([{ n: 0 }])
  })

  it('cuando el equipo no logra guardar (sin internet), lo dice y NO marca nada', async () => {
    const s = await nuevoServidor()
    const lucia = await s.telefono(LUCIA)
    await enviarMiPostulacion(lucia.postulaciones, postulacionDe('PAT-LUCI', 'Lucía'), LUCIA)
    const equipo = await s.telefono(EQUIPO)
    const [antes] = await leerPostulacionesDelEquipo(equipo.postulaciones)
    equipo.fallarConRed('siempre')
    const r = await guardarDecision(equipo.postulaciones, LUCIA, antes.app, conMarcas(antes.app, CINCO, 'supervisado'))
    expect(r).toMatchObject({ ok: false, sinRed: true })
    expect(await s.sql(`select estado::text as e from public.postulaciones`)).toEqual([{ e: 'enviada' }])
    expect(await s.sql(`select count(*)::int as n from public.comprobaciones`)).toEqual([{ n: 0 }])
  })
  it('el paseador corrige su DNI: se guarda el nuevo, él no lo puede leer, y la casilla «DNI» del equipo vuelve a quedar sin marcar', async () => {
    const s = await nuevoServidor()
    const lucia = await s.telefono(LUCIA)
    const app = postulacionDe('PAT-LUCI', 'Lucía')
    const primero = await enviarMiPostulacion(lucia.postulaciones, app, LUCIA)
    expect(primero.ok).toBe(true)
    const equipo = await s.telefono(EQUIPO)
    const [antes] = await leerPostulacionesDelEquipo(equipo.postulaciones)
    await guardarDecision(equipo.postulaciones, LUCIA, antes.app, conMarcas(antes.app, CINCO, 'supervisado'))
    expect(estadoVisible((await leerPostulacionesDelEquipo(equipo.postulaciones))[0].app)).toBe('supervisado')

    // Mandar el MISMO DNI otra vez (reintento, o abrió la app de nuevo) no toca nada: la casilla sigue marcada.
    expect((await enviarMiPostulacion(lucia.postulaciones, app, LUCIA)).ok).toBe(true)
    expect((await leerPostulacionesDelEquipo(equipo.postulaciones))[0].app.review.comprobaciones.dni).toBe(true)

    // Lo corrige: el equipo ve el número nuevo y la casilla «DNI» queda sin marcar; deja de figurar aprobada.
    const corregida = { ...app, person: { ...app.person, dni: '87654321' } }
    expect((await enviarMiPostulacion(lucia.postulaciones, corregida, LUCIA, primero.ok ? primero : null)).ok).toBe(true)
    const [despues] = await leerPostulacionesDelEquipo(equipo.postulaciones)
    expect(despues.app.person.dni).toBe('87654321')
    expect(despues.app.review.comprobaciones).toMatchObject({ dni: false, distrito: true, celular: true, consultas: true, examen: true })
    expect(estadoVisible(despues.app)).toBe('enviada')
    // Ella sigue sin poder leerlo.
    expect(await lucia.postulaciones.listarDnis()).toEqual([])
    expect(await s.sql(`select count(*)::int as n from public.datos_dni`)).toEqual([{ n: 1 }])
  })

  it('un DNI que no tiene 8 números no se manda ni se guarda', async () => {
    const s = await nuevoServidor()
    const lucia = await s.telefono(LUCIA)
    const mal = postulacionDe('PAT-LUCI', 'Lucía', { person: { ...postulacionDe('x', 'Lucía').person, dni: '1234' } })
    expect((await enviarMiPostulacion(lucia.postulaciones, mal, LUCIA)).ok).toBe(true)
    expect(await s.sql(`select count(*)::int as n from public.datos_dni`)).toEqual([{ n: 0 }])
    await expect(lucia.postulaciones.guardarDni('1234')).rejects.toBeInstanceOf(ErrorDeBase)
    await expect(lucia.postulaciones.guardarDni('1234567a')).rejects.toBeInstanceOf(ErrorDeBase)
  })

  it('una familia o un paseador sin postulación no guardan DNI', async () => {
    const s = await nuevoServidor()
    const familia = await s.telefono(FAMILIA)
    await expect(familia.postulaciones.guardarDni('12345678')).rejects.toBeInstanceOf(ErrorDeBase)
    const mateo = await s.telefono(MATEO)
    await expect(mateo.postulaciones.guardarDni('12345678')).rejects.toBeInstanceOf(ErrorDeBase)
    expect(await s.sql(`select count(*)::int as n from public.datos_dni`)).toEqual([{ n: 0 }])
  })
  it('dónde cobra sale junto con la postulación: el equipo lo ve al revisar y, al aprobar, la familia ya ve al paseador', async () => {
    const s = await nuevoServidor()
    const lucia = await s.telefono(LUCIA)
    const cobro = { metodo: 'yape' as const, telefono: '987 654 321', titular: 'Lucía Quispe' }
    const app = postulacionDe('PAT-LUCI', 'Lucía', { cobro })
    expect((await enviarMiPostulacion(lucia.postulaciones, app, LUCIA)).ok).toBe(true)
    // Sin abrir la pantalla «Hoy» ni nada más: la base ya tiene dónde cobra.
    expect(await s.sql(`select metodo::text as m, celular, titular from public.cobros_paseador`)).toEqual([{ m: 'yape', celular: '+51987654321', titular: 'Lucía Quispe' }])
    const equipo = await s.telefono(EQUIPO)
    const [antes] = await leerPostulacionesDelEquipo(equipo.postulaciones)
    expect(antes.app.cobro).toMatchObject({ metodo: 'yape', titular: 'Lucía Quispe' })
    expect(await s.sql(`select count(*)::int as n from public.paseadores_publicos`)).toEqual([{ n: 0 }])
    await guardarDecision(equipo.postulaciones, LUCIA, antes.app, conMarcas(antes.app, CINCO, 'supervisado'))
    expect(await s.sql(`select count(*)::int as n from public.paseadores_publicos`)).toEqual([{ n: 1 }])
  })

  it('si cambia dónde cobra, el cambio sale; si no cambia nada, no se vuelve a mandar', async () => {
    const s = await nuevoServidor()
    const lucia = await s.telefono(LUCIA)
    const app = postulacionDe('PAT-LUCI', 'Lucía', { cobro: { metodo: 'yape', telefono: '987 654 321', titular: 'Lucía Quispe' } })
    const primero = await enviarMiPostulacion(lucia.postulaciones, app, LUCIA)
    expect(primero.ok).toBe(true)
    const igual = await enviarMiPostulacion(lucia.postulaciones, app, LUCIA, primero.ok ? primero : null)
    expect(igual.ok).toBe(true)
    const cambiada = { ...app, cobro: { metodo: 'plin' as const, telefono: '912 345 678', titular: 'Lucía Quispe R.' } }
    expect((await enviarMiPostulacion(lucia.postulaciones, cambiada, LUCIA, igual.ok ? igual : null)).ok).toBe(true)
    expect(await s.sql(`select metodo::text as m, celular, titular from public.cobros_paseador`)).toEqual([{ m: 'plin', celular: '+51912345678', titular: 'Lucía Quispe R.' }])
  })

  it('en otro teléfono, donde se armó otro código, se queda con el código de la base (la base no deja cambiarlo)', async () => {
    const s = await nuevoServidor()
    const telefonoA = await s.telefono(LUCIA)
    const primero = await enviarMiPostulacion(telefonoA.postulaciones, postulacionDe('PAT-AAAA', 'Lucía'), LUCIA)
    expect(primero).toMatchObject({ ok: true, codigo: 'PAT-AAAA' })
    const telefonoB = await s.telefono(LUCIA)
    const segundo = await enviarMiPostulacion(telefonoB.postulaciones, postulacionDe('PAT-BBBB', 'Lucía', { profile: { ...postulacionDe('x', 'Lucía').profile, bio: 'Cambié mi descripción desde otro teléfono.' } }), LUCIA)
    expect(segundo).toMatchObject({ ok: true, codigo: 'PAT-AAAA' })
    expect(await s.sql(`select codigo, perfil->>'bio' as bio from public.postulaciones`)).toEqual([{ codigo: 'PAT-AAAA', bio: 'Cambié mi descripción desde otro teléfono.' }])
  })

  it('si el código al azar ya es de otra persona, se prueba otro y la postulación no se pierde', async () => {
    const s = await nuevoServidor()
    const lucia = await s.telefono(LUCIA)
    const mateo = await s.telefono(MATEO)
    expect((await enviarMiPostulacion(lucia.postulaciones, postulacionDe('PAT-IGUAL', 'Lucía'), LUCIA)).ok).toBe(true)
    const r = await enviarMiPostulacion(mateo.postulaciones, postulacionDe('PAT-IGUAL', 'Mateo'), MATEO)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.codigo).not.toBe('PAT-IGUAL')
    const codigos = (await s.sql(`select codigo from public.postulaciones order by nombre`)).map((f) => f.codigo)
    expect(new Set(codigos).size).toBe(2)
  })
})
