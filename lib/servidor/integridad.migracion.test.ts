/**
 * La migración de integridad (supabase/migrations/20261015130000_integridad.sql) se aplica sobre una base que YA tiene datos de
 * antes, como el Supabase real: no puede fallar por lo que ya está guardado, y desde que se aplica rechaza lo nuevo.
 * Corre en una base temporal (PGlite, sin red): solo si PGlite está instalado (`npm i --no-save @electric-sql/pglite@0.2.17`).
 */
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { crearBaseConMigraciones } from './pruebas/baseTemporal'

const RAIZ = path.resolve(__dirname, '..', '..')
const NOMBRE = '20261015130000_integridad'
const MIGRACIONES = fs
  .readdirSync(path.join(RAIZ, 'supabase', 'migrations'))
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => f.replace(/\.sql$/, ''))
const SQL = fs.readFileSync(path.join(RAIZ, 'supabase', 'migrations', `${NOMBRE}.sql`), 'utf8')

const A = 'aaaaaaaa-0000-4000-8000-000000000001'
const B = 'aaaaaaaa-0000-4000-8000-000000000002'
const P = 'bbbbbbbb-0000-4000-8000-000000000001'

/** Datos «de antes»: cosas que las reglas nuevas no habrían dejado entrar, escritas cuando todavía no existían. */
const DATOS_DE_ANTES = `
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('${A}', 'a@prueba.local', '{"rol":"familia","nombre_pila":"A"}', 'authenticated', 'authenticated'),
  ('${B}', 'b@prueba.local', '{"rol":"familia","nombre_pila":"B"}', 'authenticated', 'authenticated'),
  ('${P}', 'p@prueba.local', '{"rol":"paseador","nombre_pila":"P"}', 'authenticated', 'authenticated');
insert into public.perros (id, familia_id, nombre, tamano) values ('dddddddd-0000-4000-8000-000000000002', '${B}', 'Luna', 'small');
-- Un paseo de A que apunta al perro de B.
insert into public.paseos (id, familia_id, paseador_id, perro_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto)
  values ('v-1', '${A}', '${P}', 'dddddddd-0000-4000-8000-000000000002', '{"name":"Luna"}', 'A', 'P', 'Hoy', 60, 17.6, 22, 4.4, 17.6);
-- Dos inicios del mismo paseo (a mano), un fin con coordenadas que no existen y otro punto sin lugar ni motivo.
insert into public.puntos_control (id, paseo_id, tipo, en) values
  ('11111111-0000-4000-8000-000000000002', 'v-1', 'inicio', '2026-10-01 10:05+00'),
  ('11111111-0000-4000-8000-000000000001', 'v-1', 'inicio', '2026-10-01 10:00+00');
insert into public.puntos_control (paseo_id, tipo, en, lat, lng) values ('v-1', 'fin', '2026-10-01 11:00+00', 999, 999);
insert into public.fotos (tipo, paseo_id, paseador_id, en, ruta, bytes) values ('paseo', 'v-1', '${P}', now(), 'paseo/v-1/a.jpg', 99999999);
insert into public.mensajes (id, paseo_id, de, texto) values ('m-1', 'v-1', 'owner', repeat('x', 5000));
insert into public.casos (id, paseo_id, tipo, pago_estado) values ('raro', 'v-1', 'disputa', 'inventado');
insert into public.postulaciones (paseador_id, codigo, estado, paseos_acompanados, revision_notas) values ('${P}', 'PAT-X', 'enviada', 7, 'nota vieja');
`

const hayPglite = await crearBaseConMigraciones(RAIZ, 0).then(
  async (b) => {
    await b?.close()
    return b !== null
  },
  () => false,
)

