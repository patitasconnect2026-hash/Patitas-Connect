/**
 * Registro, entrada y recuperación de contraseña de la familia y el paseador. Funciones con el cliente recibido
 * (no tocan la red por su cuenta): las pruebas les pasan un cliente simulado.
 *
 * Reglas del equipo:
 *  - Solo se registran «familia» o «paseador». El rol «equipo» NUNCA se pide: lo pone una persona a mano en la base.
 *  - Los mensajes de error no revelan si un correo existe.
 *  - Aquí no se pide ni se guarda el DNI.
 */
import { esCelularPeru, normalizarTelefono } from '../telefono'
import type { ClienteAcceso, ErrorServidor, UsuarioServidor } from './tipos'

export const ROLES_DE_REGISTRO = ['familia', 'paseador'] as const
export type RolDeRegistro = (typeof ROLES_DE_REGISTRO)[number]

export const esRolDeRegistro = (v: unknown): v is RolDeRegistro => v === 'familia' || v === 'paseador'

export const MIN_CONTRASENA = 8

export const TEXTO_ACCESO = {
  errorGeneral: 'No pudimos hacerlo. Inténtalo de nuevo.',
  credenciales: 'Correo o contraseña incorrectos.',
  sinConfirmar: 'Confirma tu correo para entrar. Revisa tu bandeja.',
  muchosIntentos: 'Hay muchos intentos. Espera unos minutos.',
  sinConexion: 'No pudimos conectar. Revisa tu internet.',
  registroNeutro: 'No pudimos crear la cuenta. Si ya tienes una, entra o recupera tu contraseña.',
  revisaCorreo: 'Revisa tu correo para confirmar la cuenta.',
  recuperarListo: 'Si el correo tiene cuenta, te enviamos un enlace.',
  datosPendientes: 'Entraste, pero no pudimos guardar tus datos. Se intentará de nuevo.',
  nombre: 'Escribe tu nombre.',
  apellido: 'Escribe tu apellido.',
  celular: 'Escribe un celular de Perú de 9 dígitos.',
  correo: 'Escribe un correo válido.',
  contrasena: `La contraseña necesita al menos ${MIN_CONTRASENA} caracteres.`,
  rol: 'Elige si eres familia o paseador.',
  noSePudo: 'No pudimos comprobar tu cuenta',
  noSePudoApoyo: 'Revisa tu internet e inténtalo de nuevo.',
  reintentar: 'Reintentar',
  salir: 'Salir',
  espera: 'Un momento…',
  esDeFamilia: 'Esta cuenta es de familia',
  esDeFamiliaApoyo: 'Para ser paseador, crea otra cuenta con otro correo.',
  volverALaApp: 'Volver a la app',
} as const

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export interface DatosRegistro {
  rol: RolDeRegistro
  correo: string
  contrasena: string
  nombre: string
  apellido: string
  celular: string
}

export type CampoRegistro = 'rol' | 'nombre' | 'apellido' | 'celular' | 'correo' | 'contrasena'

export function validarRegistro(d: Partial<Record<CampoRegistro, string>>): { ok: true; datos: DatosRegistro } | { ok: false; campo: CampoRegistro; mensaje: string } {
  if (!esRolDeRegistro(d.rol)) return { ok: false, campo: 'rol', mensaje: TEXTO_ACCESO.rol }
  const nombre = (d.nombre ?? '').trim()
  if (nombre.length < 2) return { ok: false, campo: 'nombre', mensaje: TEXTO_ACCESO.nombre }
  const apellido = (d.apellido ?? '').trim()
  if (apellido.length < 2) return { ok: false, campo: 'apellido', mensaje: TEXTO_ACCESO.apellido }
  const celularEntrada = (d.celular ?? '').trim()
  if (!esCelularPeru(celularEntrada)) return { ok: false, campo: 'celular', mensaje: TEXTO_ACCESO.celular }
  const correo = (d.correo ?? '').trim().toLowerCase()
  if (!CORREO.test(correo)) return { ok: false, campo: 'correo', mensaje: TEXTO_ACCESO.correo }
  const contrasena = d.contrasena ?? ''
  if (contrasena.length < MIN_CONTRASENA) return { ok: false, campo: 'contrasena', mensaje: TEXTO_ACCESO.contrasena }
  return {
    ok: true,
    datos: { rol: d.rol, correo, contrasena, nombre, apellido, celular: normalizarTelefono(celularEntrada) ?? celularEntrada },
  }
}

/** Traduce un error del servidor a una frase corta en español que NO revela si un correo existe. */
export function mensajeDeError(e: ErrorServidor | null | undefined, contexto: 'entrar' | 'registrar' | 'recuperar' | 'contrasena'): string {
  const texto = `${e?.code ?? ''} ${e?.message ?? ''}`.toLowerCase()
  if (e?.status === 429 || /rate|too many|over_.*_limit/.test(texto)) return TEXTO_ACCESO.muchosIntentos
  if (/fetch|network|failed to|timeout|offline/.test(texto) || e?.status === 0) return TEXTO_ACCESO.sinConexion
  if (contexto === 'entrar') return /not.confirmed|email_not_confirmed/.test(texto) ? TEXTO_ACCESO.sinConfirmar : TEXTO_ACCESO.credenciales
  if (contexto === 'registrar') {
    if (/weak|password/.test(texto) && /short|least|weak|characters/.test(texto)) return TEXTO_ACCESO.contrasena
    return TEXTO_ACCESO.registroNeutro
  }
  if (contexto === 'contrasena' && /weak|password|short|least/.test(texto)) return TEXTO_ACCESO.contrasena
  return TEXTO_ACCESO.errorGeneral
}

