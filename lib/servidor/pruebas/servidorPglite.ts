/**
 * El MISMO servidor de prueba que `servidorFalso.ts`, pero sobre las migraciones SQL de verdad (supabase/migrations)
 * corriendo en PGlite (Postgres en memoria, sin Docker y sin red). Cada cliente entra con la sesión de su persona
 * (`set local role authenticated` + sus claims), igual que Supabase: las reglas de acceso y los disparadores son los reales.
 *
 * PGlite no es una dependencia del proyecto: `npm i --no-save @electric-sql/pglite@0.2.17`. Si falta, `crearServidorPglite`
 * devuelve null y las pruebas que lo usan se saltan.
 */
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { EstadoPaseo } from '../../paseo'
import { ErrorDeBase, type CambiosDePaseo, type ClientePaseos, type FilaCruda, type RolServidor } from '../paseosTipos'
import { perfilDePrueba, type PaseadorAprobado, type PersonaSembrada, type ServidorDePrueba } from './servidorFalso'

interface Consulta {
  query(sql: string, params?: unknown[]): Promise<{ rows: Array<Record<string, unknown>>; affectedRows?: number }>
  exec(sql: string): Promise<unknown>
}
/** El almacén de fotos de mentira (supabase/tests/almacen_simulado.mjs), sobre las reglas de fila de las migraciones. */
interface Almacen {
  subir(o: { uid: string | null; ruta: string; bytes: ArrayBuffer; tipo: string }): Promise<void>
  firmar(o: { uid: string | null; ruta: string; segundos: number }): Promise<string>
  leerConEnlace(senal: string): { bytes: Uint8Array; tipo: string } | null
  borrar(o: { uid: string | null; rutas: readonly string[] }): Promise<string[]>
  cuantos(): number
  existe(ruta: string): boolean
  vencerEnlaces(): void
}
interface Base extends Consulta {
  transaction<T>(f: (tx: Consulta) => Promise<T>): Promise<T>
  close(): Promise<void>
}

const HTTP_DE: Record<string, number> = { '42501': 403, '23505': 409, '23503': 409, '23514': 400, '22023': 400, '22P02': 400, P0002: 400, P0001: 400 }

function comoError(e: unknown, sinSesion = false): Error {
  const x = e as { code?: string; message?: string }
  const code = typeof x.code === 'string' ? x.code : undefined
  // Sin sesión («anon»), PostgREST contesta 401 en vez de 403.
  return new ErrorDeBase(String(x.message ?? e), sinSesion ? 401 : (code && HTTP_DE[code]) || 400, code)
}

const columnas = (fila: FilaCruda): string[] => {
  const cols = Object.keys(fila)
  for (const c of cols) if (!/^[a-z_]+$/.test(c)) throw new Error(`Columna no válida: ${c}`)
  return cols
}

