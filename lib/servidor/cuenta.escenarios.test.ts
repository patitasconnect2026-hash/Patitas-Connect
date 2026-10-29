/**
 * Borrar la cuenta por el camino completo de la app: el cliente de Supabase de verdad (`@supabase/supabase-js`) habla HTTP con
 * `supabase/tests/servidor_simulado.mjs` (PostgREST y GoTrue mínimos sobre PGlite con las migraciones REALES). Así se prueba
 * a la vez `cliente.ts` (la llamada), `cuenta.ts` (las frases) y `borrar_mi_cuenta()` (las reglas). Sin red ni claves.
 * Necesita PGlite (`npm i --no-save @electric-sql/pglite@0.2.17`); sin él, estas pruebas se saltan.
 */
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { envolverCliente } from './cliente'
import { borrarCuenta, TEXTO_BORRAR } from './cuenta'
import type { ClienteAcceso } from './tipos'

interface Simulado {
  url: string
  contrasena: string
  db: { query(sql: string, params?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }> }
  sembrarPersona(p: Record<string, unknown>): Promise<void>
  sembrarPaseadorAprobado(p: Record<string, unknown>): Promise<void>
  cerrar(): Promise<void>
}

const RAIZ = path.resolve(__dirname, '..', '..')
const A = 'aaaaaaaa-0000-4000-8000-000000000001'
const B = 'aaaaaaaa-0000-4000-8000-000000000002'
const P = 'bbbbbbbb-0000-4000-8000-0000000000a1'
const E = 'cccccccc-0000-4000-8000-000000000001'

async function iniciar(): Promise<Simulado | null> {
  try {
    const nombre = '@electric-sql/pglite'
    await import(/* @vite-ignore */ nombre)
    const ruta = pathToFileURL(path.join(RAIZ, 'supabase', 'tests', 'servidor_simulado.mjs')).href
    const m = (await import(/* @vite-ignore */ ruta)) as { iniciarServidorSimulado(o: Record<string, unknown>): Promise<Simulado> }
    return await m.iniciarServidorSimulado({ puerto: 0, sembrar: false, silencioso: true })
  } catch {
    return null
  }
}

const sim = await iniciar()