describe.skipIf(!hayPglite)('la migración de integridad sobre una base con datos de antes', () => {
  async function aplicar() {
    const db = await crearBaseConMigraciones(RAIZ, MIGRACIONES.indexOf(NOMBRE))
    expect(db).not.toBeNull()
    await db!.exec(DATOS_DE_ANTES)
    return db!
  }
  const cuantos = async (db: Awaited<ReturnType<typeof aplicar>>, sql: string): Promise<number> => Number((await db.query<{ n: string | number }>(sql)).rows[0].n)

  it('se aplica sin fallar, deja los datos de antes y quita solo el inicio repetido', async () => {
    const db = await aplicar()
    try {
      await db.exec(SQL)
      expect(await cuantos(db, `select count(*) as n from public.puntos_control where paseo_id = 'v-1' and tipo = 'inicio'`)).toBe(1)
      expect((await db.query<{ id: string }>(`select id from public.puntos_control where paseo_id = 'v-1' and tipo = 'inicio'`)).rows[0].id, 'se queda el primero').toBe('11111111-0000-4000-8000-000000000001')
      // Lo demás sigue ahí: las reglas de tipo CHECK nacen «not valid» y no revisan lo viejo.
      expect(await cuantos(db, `select count(*) as n from public.puntos_control where lat = 999`)).toBe(1)
      expect(await cuantos(db, `select count(*) as n from public.fotos where bytes = 99999999`)).toBe(1)
      expect(await cuantos(db, `select count(*) as n from public.mensajes where char_length(texto) = 5000`)).toBe(1)
      expect(await cuantos(db, `select count(*) as n from public.casos where id = 'raro'`)).toBe(1)
      expect(await cuantos(db, `select count(*) as n from public.postulaciones where paseos_acompanados = 7`)).toBe(1)
      expect(await cuantos(db, `select count(*) as n from public.paseos where perro_id = 'dddddddd-0000-4000-8000-000000000002'`)).toBe(1)
    } finally {
      await db.close()
    }
  }, 60_000)

  it('desde que se aplica rechaza lo nuevo que no corresponde', async () => {
    const db = await aplicar()
    try {
      await db.exec(SQL)
      await expect(db.exec(`insert into public.puntos_control (paseo_id, tipo, en, lat, lng) values ('v-1', 'inicio', now(), -12.1, -77.0)`)).rejects.toMatchObject({ code: '23505' })
      await expect(db.exec(`insert into public.puntos_control (paseo_id, tipo, en, lat, lng) values ('v-1', 'fin', now(), -12.1, -77.0)`)).rejects.toMatchObject({ code: '23505' })
      await expect(db.exec(`insert into public.puntos_control (paseo_id, tipo, en, lat, lng) values ('v-1', 'fin', now(), 999, 999)`)).rejects.toMatchObject({ code: '23514' })
      await expect(db.exec(`insert into public.fotos (tipo, paseo_id, paseador_id, en, ruta, bytes) values ('paseo', 'v-1', '${P}', now(), 'paseo/v-1/b.jpg', 2000000)`)).rejects.toMatchObject({ code: '23514' })
      await expect(db.exec(`insert into public.mensajes (id, paseo_id, de, texto) values ('m-2', 'v-1', 'owner', repeat('x', 1001))`)).rejects.toMatchObject({ code: '23514' })
      await expect(db.exec(`insert into public.casos (id, paseo_id, tipo) values ('otro-raro', 'v-1', 'disputa')`)).rejects.toMatchObject({ code: '23514' })
      // Y lo que la app sí manda sigue entrando.
      await db.exec(`insert into public.mensajes (id, paseo_id, de, texto) values ('m-3', 'v-1', 'owner', repeat('x', 500))`)
      await db.exec(`insert into public.casos (id, paseo_id, tipo) values ('disputa-v-1', 'v-1', 'disputa')`)
    } finally {
      await db.close()
    }
  }, 60_000)

  it('aplicada dos veces falla a la segunda (por eso la consulta «¿cuáles faltan?» existe)', async () => {
    const db = await aplicar()
    try {
      await db.exec(SQL)
      await expect(db.exec(SQL)).rejects.toThrow()
    } finally {
      await db.close()
    }
  }, 60_000)
})