/** Carga la base con todas las migraciones, o null si PGlite no está instalado. */
export async function crearServidorPglite(raizDelProyecto: string): Promise<ServidorDePrueba | null> {
  let base: { crearBase(): Promise<Base> }
  try {
    const nombre = '@electric-sql/pglite'
    await import(/* @vite-ignore */ nombre)
    const ruta = pathToFileURL(path.join(raizDelProyecto, 'supabase', 'tests', 'base_pglite.mjs')).href
    base = (await import(/* @vite-ignore */ ruta)) as typeof base
  } catch {
    return null
  }
  const db = await base.crearBase()
  let almacen: Almacen

  async function como<T>(uid: string | null, f: (tx: Consulta) => Promise<T>): Promise<T> {
    try {
      return await db.transaction(async (tx) => {
        await tx.query(`select set_config('request.jwt.claims', $1, true)`, [uid ? JSON.stringify({ sub: uid, role: 'authenticated' }) : ''])
        await tx.exec(`set local role ${uid ? 'authenticated' : 'anon'}`)
        return f(tx)
      })
    } catch (e) {
      throw comoError(e, uid === null)
    }
  }

  const delAlmacen = (e: unknown): ErrorDeBase => {
    const x = e as { message?: string; status?: number; statusCode?: string }
    return new ErrorDeBase(String(x.message ?? e), x.status ?? 400, x.statusCode)
  }
  async function insertar(tx: Consulta, tabla: string, fila: FilaCruda, alFinal = ''): Promise<void> {
    const cols = columnas(fila)
    await tx.query(`insert into public.${tabla} (${cols.join(', ')}) select ${cols.join(', ')} from jsonb_populate_record(null::public.${tabla}, $1::jsonb) ${alFinal}`, [JSON.stringify(fila)])
  }

  {
    const modulo = (await import(/* @vite-ignore */ pathToFileURL(path.join(raizDelProyecto, 'supabase', 'tests', 'almacen_simulado.mjs')).href)) as { crearAlmacenSimulado(o: { db: Base; ejecutar: typeof como }): Almacen }
    almacen = modulo.crearAlmacenSimulado({ db, ejecutar: como })
  }

  const sembrarPersona = async (p: PersonaSembrada, rolInicial: 'familia' | 'paseador') => {
    await db.query(`insert into auth.users (id, email, raw_user_meta_data, aud, role) values ($1, $2, $3::jsonb, 'authenticated', 'authenticated')`, [
      p.id,
      `${p.id}@prueba.local`,
      JSON.stringify({ rol: rolInicial, nombre_pila: p.nombre }),
    ])
    if (p.rol === 'equipo') await db.query(`update public.perfiles set rol = 'equipo' where id = $1`, [p.id])
  }

  const servidor: ServidorDePrueba = {
    cliente(uid) {
      let fallos: number | 'siempre' = 0
      const llamadas: Record<string, number> = {}
      const red = (nombre: string) => {
        llamadas[nombre] = (llamadas[nombre] ?? 0) + 1
        if (fallos === 'siempre' || fallos > 0) {
          if (typeof fallos === 'number') fallos -= 1
          throw new ErrorDeBase('Failed to fetch', 0)
        }
      }
      const jsonDe = (r: { rows: Array<Record<string, unknown>> }): FilaCruda[] => r.rows.map((x) => x.r as FilaCruda)
      const lista = async (nombre: string, sql: string, params: unknown[] = []): Promise<FilaCruda[]> => {
        red(nombre)
        return como(uid, async (tx) => jsonDe(await tx.query(sql, params)))
      }

      const cliente: ClientePaseos = {
        async sesion() {
          red('sesion')
          if (!uid) return null
          const r = await como(uid, (tx) => tx.query(`select rol::text as rol from public.perfiles where id = $1`, [uid]))
          const rol = r.rows[0]?.rol
          return rol === 'familia' || rol === 'paseador' || rol === 'equipo' ? { id: uid, rol: rol as RolServidor } : null
        },
        alCambiarSesion: () => () => undefined,

        listarPaseos: (limite) => lista('listarPaseos', `select to_jsonb(p) as r from public.paseos p order by p.creado_en desc, p.id limit $1`, [limite]),
        listarEventos: (ids) => (ids.length ? lista('listarEventos', `select to_jsonb(e) as r from public.paseo_eventos e where e.paseo_id = any($1::text[]) order by e.id`, [[...ids]]) : Promise.resolve([])),
        listarBitacora: (ids) => (ids.length ? lista('listarBitacora', `select to_jsonb(b) as r from public.bitacora b where b.paseo_id = any($1::text[]) order by b.en, b.id`, [[...ids]]) : Promise.resolve([])),
        listarMensajes: (ids, limite = 500) =>
          ids.length
            ? lista('listarMensajes', `select to_jsonb(m) as r from (select * from public.mensajes where paseo_id = any($1::text[]) order by en desc, id limit $2) m order by m.en, m.id`, [[...ids], limite])
            : Promise.resolve([]),
        listarCodigos: (ids) => (ids.length ? lista('listarCodigos', `select to_jsonb(c) as r from public.codigos_recojo c where c.paseo_id = any($1::text[])`, [[...ids]]) : Promise.resolve([])),
        listarCasas: (f) => (f.length ? lista('listarCasas', `select to_jsonb(c) as r from public.casas c where c.familia_id = any($1::uuid[])`, [[...f]]) : Promise.resolve([])),
        listarPerros: (ids) => (ids.length ? lista('listarPerros', `select to_jsonb(d) as r from public.perros d where d.id = any($1::uuid[])`, [[...ids]]) : Promise.resolve([])),
        paseadoresPublicos: (id) =>
          id
            ? lista('paseadoresPublicos', `select to_jsonb(v) as r from public.paseadores_publicos v where v.paseador_id = $1::uuid`, [id])
            : lista('paseadoresPublicos', `select to_jsonb(v) as r from public.paseadores_publicos v`),
        async miCobro(id) {
          const f = await lista('miCobro', `select to_jsonb(c) as r from public.cobros_paseador c where c.paseador_id = $1::uuid`, [id])
          return f[0] ?? null
        },

        async guardarCasa(f) {
          red('guardarCasa')
          const cols = columnas(f as unknown as FilaCruda).filter((c) => c !== 'familia_id')
          await como(uid, (tx) => insertar(tx, 'casas', f as unknown as FilaCruda, `on conflict (familia_id) do update set ${cols.map((c) => `${c} = excluded.${c}`).join(', ')}`))
        },
        async guardarPerro(f) {
          red('guardarPerro')
          const cols = columnas(f as unknown as FilaCruda).filter((c) => c !== 'id' && c !== 'familia_id')
          await como(uid, (tx) => insertar(tx, 'perros', f as unknown as FilaCruda, `on conflict (id) do update set ${cols.map((c) => `${c} = excluded.${c}`).join(', ')}`))
        },
        async crearPaseo(f) {
          red('crearPaseo')
          try {
            await como(uid, (tx) => insertar(tx, 'paseos', f as unknown as FilaCruda))
          } catch (e) {
            if (e instanceof ErrorDeBase && e.code === '23505') return
            throw e
          }
        },
        async crearCodigo(paseo, codigo) {
          red('crearCodigo')
          try {
            await como(uid, (tx) => insertar(tx, 'codigos_recojo', { paseo_id: paseo, codigo }))
          } catch (e) {
            if (e instanceof ErrorDeBase && e.code === '23505') return
            throw e
          }
        },
        async cambiarPaseo(id: string, cambios: CambiosDePaseo, esperado?: EstadoPaseo) {
          red('cambiarPaseo')
          const cols = columnas(cambios as unknown as FilaCruda)
          return como(uid, async (tx) => {
            const r = await tx.query(
              `update public.paseos p set (${cols.join(', ')}) = (select ${cols.join(', ')} from jsonb_populate_record(null::public.paseos, $2::jsonb))
               where p.id = $1 ${esperado ? `and p.estado = $3::public.estado_paseo` : ''} returning p.id`,
              esperado ? [id, JSON.stringify(cambios), esperado] : [id, JSON.stringify(cambios)],
            )
            return r.rows.length
          })
        },
        async crearEvento(f) {
          red('crearEvento')
          await como(uid, (tx) => insertar(tx, 'paseo_eventos', f as unknown as FilaCruda))
        },
        async crearBitacora(f) {
          red('crearBitacora')
          try {
            await como(uid, (tx) => insertar(tx, 'bitacora', f as unknown as FilaCruda))
          } catch (e) {
            if (e instanceof ErrorDeBase && e.code === '23505') return
            throw e
          }
        },
        async crearMensaje(f) {
          red('crearMensaje')
          try {
            await como(uid, (tx) => insertar(tx, 'mensajes', f as unknown as FilaCruda))
          } catch (e) {
            if (e instanceof ErrorDeBase && e.code === '23505') return
            throw e
          }
        },
        async verificarCodigo(paseo, codigo) {
          red('verificarCodigo')
          if (!uid) return false
          const r = await como(uid, (tx) => tx.query(`select public.verificar_codigo_recojo($1, $2) as ok`, [paseo, codigo]))
          return r.rows[0]?.ok === true
        },

        listarPagos: (limite) => lista('listarPagos', `select to_jsonb(p) as r from public.pagos p order by p.creado_en desc, p.paseo_id limit $1`, [limite]),
        async moverPago(paseo, accion, datos = {}) {
          red('moverPago')
          const r = await como(uid, (tx) => tx.query(`select to_jsonb(public.mover_pago($1, $2, $3, $4)) as r`, [paseo, accion, datos.nota ?? null, datos.hora ?? null]))
          return r.rows[0]?.r as FilaCruda
        },
        listarCobros: (ids) => (ids.length ? lista('listarCobros', `select to_jsonb(c) as r from public.cobros_paseador c where c.paseador_id = any($1::uuid[])`, [[...ids]]) : Promise.resolve([])),
        async guardarCobro(f) {
          red('guardarCobro')
          const cols = columnas(f as unknown as FilaCruda).filter((c) => c !== 'paseador_id')
          await como(uid, (tx) => insertar(tx, 'cobros_paseador', f as unknown as FilaCruda, `on conflict (paseador_id) do update set ${cols.map((c) => `${c} = excluded.${c}`).join(', ')}`))
        },

        listarFotos: (ids, dia) =>
          lista('listarFotos', `select to_jsonb(f) as r from public.fotos f where f.paseo_id = any($1::text[]) or (f.tipo = 'hoy' and f.dia = $2::date) order by f.en, f.id`, [[...ids], dia]),
        async subirFoto(ruta, bytes, tipo) {
          red('subirFoto')
          try {
            await almacen.subir({ uid, ruta, bytes, tipo })
          } catch (e) {
            const x = delAlmacen(e)
            // Un archivo que ya estaba es un reintento de una subida que sí llegó.
            if (x.code === '409' || /already exists/i.test(x.message)) return
            throw x
          }
        },
        async guardarFoto(f) {
          red('guardarFoto')
          try {
            await como(uid, (tx) => insertar(tx, 'fotos', f as unknown as FilaCruda))
          } catch (e) {
            if (e instanceof ErrorDeBase && e.code === '23505') {
              // La misma foto (un reintento) se da por buena; la regla de «una foto de hoy por día», no.
              const previa = await como(uid, (tx) => tx.query(`select 1 as x from public.fotos where id = $1::uuid`, [f.id]))
              if (previa.rows.length > 0) return
            }
            throw e
          }
        },
        async borrarFilaFoto(id) {
          red('borrarFilaFoto')
          await como(uid, (tx) => tx.query(`delete from public.fotos where id = $1::uuid`, [id]))
        },
        async quitarImagenes(rutas) {
          red('quitarImagenes')
          try {
            await almacen.borrar({ uid, rutas })
          } catch (e) {
            throw delAlmacen(e)
          }
        },
        listarPuntos: (ids) => (ids.length ? lista('listarPuntos', `select to_jsonb(x) as r from public.puntos_control x where x.paseo_id = any($1::text[]) order by x.en, x.id`, [[...ids]]) : Promise.resolve([])),
        async crearPunto(f) {
          red('crearPunto')
          try {
            await como(uid, (tx) => insertar(tx, 'puntos_control', f as unknown as FilaCruda))
          } catch (e) {
            if (e instanceof ErrorDeBase && e.code === '23505') {
              // El mismo punto (un reintento) se da por bueno.
              const previo = await como(uid, (tx) => tx.query(`select 1 as x from public.puntos_control where id = $1::uuid`, [f.id]))
              if (previo.rows.length > 0) return
            }
            throw e
          }
        },
        listarCasos: () => lista('listarCasos', `select to_jsonb(x) as r from public.casos x order by x.abierto_en, x.id`, []),
        async crearCaso(f) {
          red('crearCaso')
          try {
            await como(uid, (tx) => insertar(tx, 'casos', f as unknown as FilaCruda))
          } catch (e) {
            if (e instanceof ErrorDeBase && e.code === '23505') {
              // El mismo caso (un reintento) se da por bueno.
              const previo = await como(uid, (tx) => tx.query(`select 1 as x from public.casos where id = $1`, [f.id]))
              if (previo.rows.length > 0) return
            }
            throw e
          }
        },
        async cambiarCaso(id, cambios) {
          red('cambiarCaso')
          const cols = columnas(cambios as unknown as FilaCruda)
          return como(uid, async (tx) => {
            const r = await tx.query(`update public.casos c set (${cols.join(', ')}) = (select ${cols.join(', ')} from jsonb_populate_record(null::public.casos, $2::jsonb)) where c.id = $1 returning c.id`, [id, JSON.stringify(cambios)])
            return r.rows.length
          })
        },
        listarMisResenas: (id) => lista('listarMisResenas', `select to_jsonb(x) as r from public.resenas x where x.familia_id = $1::uuid order by x.creado_en desc, x.paseo_id`, [id]),
        resenasDePaseadores: (ids, limite = 200) =>
          ids.length
            ? lista('resenasDePaseadores', `select to_jsonb(x) as r from public.resenas x where x.paseador_id = any($1::uuid[]) order by x.creado_en desc, x.paseo_id limit $2`, [[...ids], limite])
            : Promise.resolve([]),
        async crearResena(f) {
          red('crearResena')
          try {
            await como(uid, (tx) => insertar(tx, 'resenas', f as unknown as FilaCruda))
          } catch (e) {
            if (e instanceof ErrorDeBase && e.code === '23505') {
              // La misma reseña (un reintento) se da por buena.
              const previo = await como(uid, (tx) => tx.query(`select 1 as x from public.resenas where paseo_id = $1`, [f.paseo_id]))
              if (previo.rows.length > 0) return
            }
            throw e
          }
        },
        async enlaceDeFoto(ruta, segundos) {
          red('enlaceDeFoto')
          try {
            return `memoria://fotos/${ruta}?token=${await almacen.firmar({ uid, ruta, segundos })}`
          } catch (e) {
            throw delAlmacen(e)
          }
        },
      }
      return Object.assign(cliente, {
        fallarConRed(n: number | 'siempre') {
          fallos = n
        },
        conteo: () => ({ ...llamadas }),
      })
    },

    async persona(p) {
      await sembrarPersona(p, p.rol === 'paseador' ? 'paseador' : 'familia')
    },
    async paseadorAprobado(p: PaseadorAprobado) {
      await sembrarPersona({ id: p.id, rol: 'paseador', nombre: p.nombre }, 'paseador')
      await db.query(`insert into public.postulaciones (paseador_id, codigo, estado, nombre, apellido, perfil, paseos_acompanados) values ($1, $2, 'activo', $3, $4, $5::jsonb, $6)`, [
        p.id,
        `PAT-${p.nombre.slice(0, 3).toUpperCase()}`,
        p.nombre,
        p.apellido ?? '',
        JSON.stringify(p.perfil ?? perfilDePrueba()),
        p.paseosAcompanados ?? 0,
      ])
      const marcas = new Set(p.comprobaciones ?? ['dni', 'distrito', 'celular', 'consultas', 'examen'])
      await db.query(`insert into public.comprobaciones (paseador_id, dni, distrito, celular, consultas, examen) values ($1, $2, $3, $4, $5, $6)`, [
        p.id,
        marcas.has('dni'),
        marcas.has('distrito'),
        marcas.has('celular'),
        marcas.has('consultas'),
        marcas.has('examen'),
      ])
      await db.query(`insert into public.datos_dni (paseador_id, dni) values ($1, $2)`, [p.id, p.dni ?? '12345678'])
      const c = p.cobro ?? { metodo: 'yape' as const, celular: '987654321', titular: `${p.nombre} ${p.apellido ?? ''}`.trim() }
      await db.query(`insert into public.cobros_paseador (paseador_id, metodo, celular, titular) values ($1, $2, $3, $4)`, [p.id, c.metodo, c.celular, c.titular])
    },
    async contar(tabla) {
      const r = await db.query(`select count(*)::int as n from public.${tabla}`)
      return Number(r.rows[0]?.n ?? 0)
    },
    async estadoDe(id) {
      const r = await db.query(`select estado::text as e from public.paseos where id = $1`, [id])
      return (r.rows[0]?.e as string | undefined) ?? null
    },
    async pagoDe(id) {
      const r = await db.query(`select to_jsonb(p) as r from public.pagos p where p.paseo_id = $1`, [id])
      return (r.rows[0]?.r as Record<string, unknown> | undefined) ?? null
    },
    async volcar(tabla) {
      const r = await db.query(`select to_jsonb(t) as r from public.${tabla} t`)
      return r.rows.map((x) => x.r as Record<string, unknown>)
    },
    async imagenes() {
      return almacen.cuantos()
    },
    async hayImagen(ruta) {
      return almacen.existe(ruta)
    },
    async leerEnlace(enlace) {
      const senal = new URL(enlace).searchParams.get('token') ?? ''
      return almacen.leerConEnlace(senal)
    },
    async vencerEnlaces() {
      almacen.vencerEnlaces()
    },
    async envejecer(id, minutos) {
      await db.query(`update public.paseos set creado_en = now() - ($2::int * interval '1 minute') where id = $1`, [id, minutos])
    },
    async cerrar() {
      await db.close()
    },
  }
  return servidor
}
