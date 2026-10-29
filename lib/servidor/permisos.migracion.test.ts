/**
 * La migración de permisos (supabase/migrations/20261022100000_permisos_service_role.sql) sobre una base que se parece a Supabase:
 * si Supabase hubiera dado permisos por defecto a `anon` en las 4 tablas que no se los quitaban, la migración se los quita, y
 * `service_role` queda con permisos explícitos. Corre en una base temporal (PGlite, sin red): solo si PGlite está instalado
 * (`npm i --no-save @electric-sql/pglite@0.2.17`).
 */
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { crearBaseConMigraciones } from './pruebas/baseTemporal'

const RAIZ = path.resolve(__dirname, '..', '..')
const NOMBRE = '20261022100000_permisos_service_role'
const MIGRACIONES = fs
  .readdirSync(path.join(RAIZ, 'supabase', 'migrations'))
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => f.replace(/\.sql$/, ''))
const SQL = fs.readFileSync(path.join(RAIZ, 'supabase', 'migrations', `${NOMBRE}.sql`), 'utf8')

/** Las 4 tablas que no tenían quitado el permiso de `anon`. */
const SIN_REVOKE = ['respuestas_escritas', 'fotos_sospechas', 'ubicacion_en_vivo', 'usos_ia']
const TODAS = ['pedidos', 'ofertas', 'pedidos_vistos', ...SIN_REVOKE]
const PRIVILEGIOS = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']

const hayPglite = await crearBaseConMigraciones(RAIZ, 0).then(
  async (b) => {
    await b?.close()
    return b !== null
  },
  () => false,
)

describe.skipIf(!hayPglite)('la migración de permisos sobre una base con permisos por defecto de Supabase', () => {
  async function aplicar() {
    // Todas las migraciones anteriores a esta (las 14 de siempre).
    const db = await crearBaseConMigraciones(RAIZ, MIGRACIONES.indexOf(NOMBRE))
    expect(db).not.toBeNull()
    // Lo que haría Supabase al crear cada tabla: permisos para anon.
    await db!.exec(`grant all on ${SIN_REVOKE.map((t) => `public.${t}`).join(', ')} to anon;`)
    return db!
  }
  const tiene = async (db: Awaited<ReturnType<typeof aplicar>>, rol: string, tabla: string, privilegio: string) =>
    (await db.query<{ ok: boolean }>(`select has_table_privilege('${rol}', 'public.${tabla}', '${privilegio}') as ok`)).rows[0].ok

  it('es la migración 15, la última y con fecha posterior a la 14', () => {
    expect(MIGRACIONES.indexOf(NOMBRE)).toBe(14)
    expect(MIGRACIONES[MIGRACIONES.length - 1]).toBe(NOMBRE)
    expect(NOMBRE > '20261016400000_usos_ia').toBe(true)
  })

  it('antes de aplicarla, anon tiene permisos en esas 4 tablas y service_role no tiene ninguno', async () => {
    const db = await aplicar()
    try {
      for (const t of SIN_REVOKE) expect(await tiene(db, 'anon', t, 'SELECT'), `anon en ${t}`).toBe(true)
      for (const t of TODAS) expect(await tiene(db, 'service_role', t, 'SELECT'), `service_role en ${t}`).toBe(false)
    } finally {
      await db.close()
    }
  }, 60_000)

  it('al aplicarla, anon se queda sin ningún permiso y service_role con select, insert, update y delete (nada más)', async () => {
    const db = await aplicar()
    try {
      await db.exec(SQL)
      for (const t of TODAS) {
        for (const p of PRIVILEGIOS) {
          expect(await tiene(db, 'anon', t, p), `anon ${p} en ${t}`).toBe(false)
          expect(await tiene(db, 'service_role', t, p), `service_role ${p} en ${t}`).toBe(['SELECT', 'INSERT', 'UPDATE', 'DELETE'].includes(p))
        }
      }
    } finally {
      await db.close()
    }
  }, 60_000)

  it('no cambia los permisos de authenticated ni da permiso de ejecutar funciones a service_role ni a anon', async () => {
    const db = await aplicar()
    try {
      const fotos = async () =>
        (await db.query<{ t: string; p: string }>(
          `select n.t, p.p from unnest(array[${TODAS.map((t) => `'${t}'`).join(',')}]) n(t) cross join unnest(array[${PRIVILEGIOS.map((p) => `'${p}'`).join(',')}]) p(p) where has_table_privilege('authenticated', 'public.' || n.t, p.p) order by 1, 2`,
        )).rows
      const antes = await fotos()
      const funciones = async () =>
        (await db.query<{ proname: string }>(
          `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('public', 'privado') and p.prokind = 'f' and (has_function_privilege('service_role', p.oid, 'EXECUTE') or has_function_privilege('anon', p.oid, 'EXECUTE')) order by 1`,
        )).rows.map((r) => r.proname)
      const funcionesAntes = await funciones()
      await db.exec(SQL)
      expect(await fotos()).toEqual(antes)
      expect(await funciones()).toEqual(funcionesAntes)
    } finally {
      await db.close()
    }
  }, 60_000)

  it('aplicada dos veces no falla: dar y quitar permisos se puede repetir', async () => {
    const db = await aplicar()
    try {
      await db.exec(SQL)
      await db.exec(SQL)
      expect(await tiene(db, 'service_role', 'usos_ia', 'DELETE')).toBe(true)
    } finally {
      await db.close()
    }
  }, 60_000)
})
