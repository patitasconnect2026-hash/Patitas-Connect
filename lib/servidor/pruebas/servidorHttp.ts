/**
 * El MISMO servidor de prueba, pero por el camino completo de la app: el cliente de Supabase de verdad
 * (`@supabase/supabase-js`) habla HTTP con `supabase/tests/servidor_simulado.mjs` (PostgREST y GoTrue mínimos sobre
 * PGlite con las migraciones reales). Prueba `clientePaseos.ts` (lo único que no cubren los otros dos), el inicio de
 * sesión y las reglas SQL a la vez. Necesita PGlite (`npm i --no-save @electric-sql/pglite@0.2.17`); sin él devuelve null.
 */
import { envolverClienteUbicacion } from '../clienteUbicacion'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { envolverClientePaseos } from '../clientePaseos'
import { envolverClientePedidos } from '../clientePedidos'
import { envolverClientePostulaciones } from '../clientePostulaciones'
import type { ClientePaseos, RolServidor } from '../paseosTipos'
import { TARIFA_DE_PRUEBA, type PaseadorAprobado, type PersonaSembrada, type ServidorDePrueba } from './servidorFalso'

interface Simulado {
  url: string
  contrasena: string
  db: { query(sql: string, params?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }> }
  almacen: { cuantos(): number; existe(ruta: string): boolean; vencerEnlaces(): void }
  sembrarPersona(p: Record<string, unknown>): Promise<void>
  sembrarPaseadorAprobado(p: Record<string, unknown>): Promise<void>
  envejecer(id: string, minutos: number): Promise<void>
  cerrar(): Promise<void>
}

