/**
 * Las respuestas ESCRITAS del examen con el servidor (Bloque 5), de punta a punta y sin red: el código de la app con el cliente de
 * Supabase de verdad, por HTTP, contra las migraciones SQL reales en PGlite. Lo que escribe el paseador viaja aparte de su
 * postulación, solo lo lee el equipo y no queda ningún texto en `postulaciones.examen`.
 */
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { CONFIG } from '../config'
import { PREGUNTAS_EXAMEN, resultadoDeExamenEscrito } from '../respuestasEscritas'
import { EMPTY_APP, type WalkerApplication } from '../walkerStore'
import { enviarMiPostulacion, leerPostulacionesDelEquipo } from './postulaciones'
import { crearServidorDeRevision, type ServidorDeRevision } from './pruebas/servidorRevision'

const RAIZ = path.resolve(__dirname, '..', '..')
const LUCIA = 'bbbbbbbb-0000-4000-8000-000000000001'
const FAMILIA = 'aaaaaaaa-0000-4000-8000-000000000001'
const EQUIPO = 'cccccccc-0000-4000-8000-000000000001'

const probe = await crearServidorDeRevision(RAIZ)
const hayPglite = probe !== null
await probe?.cerrar()

const abiertos: ServidorDeRevision[] = []
afterEach(async () => {
  await Promise.all(abiertos.splice(0).map((s) => s.cerrar()))
})

const texto = (i: number) => `Respuesta número ${i}: primero me calmo, miro a mi alrededor, aviso a la familia y a Patitas, y sigo con cuidado.`

const postulacion = (): WalkerApplication => {
  const respuestas = Object.fromEntries(PREGUNTAS_EXAMEN.map((p, i) => [p.id, texto(i)]))
  return {
    ...EMPTY_APP,
    phone: '987 654 321',
    consent: { edad: true },
    consentAt: '2026-10-10T15:00:00.000Z',
    person: { firstName: 'Lucía', lastName: 'Prueba', dni: '12345678', birth: '2004-03-02', district: 'San Isidro', university: 'U', career: 'C', cycle: '5' },
    profile: { ...EMPTY_APP.profile, bio: 'Hola', rate: 22, spots: ['olivar'] },
    consults: { consent: true },
    videoSlot: 'Lun 7:00 pm',
    status: 'enviada',
    code: 'PAT-LUCI',
    createdAt: '2026-10-10T15:00:00.000Z',
    quiz: resultadoDeExamenEscrito(respuestas, 400, new Date('2026-10-10T15:30:00Z')),
    quizAttempts: 1,
  }
}

describe.skipIf(!hayPglite)('respuestas escritas del examen (reglas SQL reales)', () => {
  it('el paseador las manda con su postulación; el equipo las lee por persona; el texto no queda en la postulación ni lo lee nadie más', async () => {
    const s = (await crearServidorDeRevision(RAIZ))!
    abiertos.push(s)
    await s.persona({ id: FAMILIA, rol: 'familia', nombre: 'Valeria' })
    await s.persona({ id: LUCIA, rol: 'paseador', nombre: 'Lucía', apellido: 'Quispe', celular: '987654321' })
    await s.persona({ id: EQUIPO, rol: 'equipo', nombre: 'Equipo' })

    const lucia = await s.telefono(LUCIA)
    const app = postulacion()
    const r = await enviarMiPostulacion(lucia.postulaciones, app, LUCIA)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.respuestas).not.toBe('')

    // En la postulación NO quedan los textos; en su tabla sí, una fila por pregunta.
    const examen = (await s.sql(`select examen from public.postulaciones`))[0].examen as { open: Record<string, string>; verdict: string }
    expect(examen.open).toEqual({})
    expect(examen.verdict).toBe('review')
    expect(await s.sql(`select count(*)::int as n from public.respuestas_escritas`)).toEqual([{ n: PREGUNTAS_EXAMEN.length }])

    // Mandar lo mismo otra vez no manda nada (huella igual) y el paseador no puede leerlas de vuelta.
    const otra = await enviarMiPostulacion(lucia.postulaciones, app, LUCIA, { huella: r.huella, dni: r.dni, respuestas: r.respuestas })
    expect(otra.ok && otra.respuestas).toBe(r.respuestas)
    expect(await lucia.postulaciones.listarRespuestas()).toEqual([])
    expect(await (await s.telefono(FAMILIA)).postulaciones.listarRespuestas()).toEqual([])

    // El equipo ve, por persona, lo que escribió.
    const equipo = await s.telefono(EQUIPO)
    const lista = await leerPostulacionesDelEquipo(equipo.postulaciones)
    expect(lista).toHaveLength(1)
    expect(lista[0].app.quiz?.open).toEqual(Object.fromEntries(PREGUNTAS_EXAMEN.map((p, i) => [p.id, texto(i)])))
  }, 60_000)

  it('una respuesta corta o larga la rechaza la base (los largos de lib/config.ts) y no guarda ninguna', async () => {
    const s = (await crearServidorDeRevision(RAIZ))!
    abiertos.push(s)
    await s.persona({ id: LUCIA, rol: 'paseador', nombre: 'Lucía', apellido: 'Quispe', celular: '987654321' })
    const lucia = await s.telefono(LUCIA)
    await expect(lucia.postulaciones.guardarRespuestas({ q1: 'a'.repeat(CONFIG.respuestaMinima - 1) })).rejects.toThrow()
    await expect(lucia.postulaciones.guardarRespuestas({ q1: 'a'.repeat(CONFIG.respuestaMaxima + 1) })).rejects.toThrow()
    await expect(lucia.postulaciones.guardarRespuestas({ q1: 'a'.repeat(CONFIG.respuestaMinima), q2: 'corta' })).rejects.toThrow()
    expect(await s.sql(`select count(*)::int as n from public.respuestas_escritas`)).toEqual([{ n: 0 }])
    await lucia.postulaciones.guardarRespuestas({ q1: 'a'.repeat(CONFIG.respuestaMinima), q2: 'b'.repeat(CONFIG.respuestaMaxima) })
    expect(await s.sql(`select count(*)::int as n from public.respuestas_escritas`)).toEqual([{ n: 2 }])
  }, 60_000)
})
