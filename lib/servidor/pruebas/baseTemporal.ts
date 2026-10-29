/**
 * Una base Postgres temporal (PGlite, en memoria, sin Docker y sin red) con las migraciones de `supabase/migrations/` aplicadas,
 * TODAS o solo las primeras `cantidad`. Sirve para probar una migración encima de datos de antes y la consulta «¿cuáles faltan?»
 * de docs/PUBLICAR.md. No toca ningún proyecto real.
 *
 * PGlite no es una dependencia del proyecto: `npm i --no-save @electric-sql/pglite@0.2.17`. Si falta, devuelve null y las
 * pruebas que la usan se saltan.
 */
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export interface BaseTemporal {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>
  exec(sql: string): Promise<unknown>
  close(): Promise<void>
}

export async function crearBaseConMigraciones(raizDelProyecto: string, cantidad?: number): Promise<BaseTemporal | null> {
  try {
    const nombre = '@electric-sql/pglite'
    await import(/* @vite-ignore */ nombre)
    const ruta = pathToFileURL(path.join(raizDelProyecto, 'supabase', 'tests', 'base_pglite.mjs')).href
    const modulo = (await import(/* @vite-ignore */ ruta)) as { crearBase(o?: { cantidad?: number }): Promise<BaseTemporal> }
    return await modulo.crearBase({ cantidad })
  } catch {
    return null
  }
}