export async function crearServidorHttp(raizDelProyecto: string): Promise<ServidorDePrueba | null> {
  let sim: Simulado
  try {
    const nombre = '@electric-sql/pglite'
    await import(/* @vite-ignore */ nombre)
    const ruta = pathToFileURL(path.join(raizDelProyecto, 'supabase', 'tests', 'servidor_simulado.mjs')).href
    const m = (await import(/* @vite-ignore */ ruta)) as { iniciarServidorSimulado(o: Record<string, unknown>): Promise<Simulado> }
    sim = await m.iniciarServidorSimulado({ puerto: 0, sembrar: false, silencioso: true })
  } catch {
    return null
  }
  const { createClient } = await import('@supabase/supabase-js')
  const correos = new Map<string, string>()
  const correoDe = (id: string) => correos.get(id) ?? `${id}@prueba.local`

  const servidor: ServidorDePrueba = {
    cliente(uid) {
      let fallos: number | 'siempre' = 0
      const llamadas: Record<string, number> = {}
      const aMetodo = (url: string, metodo: string): string => {
        const p = new URL(url).pathname.replace('/rest/v1/', '')
        if (url.includes('/storage/v1/')) return `${metodo} almacén`
        if (!url.includes('/rest/v1/')) return 'auth'
        if (metodo === 'POST' && p === 'paseos') return 'crearPaseo'
        return `${metodo} ${p}`
      }
      const fetchDeLaPrueba: typeof fetch = async (entrada, init) => {
        const url = String(entrada instanceof Request ? entrada.url : entrada)
        const metodo = (init?.method ?? (entrada instanceof Request ? entrada.method : 'GET')).toUpperCase()
        const nombre = aMetodo(url, metodo)
        if (nombre !== 'auth') {
          llamadas[nombre] = (llamadas[nombre] ?? 0) + 1
          if (fallos === 'siempre' || fallos > 0) {
            if (typeof fallos === 'number') fallos -= 1
            throw new TypeError('Failed to fetch')
          }
        }
        return fetch(entrada, init)
      }
      const c = createClient(sim.url, 'clave-publica-inventada', {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: { fetch: fetchDeLaPrueba },
      })
      let entrada: Promise<void> | null = null
      const abrirSesion = () => {
        entrada ??= (async () => {
          if (!uid) return
          const r = await c.auth.signInWithPassword({ email: correoDe(uid), password: sim.contrasena })
          if (r.error) throw new Error(`No entró: ${r.error.message}`)
        })()
        return entrada
      }
      const base = envolverClientePaseos(c)
      const envuelto = {} as Record<string, unknown>
      for (const clave of Object.keys(base) as Array<keyof ClientePaseos>) {
        const f = base[clave] as (...a: unknown[]) => unknown
        envuelto[clave] = clave === 'alCambiarSesion' ? f.bind(base) : async (...a: unknown[]) => (await abrirSesion(), f.apply(base, a))
      }
      return Object.assign(envuelto as unknown as ClientePaseos, {
        fallarConRed(n: number | 'siempre') {
          fallos = n
        },
        conteo: () => ({ ...llamadas }),
      })
    },

    async postulaciones(uid) {
      // Su propio cliente de Supabase y su propia sesión: el mismo camino que usa la app (HTTP contra el servidor simulado).
      const c = createClient(sim.url, 'clave-publica-inventada', { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
      if (uid) {
        const r = await c.auth.signInWithPassword({ email: correoDe(uid), password: sim.contrasena })
        if (r.error) throw new Error(`No entró: ${r.error.message}`)
      }
      return envolverClientePostulaciones(c)
    },

    async pedidos(uid) {
      const c = createClient(sim.url, 'clave-publica-inventada', { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
      if (uid) {
        const r = await c.auth.signInWithPassword({ email: correoDe(uid), password: sim.contrasena })
        if (r.error) throw new Error(`No entró: ${r.error.message}`)
      }
      return envolverClientePedidos(c)
    },

    async ubicacion(uid) {
      const c = createClient(sim.url, 'clave-publica-inventada', { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
      if (uid) {
        const r = await c.auth.signInWithPassword({ email: correoDe(uid), password: sim.contrasena })
        if (r.error) throw new Error(`No entró: ${r.error.message}`)
      }
      return envolverClienteUbicacion(c)
    },

    async persona(p: PersonaSembrada) {
      correos.set(p.id, `${p.id}@prueba.local`)
      await sim.sembrarPersona({ id: p.id, email: correoDe(p.id), rol: p.rol as RolServidor, nombre: p.nombre, apellido: '', celular: '900000000' })
    },
    async paseadorAprobado(p: PaseadorAprobado) {
      correos.set(p.id, `${p.id}@prueba.local`)
      await sim.sembrarPaseadorAprobado({
        id: p.id,
        email: correoDe(p.id),
        nombre: p.nombre,
        apellido: p.apellido ?? '',
        celular: p.cobro?.celular ?? '987654321',
        dni: p.dni ?? '12345678',
        rate: TARIFA_DE_PRUEBA,
        perfil: p.perfil,
        comprobaciones: p.comprobaciones,
        paseosAcompanados: p.paseosAcompanados,
        cobro: p.cobro,
      })
    },
    async contar(tabla) {
      const r = await sim.db.query(`select count(*)::int as n from public.${tabla}`)
      return Number(r.rows[0]?.n ?? 0)
    },
    async estadoDe(id) {
      const r = await sim.db.query(`select estado::text as e from public.paseos where id = $1`, [id])
      return (r.rows[0]?.e as string | undefined) ?? null
    },
    async pagoDe(id) {
      const r = await sim.db.query(`select to_jsonb(p) as r from public.pagos p where p.paseo_id = $1`, [id])
      return (r.rows[0]?.r as Record<string, unknown> | undefined) ?? null
    },
    async volcar(tabla) {
      const r = await sim.db.query(`select to_jsonb(t) as r from public.${tabla} t`)
      return r.rows.map((x) => x.r as Record<string, unknown>)
    },
    async imagenes() {
      return sim.almacen.cuantos()
    },
    async hayImagen(ruta) {
      return sim.almacen.existe(ruta)
    },
    async leerEnlace(enlace) {
      // El enlace es de verdad una dirección del servidor simulado: se pide como lo haría el navegador (<img src>).
      const r = await fetch(enlace)
      return r.ok ? { bytes: new Uint8Array(await r.arrayBuffer()), tipo: r.headers.get('content-type') ?? '' } : null
    },
    async vencerEnlaces() {
      sim.almacen.vencerEnlaces()
    },
    async envejecer(id, minutos) {
      await sim.envejecer(id, minutos)
    },
    async cerrar() {
      await sim.cerrar()
    },
  }
  return servidor
}
