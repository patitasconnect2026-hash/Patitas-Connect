/**
 * Quién entra a /admin cuando la app trabaja con el servidor. Funciones PURAS (o con el cliente recibido): las pruebas
 * les pasan un cliente simulado.
 *
 * Regla: solo entra quien tiene sesión Y la base dice `perfiles.rol = 'equipo'`. El rol se lee de la base con la propia
 * sesión (las reglas de acceso solo le dejan leer su fila); lo que diga el navegador no cuenta. Ninguna cuenta se
 * vuelve «equipo» desde la app: lo pone una persona a mano en el editor de SQL (ver `supabase/LEEME.md`).
 */
import { mensajeDeError, TEXTO_ACCESO } from './acceso'
import type { EstadoSesion } from './sesion'
import type { ClienteAcceso, PerfilServidor } from './tipos'

export const ROL_EQUIPO = 'equipo'

/** Exactamente «equipo»: ni mayúsculas, ni espacios, ni «admin». */
export const tieneRolEquipo = (perfil: PerfilServidor | null | undefined): boolean => perfil?.rol === ROL_EQUIPO

export type VistaAdmin =
  /** Sin servidor configurado: /admin sigue como siempre (con su aviso «sin contraseña»). */
  | 'local'
  | 'cargando'
  /** Sin sesión: solo la pantalla corta de entrada. */
  | 'entrada'
  /** Con sesión pero sin rol «equipo»: «Esta cuenta no tiene acceso» y nada más. */
  | 'sin_acceso'
  /** Con sesión, pero la base no respondió: no se sabe el rol, así que no se muestra nada del panel. */
  | 'no_se_pudo'
  | 'panel'

export function vistaDelPanel(sesion: EstadoSesion, fallo = false): VistaAdmin {
  if (sesion.estado === 'local') return 'local'
  if (fallo) return 'no_se_pudo'
  if (sesion.estado === 'cargando') return 'cargando'
  if (sesion.estado === 'sin_sesion') return 'entrada'
  if (sesion.perfilNoLeido) return 'no_se_pudo'
  return tieneRolEquipo(sesion.perfil) ? 'panel' : 'sin_acceso'
}

/**
 * Entrar al panel con correo y contraseña. Solo inicia sesión: NO guarda datos personales ni pide ningún rol
 * (la cuenta del equipo ya existe). Si la cuenta no es del equipo, el panel mismo dirá «no tiene acceso».
 */
export async function entrarAlPanel(cliente: ClienteAcceso, correo: string, contrasena: string): Promise<{ ok: true } | { ok: false; mensaje: string }> {
  const email = correo.trim().toLowerCase()
  if (!email || contrasena.length === 0) return { ok: false, mensaje: TEXTO_ACCESO.credenciales }
  try {
    const r = await cliente.auth.signInWithPassword({ email, password: contrasena })
    if (r.error || !r.data.user) return { ok: false, mensaje: mensajeDeError(r.error, 'entrar') }
  } catch (e) {
    return { ok: false, mensaje: mensajeDeError({ message: e instanceof Error ? e.message : 'network' }, 'entrar') }
  }
  return { ok: true }
}
