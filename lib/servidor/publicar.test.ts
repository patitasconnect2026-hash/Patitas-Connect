/**
 * `docs/PUBLICAR.md` (la sección «Encender el servidor») tiene que seguir siendo cierta. Si alguien cambia el código y no
 * cambia el documento, esta prueba falla:
 *   1. el documento nombra TODAS las migraciones de `supabase/migrations/`, en orden (una migración nueva sin anotar falla);
 *   2. solo nombra variables `NEXT_PUBLIC_…` que la app de verdad lee, y con esas tres la app queda en modo servidor;
 *   3. la consulta «¿cuáles faltan?» corre en una base temporal (PGlite) y marca bien lo aplicado y lo que falta
 *      (solo si PGlite está instalado: `npm i --no-save @electric-sql/pglite@0.2.17`);
 *   4. el texto no deja ninguna clave y no usa las palabras que la app no dice.
 * No toca ninguna red, ninguna cuenta ni ningún archivo `.env`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { leerConfigServidor } from './config'
import { crearBaseConMigraciones } from './pruebas/baseTemporal'

const RAIZ = path.resolve(__dirname, '..', '..')
const DOC = fs.readFileSync(path.join(RAIZ, 'docs', 'PUBLICAR.md'), 'utf8')
const INICIO = DOC.indexOf('## Encender el servidor')
const FIN = DOC.indexOf('\n## ', INICIO + 3)
const SECCION = DOC.slice(INICIO, FIN)
const MIGRACIONES = fs
  .readdirSync(path.join(RAIZ, 'supabase', 'migrations'))
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => f.replace(/\.sql$/, ''))
const CONSULTA = [...SECCION.matchAll(/```sql\n([\s\S]*?)```/g)].map((m) => m[1]).find((b) => b.includes('from (values')) ?? ''

const hayPglite = await crearBaseConMigraciones(RAIZ, 0).then(
  async (b) => {
    await b?.close()
    return b !== null
  },
  () => false,
)

describe('docs/PUBLICAR.md · encender el servidor', () => {
  it('la sección existe y trae la consulta de comprobación', () => {
    expect(INICIO, 'falta la sección «Encender el servidor»').toBeGreaterThan(-1)
    expect(FIN).toBeGreaterThan(INICIO)
    expect(CONSULTA, 'falta el bloque sql con «from (values»').not.toBe('')
  })

  it('anota TODAS las migraciones, en orden, en la tabla y en la consulta', () => {
    const enTabla = [...SECCION.matchAll(/^\| (\d+) \| `([0-9a-z_]+)` \|/gm)].map((m) => ({ n: Number(m[1]), nombre: m[2] }))
    expect(enTabla.map((f) => f.nombre)).toEqual(MIGRACIONES)
    expect(enTabla.map((f) => f.n)).toEqual(MIGRACIONES.map((_, i) => i + 1))
    const enConsulta = [...CONSULTA.matchAll(/\((\d+), '([0-9a-z_]+)',/g)].map((m) => ({ n: Number(m[1]), nombre: m[2] }))
    expect(enConsulta).toEqual(enTabla)
    expect(SECCION, 'el texto dice cuántos archivos son').toContain(`Son ${MIGRACIONES.length} archivos`)
    expect(SECCION, 'el texto dice cuántas filas con «sí» salen').toContain(`salen ${MIGRACIONES.length} filas`)
  })

  it('nombra solo variables que la app lee, y con ellas la app queda en modo servidor', () => {
    const lasQueLee = new Set([...fs.readFileSync(path.join(__dirname, 'config.ts'), 'utf8').matchAll(/process\.env\.(NEXT_PUBLIC_[A-Z_]+)/g)].map((m) => m[1]))
    const lasQueDice = new Set([...SECCION.matchAll(/NEXT_PUBLIC_[A-Z_]*[A-Z]/g)].map((m) => m[0]))
    for (const v of lasQueDice) expect(lasQueLee.has(v), `${v} no la lee la app`).toBe(true)
    for (const v of ['NEXT_PUBLIC_DATOS', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']) expect(lasQueDice.has(v), `falta ${v}`).toBe(true)
    expect(SECCION).toContain('NEXT_PUBLIC_DATOS=servidor')
    const config = leerConfigServidor({ NEXT_PUBLIC_DATOS: 'servidor', NEXT_PUBLIC_SUPABASE_URL: 'https://proyecto.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'clave-publica-inventada' })
    expect(config.activo).toBe(true)
    // La clave de servicio no sirve ni por error: la app la rechaza y se queda en modo local.
    expect(leerConfigServidor({ NEXT_PUBLIC_DATOS: 'servidor', NEXT_PUBLIC_SUPABASE_URL: 'https://proyecto.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_secret_inventada' })).toEqual({ activo: false, motivo: 'clave_secreta' })
  })

  it('dice que la clave de servicio nunca va en un archivo ni en una variable de la app, y que el borrado sin --hacerlo solo muestra', () => {
    expect(SECCION).toMatch(/«service_role» o «secret» NUNCA va aquí/)
    expect(SECCION).toContain('SUPABASE_SERVICE_ROLE_KEY=<clave de servicio>')
    expect(SECCION).toContain('Sin `--hacerlo` el script solo muestra')
    // Ninguna clave de verdad en el texto: ni de las que empiezan con eyJ, ni las sb_secret_ / sb_publishable_ completas.
    expect(SECCION).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/)
    expect(SECCION).not.toMatch(/sb_(secret|publishable)_[A-Za-z0-9]{8,}/)
  })

  it('no usa las palabras que la app no dice', () => {
    expect(SECCION).not.toMatch(/\bseguros?\b/i)
    expect(SECCION).not.toMatch(/100\s?%/)
    expect(SECCION).not.toMatch(/\bgarantizad/i)
    expect(SECCION).not.toMatch(/S\/\s?3(?![0-9.,])/)
  })

  describe.skipIf(!hayPglite)('la consulta «¿cuáles faltan?» en una base temporal', () => {
    const fila = (nombre: string, aplicada: string) => ({ migracion: nombre, aplicada })
    for (const cantidad of [0, 3, 6, MIGRACIONES.length]) {
      it(`con ${cantidad} de ${MIGRACIONES.length} migraciones aplicadas marca ${cantidad} con «sí» y el resto con «FALTA»`, async () => {
        const db = await crearBaseConMigraciones(RAIZ, cantidad)
        expect(db).not.toBeNull()
        try {
          const r = await db!.query<{ orden: number; migracion: string; aplicada: string }>(CONSULTA)
          expect(r.rows.map((x) => x.orden)).toEqual(MIGRACIONES.map((_, i) => i + 1))
          expect(r.rows.map((x) => fila(x.migracion, x.aplicada))).toEqual(MIGRACIONES.map((m, i) => fila(m, i < cantidad ? 'sí' : 'FALTA')))
        } finally {
          await db!.close()
        }
      }, 60_000)
    }
  })
})
