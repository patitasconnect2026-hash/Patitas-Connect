/**
 * El cliente del servidor. La librería de Supabase se carga SOLO si el inicio de sesión está activo: en modo local no
 * se descarga, no se conecta y no escribe nada en la consola.
 */
import { envolverClienteIa, type ClienteIa } from './clienteIa'
import { envolverClienteUbicacion, type ClienteUbicacion } from './clienteUbicacion'
import type { SupabaseClient } from '@supabase/supabase-js'
import { configDeLaApp, type ConfigServidor } from './config'
import { envolverClientePaseos } from './clientePaseos'
import { envolverClientePedidos, type ClientePedidos } from './clientePedidos'
import { envolverClientePostulaciones, type ClientePostulaciones } from './clientePostulaciones'
import type { ClientePaseos } from './paseosTipos'
import type { ClienteAcceso } from './tipos'

/** Envuelve el cliente de Supabase en la interfaz mínima de la app (con las tablas que ya existen). */
export function envolverCliente(c: SupabaseClient): ClienteAcceso {
  return {
    auth: {
      async signUp(args) {
        const r = await c.auth.signUp(args)
        return { data: { user: r.data.user, session: r.data.session }, error: r.error }
      },
      async signInWithPassword(args) {
        const r = await c.auth.signInWithPassword(args)
        return { data: { user: r.data.user, session: r.data.session }, error: r.error }
      },
      async signOut(opciones) {
        const r = await c.auth.signOut(opciones?.scope ? { scope: opciones.scope } : undefined)
        return { error: r.error }
      },
      async resetPasswordForEmail(email, options) {
        const r = await c.auth.resetPasswordForEmail(email, options)
        return { error: r.error }
      },
      async updateUser(args) {
        const r = await c.auth.updateUser(args)
        return { error: r.error }
      },
      async getSession() {
        const r = await c.auth.getSession()
        return { data: { session: r.data.session }, error: r.error }
      },
      onAuthStateChange(cb) {
        const { data } = c.auth.onAuthStateChange((evento, sesion) => cb(evento, sesion))
        return data.subscription
      },
    },
    datos: {
      async leerPerfil(uid) {
        const r = await c.from('perfiles').select('rol, nombre_pila').eq('id', uid).maybeSingle()
        // El estado HTTP viaja con el error: así `resolverSesion` distingue «la sesión venció» (401) de «no hay conexión».
        const error = r.error ? { message: r.error.message, code: r.error.code, status: r.status } : null
        return { perfil: r.data ? { rol: String(r.data.rol), nombre_pila: String(r.data.nombre_pila ?? '') } : null, error }
      },
      async tieneDatosPersonales(uid) {
        const r = await c.from('datos_personales').select('id').eq('id', uid).maybeSingle()
        return { existe: !!r.data, error: r.error }
      },
      async guardarDatosPersonales(fila) {
        // Solo insertar: la base no deja «upsert» de datos personales ajenos y el DNI no se pide aquí.
        const r = await c.from('datos_personales').insert(fila)
        return { error: r.error }
      },
      async borrarMiCuenta() {
        const r = await c.rpc('borrar_mi_cuenta')
        // El estado HTTP viaja con el error: así se distingue «no hay conexión» de «no hay sesión».
        if (r.error) return { motivo: null, error: { message: r.error.message, code: r.error.code, status: r.status } }
        // La base dice «no» con un motivo (no es un error): hay algo pendiente. Si no confirma que la borró, no se da por borrada.
        const d = r.data as { borrada?: unknown; motivo?: unknown } | null
        if (!d || d.borrada !== true) return { motivo: typeof d?.motivo === 'string' ? d.motivo : 'desconocido', error: null }
        return { motivo: null, error: null }
      },
    },
  }
}

export interface ClientesDeLaApp {
  acceso: ClienteAcceso
  paseos: ClientePaseos
  postulaciones: ClientePostulaciones
  pedidos: ClientePedidos
  ubicacion: ClienteUbicacion
  ia: ClienteIa
}

/** Cuánto se espera una respuesta de la base antes de contarla como «sin conexión». */
export const TIEMPO_MAXIMO_MS = 20_000

/** `fetch` con tiempo máximo: una base que no responde no deja la pantalla esperando para siempre. */
export function fetchConTiempo(entrada: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const control = new AbortController()
  const cortar = () => control.abort()
  const reloj = setTimeout(cortar, TIEMPO_MAXIMO_MS)
  init?.signal?.addEventListener('abort', cortar)
  return fetch(entrada, { ...init, signal: control.signal }).finally(() => clearTimeout(reloj))
}

/** Crea los clientes con una configuración (la fábrica se puede cambiar en las pruebas). Comparten UNA sola sesión. */
export async function crearClientes(
  config: ConfigServidor,
  fabrica?: (url: string, clave: string, opciones?: { auth?: Record<string, unknown>; global?: Record<string, unknown> }) => SupabaseClient,
): Promise<ClientesDeLaApp | null> {
  if (!config.activo) return null
  const crear = fabrica ?? (await import('@supabase/supabase-js')).createClient
  const cliente = crear(config.url, config.clave, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    global: { fetch: fetchConTiempo },
  })
  return { acceso: envolverCliente(cliente), paseos: envolverClientePaseos(cliente), postulaciones: envolverClientePostulaciones(cliente), pedidos: envolverClientePedidos(cliente), ubicacion: envolverClienteUbicacion(cliente), ia: envolverClienteIa(cliente) }
}

/** Crea el cliente de acceso con una configuración (la fábrica se puede cambiar en las pruebas). */
export async function crearClienteAcceso(
  config: ConfigServidor,
  fabrica?: (url: string, clave: string, opciones?: { auth?: Record<string, unknown>; global?: Record<string, unknown> }) => SupabaseClient,
): Promise<ClienteAcceso | null> {
  return (await crearClientes(config, fabrica))?.acceso ?? null
}

let guardado: Promise<ClientesDeLaApp | null> | null = null

function clientesDeLaApp(): Promise<ClientesDeLaApp | null> {
  guardado ??= crearClientes(configDeLaApp())
  return guardado
}

/** El cliente de acceso de esta app (uno solo), o null si la app está en modo local. */
export async function clienteDeLaApp(): Promise<ClienteAcceso | null> {
  return (await clientesDeLaApp())?.acceso ?? null
}

/** El cliente de los paseos de esta app (comparte la sesión del de acceso), o null si la app está en modo local. */
export async function clientePaseosDeLaApp(): Promise<ClientePaseos | null> {
  return (await clientesDeLaApp())?.paseos ?? null
}

/** El cliente de las postulaciones de esta app (misma sesión), o null si la app está en modo local. */
export async function clientePostulacionesDeLaApp(): Promise<ClientePostulaciones | null> {
  return (await clientesDeLaApp())?.postulaciones ?? null
}

/** El cliente de «Pedir paseo» de esta app (misma sesión), o null si la app está en modo local. */
export async function clientePedidosDeLaApp(): Promise<ClientePedidos | null> {
  return (await clientesDeLaApp())?.pedidos ?? null
}

/** El cliente de la ubicación del paseo de esta app (misma sesión), o null si la app está en modo local. */
export async function clienteUbicacionDeLaApp(): Promise<ClienteUbicacion | null> {
  return (await clientesDeLaApp())?.ubicacion ?? null
}

/** El cliente de la IA de apoyo del equipo (misma sesión), o null si la app está en modo local. */
export async function clienteIaDeLaApp(): Promise<ClienteIa | null> {
  return (await clientesDeLaApp())?.ia ?? null
}