export type ResultadoAcceso =
  | { ok: true; paso: 'sesion'; rol: RolDeRegistro | null; datosPendientes: boolean }
  | { ok: true; paso: 'confirmar_correo' }
  | { ok: false; mensaje: string }

/**
 * Guarda el apellido y el celular (lo que la persona escribió al registrarse) en `datos_personales`, UNA sola vez y
 * solo con sesión: las reglas de la base solo dejan escribir la fila propia. NO se pide ni se guarda el DNI.
 * Devuelve true si quedó guardado o ya estaba.
 */
export async function completarDatosPersonales(cliente: ClienteAcceso, usuario: UsuarioServidor): Promise<boolean> {
  const antes = await cliente.datos.tieneDatosPersonales(usuario.id)
  if (antes.error) return false
  if (antes.existe) return true
  const meta = usuario.user_metadata ?? {}
  const apellido = typeof meta.apellido === 'string' ? meta.apellido : ''
  const celular = typeof meta.celular === 'string' ? meta.celular : ''
  const r = await cliente.datos.guardarDatosPersonales({ id: usuario.id, apellido, celular })
  return !r.error
}

export async function registrar(cliente: ClienteAcceso, d: DatosRegistro, opciones: { volverA?: string } = {}): Promise<ResultadoAcceso> {
  // Defensa: aunque alguien llame esto con otro rol, «equipo» (u otro valor) no sale.
  if (!esRolDeRegistro(d.rol)) return { ok: false, mensaje: TEXTO_ACCESO.rol }
  let r: Awaited<ReturnType<ClienteAcceso['auth']['signUp']>>
  try {
    r = await cliente.auth.signUp({
      email: d.correo,
      password: d.contrasena,
      options: {
        // Lo que espera el disparador de la base (`al_crear_usuario`): rol y nombre_pila. El apellido y el celular
        // viajan aquí y se pasan a `datos_personales` en cuanto hay sesión.
        data: { rol: d.rol, nombre_pila: d.nombre, apellido: d.apellido, celular: d.celular },
        ...(opciones.volverA ? { emailRedirectTo: opciones.volverA } : {}),
      },
    })
  } catch (e) {
    return { ok: false, mensaje: mensajeDeError({ message: e instanceof Error ? e.message : 'network' }, 'registrar') }
  }
  if (r.error) return { ok: false, mensaje: mensajeDeError(r.error, 'registrar') }
  if (!r.data.session || !r.data.user) return { ok: true, paso: 'confirmar_correo' }
  const guardado = await completarDatosPersonales(cliente, r.data.user)
  return { ok: true, paso: 'sesion', rol: d.rol, datosPendientes: !guardado }
}

export async function entrar(cliente: ClienteAcceso, correo: string, contrasena: string): Promise<ResultadoAcceso> {
  const email = correo.trim().toLowerCase()
  if (!CORREO.test(email) || contrasena.length === 0) return { ok: false, mensaje: TEXTO_ACCESO.credenciales }
  let r: Awaited<ReturnType<ClienteAcceso['auth']['signInWithPassword']>>
  try {
    r = await cliente.auth.signInWithPassword({ email, password: contrasena })
  } catch (e) {
    return { ok: false, mensaje: mensajeDeError({ message: e instanceof Error ? e.message : 'network' }, 'entrar') }
  }
  if (r.error || !r.data.user) return { ok: false, mensaje: mensajeDeError(r.error, 'entrar') }
  const guardado = await completarDatosPersonales(cliente, r.data.user)
  const { perfil } = await cliente.datos.leerPerfil(r.data.user.id)
  return { ok: true, paso: 'sesion', rol: esRolDeRegistro(perfil?.rol) ? perfil.rol : null, datosPendientes: !guardado }
}

/** Siempre dice lo mismo (haya o no cuenta); solo distingue «muchos intentos» y «sin conexión». */
export async function recuperar(cliente: ClienteAcceso, correo: string, volverA: string): Promise<{ ok: boolean; mensaje: string }> {
  const email = correo.trim().toLowerCase()
  if (!CORREO.test(email)) return { ok: false, mensaje: TEXTO_ACCESO.correo }
  try {
    const r = await cliente.auth.resetPasswordForEmail(email, { redirectTo: volverA })
    if (r.error) {
      const m = mensajeDeError(r.error, 'recuperar')
      if (m === TEXTO_ACCESO.muchosIntentos || m === TEXTO_ACCESO.sinConexion) return { ok: false, mensaje: m }
    }
  } catch (e) {
    return { ok: false, mensaje: mensajeDeError({ message: e instanceof Error ? e.message : 'network' }, 'recuperar') }
  }
  return { ok: true, mensaje: TEXTO_ACCESO.recuperarListo }
}

export async function cambiarContrasena(cliente: ClienteAcceso, contrasena: string): Promise<{ ok: boolean; mensaje: string }> {
  if (contrasena.length < MIN_CONTRASENA) return { ok: false, mensaje: TEXTO_ACCESO.contrasena }
  try {
    const r = await cliente.auth.updateUser({ password: contrasena })
    if (r.error) return { ok: false, mensaje: mensajeDeError(r.error, 'contrasena') }
  } catch (e) {
    return { ok: false, mensaje: mensajeDeError({ message: e instanceof Error ? e.message : 'network' }, 'contrasena') }
  }
  return { ok: true, mensaje: 'Listo. Ya puedes entrar con tu contraseña nueva.' }
}

export async function salir(cliente: ClienteAcceso): Promise<void> {
  await cliente.auth.signOut()
}

/** A dónde va cada rol después de entrar. */
export const destinoDe = (rol: RolDeRegistro | null): string => (rol === 'paseador' ? '/paseador' : '/')
