/**
 * Un servidor de prueba para las postulaciones y los casos (paso 7b): el cliente de Supabase de verdad habla HTTP con
 * `supabase/tests/servidor_simulado.mjs` (PostgREST y GoTrue mínimos sobre PGlite con las migraciones REALES). Así se
 * prueba el código de la app y las reglas de acceso a la vez, con la sesión de cada persona. Necesita PGlite
 * (`npm i --no-save @electric-sql/pglite@0.2.17`); sin él devuelve null y las pruebas se saltan.
 */
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { SupabaseClient } from '@supabase/supabase-js'
import { envolverClientePaseos } from '../clientePaseos'
import { envolverClientePostulaciones, type ClientePostulaciones } from '../clientePostulaciones'
import type { ClientePaseos, RolServidor } from '../paseosTipos'
import { TARIFA_DE_PRUEBA } from './servidorFalso'

interface Simulado {
  url: string
  contrasena: string
  db: { query(sql: string, params?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }> }
  sembrarPersona(p: Record<string, unknown>): Promise<void>
  sembrarPaseadorAprobado(p: Record<string, unknown>): Promise<void>
  cerrar(): Promise<void>
}

export interface PersonaDeRevision {
  id: string
  rol: RolServidor
  nombre: string
  apellido?: string
  celular?: string
}

export interface TelefonoDeRevision {
  postulaciones: ClientePostulaciones
  paseos: ClientePaseos
  /** El cliente de Supabase de esa persona (para probar a mano lo que la base deja o no deja). */
  supabase: SupabaseClient
  /** Las siguientes `n` llamadas a la base fallan como si no hubiera internet (`'siempre'` hasta que se llame con 0). */
  fallarConRed(n: number | 'siempre'): void
}

export interface ServidorDeRevision {
  persona(p: PersonaDeRevision): Promise<void>
  paseadorAprobado(p: { id: string; nombre: string; apellido: string; dni: string; celular?: string }): Promise<void>
  /** Entra como esa persona (null = sin sesión) y devuelve sus clientes. */
  telefono(uid: string | null): Promise<TelefonoDeRevision>
  /** Una consulta directa a la base, sin mirar permisos (solo para comprobar). */
  sql(consulta: string, params?: unknown[]): Promise<Array<Record<string, unknown>>>
  cerrar(): Promise<void>
}

export async function crearServidorDeRevision(raizDelProyecto: string): Promise<ServidorDeRevision | null> {
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
  const correoDe = (id: string) => `${id}@prueba.local`

  return {
    async persona(p) {
      await sim.sembrarPersona({ id: p.id, email: correoDe(p.id), rol: p.rol, nombre: p.nombre, apellido: p.apellido ?? '', celular: p.celular ?? '900000000' })
    },
    async paseadorAprobado(p) {
      await sim.sembrarPaseadorAprobado({ id: p.id, email: correoDe(p.id), nombre: p.nombre, apellido: p.apellido, celular: p.celular ?? '987654321', dni: p.dni, rate: TARIFA_DE_PRUEBA })
    },
    async telefono(uid) {
      let fallos: number | 'siempre' = 0
      const fetchDeLaPrueba: typeof fetch = async (entrada, init) => {
        const url = String(entrada instanceof Request ? entrada.url : entrada)
        if (url.includes('/rest/v1/') && (fallos === 'siempre' || fallos > 0)) {
          if (typeof fallos === 'number') fallos -= 1
          throw new TypeError('Failed to fetch')
        }
        return fetch(entrada, init)
      }
      const c = createClient(sim.url, 'clave-publica-inventada', {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: { fetch: fetchDeLaPrueba },
      })
      if (uid) {
        const r = await c.auth.signInWithPassword({ email: correoDe(uid), password: sim.contrasena })
        if (r.error) throw new Error(`No entró: ${r.error.message}`)
      }
      return {
        postulaciones: envolverClientePostulaciones(c),
        paseos: envolverClientePaseos(c),
        supabase: c,
        fallarConRed(n) {
          fallos = n
        },
      }
    },
    async sql(consulta, params) {
      return (await sim.db.query(consulta, params)).rows
    },
    async cerrar() {
      await sim.cerrar()
    },
  }
}
