/**
 * La ubicación del paseo y las fotos «sospechosas» (Bloque 6), de punta a punta y SIN red: el código de la app con el cliente de
 * Supabase de verdad, por HTTP, contra las migraciones SQL reales en PGlite. La paseadora publica su lectura, la familia la ve,
 * nadie más; la hora oficial la pone el servidor; la foto con una lectura mala queda marcada y solo el equipo lo sabe.
 */
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { CLAVES } from '../datos/claves'
import { moverPaseo } from '../bus'
import type { LatLng } from '../geo'
import { paseadoresDeVista } from './paseadoresReales'
import { crearServidorHttp } from './pruebas/servidorHttp'
import { crearServidorPglite } from './pruebas/servidorPglite'
import type { ServidorDePrueba } from './pruebas/servidorFalso'
import { abrirTelefono, esperar as esperarPoco, jobDeSolicitud, type Telefono } from './pruebas/telefonos'

const RAIZ = path.resolve(__dirname, '..', '..')
const FAMILIA = 'aaaaaaaa-0000-4000-8000-000000000001'
const OTRA = 'aaaaaaaa-0000-4000-8000-000000000002'
const LUCIA = 'bbbbbbbb-0000-4000-8000-000000000001'
const MATEO = 'bbbbbbbb-0000-4000-8000-000000000002'
const EQUIPO = 'cccccccc-0000-4000-8000-000000000001'
const OLIVAR: LatLng = [-12.0999, -77.0374]

const hayPglite = (await crearServidorPglite(RAIZ).then(
  async (s) => {
    await s?.cerrar()
    return s !== null
  },
  () => false,
)) as boolean

const esperar = (condicion: () => boolean | Promise<boolean>, descripcion: string) => esperarPoco(condicion, descripcion, 30_000)
const abiertos: Telefono[] = []
const servidores: ServidorDePrueba[] = []
afterEach(async () => {
  abiertos.splice(0).forEach((t) => t.cerrar())
  await Promise.all(servidores.splice(0).map((s) => s.cerrar()))
})

async function telefono(s: ServidorDePrueba, uid: string): Promise<Telefono> {
  const t = abrirTelefono(s, uid)
  abiertos.push(t)
  await t.copia.alEstarListo()
  return t
}
const guardado = async (t: Telefono) => expect(await t.copia.yaSeGuardo(CLAVES.paseo)).toBe('guardado')

describe.skipIf(!hayPglite)('ubicación en vivo y fotos sospechosas (reglas SQL reales)', () => {
  it('la paseadora publica, la familia ve, nadie más; la foto con mala lectura queda marcada solo para el equipo; al entregar se borra', async () => {
    const s = (await crearServidorHttp(RAIZ))!
    servidores.push(s)
    await s.persona({ id: FAMILIA, rol: 'familia', nombre: 'Valeria' })
    await s.persona({ id: OTRA, rol: 'familia', nombre: 'Rosa' })
    await s.persona({ id: EQUIPO, rol: 'equipo', nombre: 'Equipo' })
    await s.paseadorAprobado({ id: LUCIA, nombre: 'Lucía', apellido: 'Quispe' })
    await s.paseadorAprobado({ id: MATEO, nombre: 'Mateo', apellido: 'Rojas' })

    const familia = await telefono(s, FAMILIA)
    const lucia = await telefono(s, LUCIA)
    const w = paseadoresDeVista(await familia.cliente.paseadoresPublicos()).find((x) => x.id === LUCIA)!
    const { job } = jobDeSolicitud({ walker: w, hora: 10 })
    familia.actuar(() => job)
    await guardado(familia)
    await esperar(() => lucia.paseos().some((j) => j.id === job.id), 'que la paseadora vea la solicitud')
    for (const accion of ['aceptar', 'salir', 'recoger'] as const) {
      lucia.actuar((j) => moverPaseo(j, accion, 'paseador', Date.now()))
      await guardado(lucia)
    }

    const ubLucia = (await s.ubicacion!(LUCIA))!
    const ubFamilia = (await s.ubicacion!(FAMILIA))!
    const ubOtra = (await s.ubicacion!(OTRA))!
    const ubMateo = (await s.ubicacion!(MATEO))!
    const ubEquipo = (await s.ubicacion!(EQUIPO))!

    expect(await ubFamilia.actual(job.id)).toBeNull()
    expect(await ubLucia.publicar(job.id, { pos: OLIVAR, precisionM: 12 })).toEqual({ publicado: true })
    expect(await ubLucia.publicar(job.id, { pos: OLIVAR, precisionM: 12 })).toEqual({ publicado: false, motivo: 'muy_seguido' })
    expect(await ubMateo.publicar(job.id, { pos: OLIVAR, precisionM: 12 })).toEqual({ publicado: false, motivo: 'no_es_tuyo' })
    expect(await ubFamilia.publicar(job.id, { pos: OLIVAR, precisionM: 12 })).toEqual({ publicado: false, motivo: 'no_es_tuyo' })

    const vista = await ubFamilia.actual(job.id)
    expect(vista?.pos).toEqual(OLIVAR)
    expect(vista?.precisionM).toBe(12)
    // La hora de la lectura es la del servidor (reciente), no la que diga el teléfono.
    expect(Math.abs(Date.now() - (vista?.en ?? 0))).toBeLessThan(60_000)
    expect(await ubOtra.actual(job.id)).toBeNull()
    expect(await ubMateo.actual(job.id)).toBeNull()
    expect((await ubEquipo.actual(job.id))?.pos).toEqual(OLIVAR)

    // Una foto con 80 m de error queda marcada; el paseador y la familia no ven la marca, el equipo sí.
    expect((await lucia.tomarFoto({ jobId: job.id, ubicacion: { pos: OLIVAR, lecturaT: Date.now(), precisionM: 80 } })).ok).toBe(true)
    await esperar(async () => (await ubEquipo.sospechas()).length > 0, 'que el equipo vea la foto marcada')
    const marcas = await ubEquipo.sospechas()
    expect(marcas).toHaveLength(1)
    expect(marcas[0].motivos).toContain('precision')
    expect(marcas[0].paseo_id).toBe(job.id)
    expect(await ubLucia.sospechas()).toEqual([])
    expect(await ubFamilia.sospechas()).toEqual([])
    const equipo = await telefono(s, EQUIPO)
    const fila = (await equipo.cliente.listarFotos([job.id], '2000-01-01')).find((f) => f.paseo_id === job.id) as { precision_m: number; hora_servidor: string }
    expect(fila.precision_m).toBe(80)
    expect(Math.abs(Date.now() - Date.parse(fila.hora_servidor))).toBeLessThan(60_000)

    // Al entregar al perro, la ubicación en vivo se borra y ya no se puede publicar.
    lucia.actuar((j) => moverPaseo(j, 'entregar', 'paseador', Date.now()))
    await guardado(lucia)
    expect(await ubFamilia.actual(job.id)).toBeNull()
    expect(await ubLucia.publicar(job.id, { pos: OLIVAR, precisionM: 12 })).toEqual({ publicado: false, motivo: 'no_en_paseo' })
  }, 90_000)
})
