/**
 * A dónde va cada persona en la app principal cuando hay servidor (paso 4, corregido). Funciones PURAS: la app
 * principal (`/` y `/paseador`) las usa para leer la sesión y decidir, y las pruebas las usan con sesiones simuladas.
 *
 * Reglas:
 *  - Sin servidor configurado (modo local): todo como siempre.
 *  - Con sesión nunca se muestra la portada: o se entra a la app que corresponde al rol de la BASE, o se explica que
 *    no se pudo comprobar la cuenta.
 *  - Sin sesión se ve la entrada (portada con «Entrar o crear cuenta»).
 */
import type { EstadoSesion } from './sesion'
import type { PerfilServidor, UsuarioServidor } from './tipos'

/** La app donde se está: la de la familia (`/`) o la del paseador (`/paseador`). */
export type SeccionApp = 'familia' | 'paseador'

export type VistaApp =
  /** Sin servidor: la app de siempre. */
  | { vista: 'local' }
  /** Todavía no se sabe si hay sesión: pantalla de espera (NUNCA la portada). */
  | { vista: 'cargando' }
  /** Sin sesión: la portada con «Entrar o crear cuenta». */
  | { vista: 'entrada' }
  /** La cuenta es de otra app y no tiene nada que hacer aquí (paseador en `/`, equipo en `/admin`): se la lleva. */
  | { vista: 'ir'; destino: string }
  /**
   * Una cuenta de familia en la app del paseador (por ejemplo, tocó «Quiero ser paseador»). El rol no cambia: se le
   * dice claro y se ofrece volver, en vez de mandarla de vuelta sin explicar.
   */
  | { vista: 'cuenta_de_familia'; destino: string }
  /** Hay sesión pero no se pudo saber el rol (sin conexión, sin perfil…): no se muestra ni la portada ni la app. */
  | { vista: 'no_se_pudo' }
  /** Es la cuenta de esta app: sigue con su app o con los pasos que le faltan. */
  | { vista: 'continuar' }

/** La dirección de la app de cada rol. */
export function destinoDeRol(rol: string | null | undefined): string {
  if (rol === 'paseador') return '/paseador'
  if (rol === 'equipo') return '/admin'
  return '/'
}

export function vistaDeLaApp({ sesion, fallo = false, seccion }: { sesion: EstadoSesion; fallo?: boolean; seccion: SeccionApp }): VistaApp {
  if (sesion.estado === 'local') return { vista: 'local' }
  if (fallo) return { vista: 'no_se_pudo' }
  if (sesion.estado === 'cargando') return { vista: 'cargando' }
  if (sesion.estado === 'sin_sesion') return { vista: 'entrada' }
  if (sesion.perfilNoLeido || !sesion.perfil) return { vista: 'no_se_pudo' }
  const rol = sesion.perfil.rol
  if (rol === 'equipo') return { vista: 'ir', destino: '/admin' }
  if (rol === seccion) return { vista: 'continuar' }
  if (rol === 'paseador') return { vista: 'ir', destino: destinoDeRol(rol) }
  if (rol === 'familia') return { vista: 'cuenta_de_familia', destino: destinoDeRol(rol) }
  return { vista: 'no_se_pudo' }
}

/**
 * ¿La app de la familia muestra la portada (el alta)? En modo local es la regla de siempre: sin cuenta, portada.
 * Con servidor: sin sesión solo vale la demostración (una cuenta real guardada en este teléfono no basta: hay que
 * entrar); con sesión de familia hace falta la cuenta real de este teléfono y, si falta, se pasa DIRECTO a los pasos
 * que faltan. Nunca hay portada mientras se lee la sesión ni con una cuenta de otra app.
 */
export function debeMostrarOnboarding({ vista, hayCuenta, cuentaEsDeEjemplo }: { vista: VistaApp['vista']; hayCuenta: boolean; cuentaEsDeEjemplo: boolean }): boolean {
  if (vista === 'local') return !hayCuenta
  if (vista === 'entrada') return !(hayCuenta && cuentaEsDeEjemplo)
  if (vista === 'continuar') return !(hayCuenta && !cuentaEsDeEjemplo)
  return false
}

/** Lo que la persona ya escribió al registrarse: así los pasos que le faltan no se lo vuelven a pedir. */
export interface DatosDeCuenta {
  nombre: string
  apellido: string
  /** 9 dígitos con espacios («987 654 321»), o vacío si no hay celular. */
  celular: string
  correo: string
}

const texto = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

export function datosDeCuenta(usuario: UsuarioServidor, perfil: PerfilServidor | null): DatosDeCuenta {
  const meta = usuario.user_metadata ?? {}
  const digitos = texto(meta.celular).replace(/\D/g, '')
  const nueve = digitos.length >= 9 ? digitos.slice(-9) : ''
  return {
    nombre: texto(perfil?.nombre_pila) || texto(meta.nombre_pila),
    apellido: texto(meta.apellido),
    celular: [nueve.slice(0, 3), nueve.slice(3, 6), nueve.slice(6, 9)].filter(Boolean).join(' '),
    correo: texto(usuario.email),
  }
}

/**
 * ¿La dirección con la que se abrió la app viene de un enlace de un correo (confirmar la cuenta, recuperar la
 * contraseña)? Se mira ANTES de que Supabase lea y limpie la dirección. Sirve para decirle claro «Entra con tu correo
 * y contraseña» cuando el enlace llega sin sesión (vencido, o abierto en otro navegador).
 */
export function llegoPorEnlaceDeCorreo(search: string, hash: string): boolean {
  const claves = ['access_token', 'refresh_token', 'token_hash', 'code', 'error', 'error_code', 'error_description']
  const mirar = (s: string): boolean => {
    const p = new URLSearchParams(s.replace(/^[?#]/, ''))
    if (claves.some((k) => p.has(k))) return true
    const tipo = p.get('type')
    return tipo === 'signup' || tipo === 'recovery' || tipo === 'magiclink' || tipo === 'invite' || tipo === 'email_change'
  }
  return mirar(search) || mirar(hash)
}
