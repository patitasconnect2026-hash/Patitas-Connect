/**
 * Borrar la cuenta (con servidor). Funciones con el cliente recibido (no tocan la red por su cuenta): las pruebas les pasan un
 * cliente simulado. La base (`public.borrar_mi_cuenta`) es la que decide: se NIEGA si hay un paseo en marcha, un reporte
 * abierto o un pago pendiente, y si no, borra la cuenta y lo personal (ver supabase/migrations/20261015110000_borrar_mi_cuenta.sql).
 */
import { NOMBRE_CORTO } from '../config'
import type { ClienteAcceso, ErrorServidor } from './tipos'

export const TEXTO_BORRAR = {
  titulo: '¿Borrar tu cuenta?',
  resumen: 'Se borran tu cuenta, tus datos y tus fotos. No se puede deshacer.',
  masFamilia: `Se borran tu casa, tus perros, tus mensajes, tus fotos y tus reseñas. Los paseos ya terminados y sus pagos quedan en el registro de ${NOMBRE_CORTO}, sin tu nombre.`,
  masPaseador: `Se borran tu postulación, tu DNI, dónde cobras, tus mensajes, tus fotos y las reseñas que te hicieron. Los paseos ya terminados y sus pagos quedan en el registro de ${NOMBRE_CORTO}, sin tu nombre.`,
  condiciones: 'Si tienes un paseo pendiente, un reporte abierto o un pago por completar, primero hay que cerrarlo.',
  boton: 'Sí, borrar mi cuenta',
  borrando: 'Borrando…',
  cancelar: 'Cancelar',
  paseoPendiente: 'Tienes un paseo pendiente. Termínalo o cancélalo antes de borrar tu cuenta.',
  reporteAbierto: 'Tienes un reporte abierto. Cuando el equipo lo cierre, podrás borrar tu cuenta.',
  pagoPendiente: 'Tienes un pago pendiente. Cuando se complete, podrás borrar tu cuenta.',
  esDelEquipo: 'La cuenta del equipo no se borra desde la app.',
  entrar: 'Entra a tu cuenta para borrarla.',
  sinConexion: 'No hay conexión. Inténtalo de nuevo.',
  noSePudo: 'No pudimos borrar tu cuenta. Inténtalo de nuevo.',
} as const

export type ResultadoBorrado = { ok: true } | { ok: false; mensaje: string }

/** La cuenta ya no existe (por ejemplo, la respuesta de un intento anterior se perdió): lo que se quería ya pasó. */
const yaNoExiste = (e: ErrorServidor) => e.code === 'P0002' || /no encontramos tu cuenta/i.test(e.message)

/** La frase de cada motivo por el que la base se negó (no borró nada). Un motivo que no se conoce da una frase simple. */
export function mensajeDeMotivo(motivo: string): string {
  switch (motivo) {
    case 'paseo_pendiente':
      return TEXTO_BORRAR.paseoPendiente
    case 'reporte_abierto':
      return TEXTO_BORRAR.reporteAbierto
    case 'pago_pendiente':
      return TEXTO_BORRAR.pagoPendiente
    case 'equipo':
      return TEXTO_BORRAR.esDelEquipo
    default:
      return TEXTO_BORRAR.noSePudo
  }
}

/** La frase de un error de verdad (sin sesión, sin conexión…). Nunca deja pasar texto de la base tal cual. */
export function mensajeDeBorrado(e: ErrorServidor): string {
  const texto = `${e.code ?? ''} ${e.message}`
  if (/entra a tu cuenta/i.test(texto) || e.status === 401) return TEXTO_BORRAR.entrar
  if (e.status === 0 || e.status === undefined || e.status === 408 || e.status === 429 || e.status >= 500 || /fetch|network|timeout|offline|failed to/i.test(texto)) return TEXTO_BORRAR.sinConexion
  return TEXTO_BORRAR.noSePudo
}

/**
 * Borra la cuenta de quien tiene la sesión. La base se NIEGA si hay un paseo en marcha, un reporte abierto o un pago
 * pendiente (y no borra nada). Si la cuenta se borró, la sesión de este teléfono se cierra sin avisar al servidor (que ya
 * no la conoce). Si la cuenta ya no existía, también cuenta como hecho: se puede pedir otra vez sin miedo.
 */
export async function borrarCuenta(cliente: ClienteAcceso): Promise<ResultadoBorrado> {
  let r: { motivo: string | null; error: ErrorServidor | null }
  try {
    r = await cliente.datos.borrarMiCuenta()
  } catch {
    return { ok: false, mensaje: TEXTO_BORRAR.sinConexion }
  }
  if (r.motivo !== null) return { ok: false, mensaje: mensajeDeMotivo(r.motivo) }
  if (r.error && !yaNoExiste(r.error)) return { ok: false, mensaje: mensajeDeBorrado(r.error) }
  await cliente.auth.signOut({ scope: 'local' }).catch(() => ({ error: null }))
  return { ok: true }
}