/** Un cliente de acceso (el mismo que usa la app) con la sesión de esa persona. */
async function clienteDe(s: Simulado, uid: string, correo: string): Promise<{ cliente: ClienteAcceso; getSession: () => Promise<boolean> }> {
  const { createClient } = await import('@supabase/supabase-js')
  const c = createClient(s.url, 'clave-publica-inventada', { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
  const r = await c.auth.signInWithPassword({ email: correo, password: s.contrasena })
  if (r.error) throw new Error(`No entró ${uid}: ${r.error.message}`)
  return { cliente: envolverCliente(c), getSession: async () => (await c.auth.getSession()).data.session !== null }
}

const paseo = (s: Simulado, id: string, familia: string, estado: string, pago?: string) =>
  s.db
    .query(
      `insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto, estado)
       values ($1, $2, $3, '{"name":"Max"}', 'Valeria', 'Lucía', 'Lun · 7:00 am', 60, 17.6, 22, 4.4, 17.6, $4)`,
      [id, familia, P, estado],
    )
    .then(() => (pago ? s.db.query(`update public.pagos set estado = $2 where paseo_id = $1`, [id, pago]) : null))

describe.skipIf(!sim)('borrar la cuenta por el camino completo (cliente real → HTTP → reglas SQL)', () => {
  const s = sim as Simulado

  beforeAll(async () => {
    await s.sembrarPersona({ id: A, email: 'a@prueba.local', rol: 'familia', nombre: 'Valeria', apellido: 'Rojas', celular: '987111000' })
    await s.sembrarPersona({ id: B, email: 'b@prueba.local', rol: 'familia', nombre: 'Rosa', apellido: 'Vega', celular: '987222000' })
    await s.sembrarPersona({ id: E, email: 'e@prueba.local', rol: 'equipo', nombre: 'Equipo', apellido: 'Patitas', celular: '900000000' })
    await s.sembrarPaseadorAprobado({ id: P, email: 'p@prueba.local', nombre: 'Lucía', apellido: 'Quispe', celular: '987654321', dni: '45678912', rate: 22 })
  })
  afterAll(async () => {
    await s.cerrar()
  })

  const cuantos = async (sql: string) => Number((await s.db.query(sql)).rows[0].n)

  it('un paseo en marcha, un reporte abierto o un pago pendiente: la base se niega y NO borra nada', async () => {
    const { cliente } = await clienteDe(s, A, 'a@prueba.local')

    await paseo(s, 'a-1', A, 'aceptado')
    expect(await borrarCuenta(cliente)).toEqual({ ok: false, mensaje: TEXTO_BORRAR.paseoPendiente })
    await s.db.query(`delete from public.paseos where id = 'a-1'`)

    await paseo(s, 'a-2', A, 'en_disputa')
    expect(await borrarCuenta(cliente)).toEqual({ ok: false, mensaje: TEXTO_BORRAR.reporteAbierto })
    await s.db.query(`delete from public.paseos where id = 'a-2'`)

    await paseo(s, 'a-3', A, 'cerrado', 'sin_pagar')
    expect(await borrarCuenta(cliente)).toEqual({ ok: false, mensaje: TEXTO_BORRAR.pagoPendiente })
    await s.db.query(`delete from public.paseos where id = 'a-3'`)

    expect(await cuantos(`select count(*) as n from auth.users`)).toBe(4)
    expect(await cuantos(`select count(*) as n from public.casas`)).toBe(0)
  })

  it('la cuenta del equipo no se borra desde la app', async () => {
    const { cliente, getSession } = await clienteDe(s, E, 'e@prueba.local')
    expect(await borrarCuenta(cliente)).toEqual({ ok: false, mensaje: TEXTO_BORRAR.esDelEquipo })
    expect(await getSession()).toBe(true)
    expect(await cuantos(`select count(*) as n from auth.users where id = '${E}'`)).toBe(1)
  })

  it('sin nada pendiente: se borra la cuenta, la sesión de este teléfono se cierra y el registro del paseo queda sin su nombre', async () => {
    await s.db.query(`insert into public.casas (familia_id, calle, unidad, distrito) values ($1, 'Calle Lizardo Alzamora', 'Dpto. 502', 'San Isidro')`, [A])
    await paseo(s, 'a-hecho', A, 'cerrado', 'pagado_paseador')
    const { cliente, getSession } = await clienteDe(s, A, 'a@prueba.local')
    // Otro teléfono con la misma sesión: su respuesta se «perderá» más abajo.
    const otroTelefono = await clienteDe(s, A, 'a@prueba.local')

    expect(await borrarCuenta(cliente)).toEqual({ ok: true })
    expect(await getSession()).toBe(false)
    expect(await cuantos(`select count(*) as n from auth.users where id = '${A}'`)).toBe(0)
    expect(await cuantos(`select count(*) as n from public.perfiles where id = '${A}'`)).toBe(0)
    expect(await cuantos(`select count(*) as n from public.datos_personales where id = '${A}'`)).toBe(0)
    expect(await cuantos(`select count(*) as n from public.casas where familia_id = '${A}'`)).toBe(0)
    const fila = (await s.db.query(`select familia_id, dueno_nombre, paseador_nombre from public.paseos where id = 'a-hecho'`)).rows[0]
    expect(fila).toEqual({ familia_id: null, dueno_nombre: 'Cuenta borrada', paseador_nombre: 'Lucía' })
    expect((await s.db.query(`select familia_id, estado::text as estado from public.pagos where paseo_id = 'a-hecho'`)).rows[0]).toEqual({ familia_id: null, estado: 'pagado_paseador' })

    // La sesión de «otro teléfono» sigue sirviendo un rato, pero la cuenta ya no existe: cuenta como hecho.
    expect(await borrarCuenta(otroTelefono.cliente)).toEqual({ ok: true })
    expect(await otroTelefono.getSession()).toBe(false)
  })

  it('pedirlo sin sesión no hace nada: pide entrar', async () => {
    const { cliente } = await clienteDe(s, B, 'b@prueba.local')
    await cliente.auth.signOut({ scope: 'local' })
    expect(await borrarCuenta(cliente)).toEqual({ ok: false, mensaje: TEXTO_BORRAR.entrar })
    expect(await cuantos(`select count(*) as n from auth.users where id = '${B}'`)).toBe(1)
  })

  it('el paseador con un pago por cobrar no puede irse; cuando el equipo le paga, sí', async () => {
    await s.sembrarPersona({ id: 'aaaaaaaa-0000-4000-8000-000000000003', email: 'c@prueba.local', rol: 'familia', nombre: 'Camila', apellido: 'Díaz', celular: '987333000' })
    await paseo(s, 'c-1', 'aaaaaaaa-0000-4000-8000-000000000003', 'cerrado', 'visto')
    const lucia = await clienteDe(s, P, 'p@prueba.local')
    expect(await borrarCuenta(lucia.cliente)).toEqual({ ok: false, mensaje: TEXTO_BORRAR.pagoPendiente })
    expect(await cuantos(`select count(*) as n from public.postulaciones where paseador_id = '${P}'`)).toBe(1)

    await s.db.query(`update public.pagos set estado = 'pagado_paseador' where paseo_id = 'c-1'`)
    expect(await borrarCuenta(lucia.cliente)).toEqual({ ok: true })
    expect(await lucia.getSession()).toBe(false)
    expect(await cuantos(`select count(*) as n from public.postulaciones where paseador_id = '${P}'`)).toBe(0)
    expect(await cuantos(`select count(*) as n from public.datos_dni where paseador_id = '${P}'`)).toBe(0)
    expect(await cuantos(`select count(*) as n from public.cobros_paseador where paseador_id = '${P}'`)).toBe(0)
    expect(await cuantos(`select count(*) as n from public.paseadores_publicos`)).toBe(0)
    expect((await s.db.query(`select paseador_id, paseador_nombre from public.paseos where id = 'c-1'`)).rows[0]).toEqual({ paseador_id: null, paseador_nombre: 'Cuenta borrada' })
  })
})
