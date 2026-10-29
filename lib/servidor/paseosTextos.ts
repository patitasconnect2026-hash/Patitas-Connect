/**
 * Lo que la app dice cuando los paseos viven en el servidor y algo no sale: sin internet, la base dijo que no, el
 * código no entra. Frases cortas y en lenguaje simple; ninguna promete lo que no existe.
 */
import { TEXTO_PAGO } from '../pagosTextos'
import { ErrorDeBase, RechazoDelServidor } from './paseosTipos'

export const TEXTO_SERVIDOR = {
  conectando: 'Conectando con el servidor…',
  sinConexion: 'Sin conexión con el servidor',
  sinConexionApoyo: 'Lo que hiciste se envía solo cuando vuelva internet.',
  noCargo: 'No pudimos cargar tus paseos',
  buscandoPaseadores: 'Buscando paseadores…',
  noCargaronPaseadores: 'No pudimos cargar los paseadores',
  noCargoApoyo: 'Revisa tu internet. Seguimos intentando.',
  reintentar: 'Reintentar',
  entendido: 'Entendido',

  /** La base dijo que no: lo que se pidió ya no corresponde o no le toca a esta cuenta. */
  cambioYaNoVale: 'Ese cambio ya no se pudo hacer. El paseo cambió y ya lo actualizamos.',
  sinPermiso: 'Esta cuenta no puede hacer ese cambio.',
  faltaConfirmar: 'Falta que la familia confirme la entrega.',
  solicitudNoSePudo: 'No pudimos enviar la solicitud. Elige otro paseador o inténtalo otra vez.',
  /** La base no deja pedir otro paseo mientras se debe uno ya hecho (la misma frase que la app muestra antes de enviar). */
  pagoPendiente: TEXTO_PAGO.sinReservar,
  noSePudoGuardar: 'No se pudo guardar. Inténtalo otra vez.',

  /** Al enviar la solicitud. */
  enviando: 'Enviando…',
  envioSinConexion: 'No pudimos enviar tu solicitud. Revisa tu internet y vuelve a intentarlo.',
  envioNoListo: 'Estamos conectando con el servidor. Inténtalo en un momento.',
  sinReserva: 'Faltan datos de la reserva. Vuelve a elegir el horario.',

  /** Código de recojo. */
  codigoSinConexion: 'No pudimos comprobar el código. Revisa tu internet.',
  codigoVariasVeces: 'Si el código es correcto y no entra, quizá se bloqueó. Avisa al equipo.',

  /** Ficha y dirección: la base se las entrega al paseador al aceptar. */
  fichaCargando: 'La ficha del perro y la dirección están cargando.',
  fichaNoLlega: 'Si no aparecen, avisa al equipo.',
  direccionCargando: 'Cargando la dirección…',

  /** Reseñas (parte 3b): la base solo acepta la de un paseo cerrado, una por paseo. */
  resenaNoSePudo: 'No pudimos publicar tu reseña. Inténtalo otra vez.',
  resenaSinConexion: 'Tu reseña se publica sola cuando vuelva internet.',

  /** El chat entre teléfonos (paso 6b). */
  mensajeNoLlego: 'No pudimos enviar ese mensaje. Inténtalo otra vez.',
  chatSinFotos: 'Por ahora aquí solo se escribe. Las fotos del paseo llegan en «Paseo».',
  chatVacio: 'Todavía no hay mensajes. Escribe el primero.',
  /** Lo que todavía no viaja entre teléfonos (el perfil del paseador). */
  sinSolicitudes: 'Aquí aparecen las solicitudes de las familias.',
  perfilSoloTelefono: 'Los cambios se envían solos y las familias los ven en unos segundos.',
} as const

export type ContextoDeCambio = 'crear' | 'cambiar' | 'mensaje' | 'cobro' | 'caso' | 'resena'

/** Estados HTTP que se arreglan esperando: sin sesión vigente, demasiadas peticiones o la base caída. */
const SE_REINTENTA = (s: number) => s === 401 || s === 408 || s === 425 || s === 429 || s >= 500

/**
 * Si el error de la base es una respuesta que NO se arregla reintentando, lo convierte en un rechazo con un texto claro.
 * Si es un corte de internet o la base no respondió, devuelve null: el cambio se queda esperando y se reintenta solo.
 */
export function rechazoDe(e: unknown, contexto: ContextoDeCambio): RechazoDelServidor | null {
  if (e instanceof RechazoDelServidor) return e
  if (!(e instanceof ErrorDeBase)) return null
  const s = e.status
  if (s === undefined || s === 0 || SE_REINTENTA(s)) return null
  if (contexto === 'cobro') return new RechazoDelServidor(e.code === '42501' || s === 403 ? TEXTO_SERVIDOR.sinPermiso : TEXTO_SERVIDOR.noSePudoGuardar, e.code)
  if (e.code === '22023') return new RechazoDelServidor(TEXTO_SERVIDOR.cambioYaNoVale, e.code)
  if (/confirme la entrega/i.test(e.message)) return new RechazoDelServidor(TEXTO_SERVIDOR.faltaConfirmar, e.code)
  if (contexto === 'crear' && /pago pendiente/i.test(e.message)) return new RechazoDelServidor(TEXTO_SERVIDOR.pagoPendiente, e.code)
  if (contexto === 'crear') return new RechazoDelServidor(TEXTO_SERVIDOR.solicitudNoSePudo, e.code)
  if (contexto === 'mensaje') return new RechazoDelServidor(TEXTO_SERVIDOR.mensajeNoLlego, e.code)
  if (contexto === 'resena') return new RechazoDelServidor(TEXTO_SERVIDOR.resenaNoSePudo, e.code)
  if (contexto === 'caso') return new RechazoDelServidor(e.code === '42501' || s === 403 ? TEXTO_SERVIDOR.sinPermiso : TEXTO_REVISION_SERVIDOR.casoNoSePudo, e.code)
  if (e.code === '42501' || s === 403) return new RechazoDelServidor(TEXTO_SERVIDOR.sinPermiso, e.code)
  return new RechazoDelServidor(TEXTO_SERVIDOR.noSePudoGuardar, e.code)
}

/* ------------------------------------------------------------------ */
/* Postulaciones y casos con el servidor (paso 7b)                      */
/* ------------------------------------------------------------------ */

/** Lo que se dice cuando la postulación y los casos viven en el servidor. Nada se marca antes de que la base lo confirme. */
export const TEXTO_REVISION_SERVIDOR = {
  /** Paseador, sin internet: la postulación queda en su teléfono y sale sola. */
  paseadorSinConexion: 'Tu postulación todavía no llegó al equipo. Se envía sola cuando haya internet.',
  paseadorEnviando: 'Enviando tu postulación…',
  paseadorRechazo: 'No pudimos enviar tu postulación. Revisa tus datos o avísale al equipo.',
  paseadorEnviada: 'Tu postulación llegó al equipo.',
  /** Equipo. */
  equipoSinConexion: 'Sin conexión. Lo último que hiciste todavía NO está guardado. Inténtalo otra vez.',
  equipoNoSePudo: 'No se pudo guardar. Todavía NO está marcado. Inténtalo otra vez.',
  equipoSinPermiso: 'Esta cuenta no puede hacer eso. Solo el equipo.',
  equipoGuardando: 'Guardando…',
  equipoCargando: 'Cargando las postulaciones…',
  equipoLeerFallo: 'No pudimos leer las postulaciones. Revisa tu internet.',
  equipoNinguna: 'No hay postulaciones enviadas.',
  /** Un caso que no llegó (la familia o el paseador reportó sin internet): queda esperando. */
  casoSinConexion: 'Tu reporte todavía no llegó al equipo. Se envía solo cuando haya internet.',
  casoNoSePudo: 'No pudimos guardar el reporte. Inténtalo otra vez.',
  /** «Quién abrió tu DNI»: con servidor la anotación vive en el teléfono de la familia y no llega al paseador. No se muestra una lista vacía que parezca «nadie lo abrió». */
  dniAperturasApoyo: 'Las familias ven solo los últimos dígitos.',
  dniAperturasAviso: 'Por ahora no podemos avisarte cuándo lo abren. Esa función todavía no está lista.',
} as const

/* ------------------------------------------------------------------ */
/* Pagos con el servidor (paso 7)                                       */
/* ------------------------------------------------------------------ */

/** Lo que se dice cuando el pago vive en el servidor: se espera la respuesta de la base antes de marcar nada. */
export const TEXTO_PAGO_SERVIDOR = {
  enviando: 'Enviando…',
  /** Sin internet: el cambio espera y NO se marca nada hasta que la base lo confirme. */
  sinConexionVi: 'Sin conexión. Tu aviso de «Vi el pago» todavía no llegó. Se envía solo cuando vuelva internet.',
  sinConexionEquipo: 'Sin conexión. Todavía NO está marcado. Se reintenta solo.',
  soloEquipo: 'Eso solo lo puede hacer el equipo.',
  soloPaseador: 'Eso solo lo puede hacer el paseador de este paseo.',
  yaCambio: 'Ese pago ya cambió. Ya lo actualizamos.',
  paseoNoTermino: 'Todavía no se puede: el paseo no ha terminado.',
  notaObligatoria: 'La nota es obligatoria.',
  noExiste: 'No encontramos ese pago.',
  noSePudo: 'No se pudo guardar el pago. Inténtalo otra vez.',
  sinSesion: 'Tu sesión venció. Entra otra vez.',
} as const

/**
 * Si la base dijo que NO a un cambio de pago, un rechazo con un texto claro (no se reintenta). Si fue un corte de
 * internet, la base caída o una sesión vencida, null: el cambio se queda esperando y se reintenta solo.
 */
export function rechazoDePago(e: unknown): RechazoDelServidor | null {
  if (e instanceof RechazoDelServidor) return e
  if (!(e instanceof ErrorDeBase)) return null
  const s = e.status
  if (s === undefined || s === 0 || SE_REINTENTA(s)) return null
  const m = e.message
  if (e.code === 'P0002') return new RechazoDelServidor(TEXTO_PAGO_SERVIDOR.noExiste, e.code)
  if (e.code === '22023' && /nota es obligatoria/i.test(m)) return new RechazoDelServidor(TEXTO_PAGO_SERVIDOR.notaObligatoria, e.code)
  if (e.code === '22023' && /con el paseo/i.test(m)) return new RechazoDelServidor(TEXTO_PAGO_SERVIDOR.paseoNoTermino, e.code)
  if (e.code === '22023') return new RechazoDelServidor(TEXTO_PAGO_SERVIDOR.yaCambio, e.code)
  if (e.code === '42501' && /solo el equipo/i.test(m)) return new RechazoDelServidor(TEXTO_PAGO_SERVIDOR.soloEquipo, e.code)
  if (e.code === '42501' && /paseador de este paseo/i.test(m)) return new RechazoDelServidor(TEXTO_PAGO_SERVIDOR.soloPaseador, e.code)
  if (e.code === '42501' || s === 403) return new RechazoDelServidor(TEXTO_SERVIDOR.sinPermiso, e.code)
  return new RechazoDelServidor(TEXTO_PAGO_SERVIDOR.noSePudo, e.code)
}

/* ------------------------------------------------------------------ */
/* Fotos con el servidor (paso 8)                                       */
/* ------------------------------------------------------------------ */

/** Lo que se dice de las fotos cuando viajan al servidor (la hora y el lugar los pone el teléfono: son señales). */
export const TEXTO_FOTO_SERVIDOR = {
  /** Con servidor la foto queda primero en el teléfono y se envía sola. */
  sinEnviar: 'Sin enviar',
  sinEnviarApoyo: 'La foto está en tu teléfono. Se envía sola cuando haya internet.',
  grande: 'Esta foto pesa demasiado para enviarla. Saca otra.',
  tipo: 'Este archivo no es una foto que podamos enviar.',
  permiso: 'Esta cuenta no puede enviar esa foto.',
  sinArchivo: 'La foto ya no está en este teléfono y no se pudo enviar.',
  otro: 'No pudimos enviar esta foto.',
  noCargo: 'No se pudo cargar la foto',
} as const

/**
 * Si la base o el almacén dijeron que NO a una foto, el texto claro (no se reintenta: la misma foto volvería a fallar).
 * Si fue un corte de internet, una sesión vencida o el servidor caído, null: la foto se queda en el teléfono y se reenvía sola.
 */
export function rechazoDeFoto(e: unknown): string | null {
  if (!(e instanceof ErrorDeBase)) return null
  const s = e.status
  if (s === undefined || s === 0 || SE_REINTENTA(s)) return null
  if (s === 413) return TEXTO_FOTO_SERVIDOR.grande
  if (s === 415) return TEXTO_FOTO_SERVIDOR.tipo
  if (s === 403 || e.code === '42501' || e.code === '403') return TEXTO_FOTO_SERVIDOR.permiso
  return TEXTO_FOTO_SERVIDOR.otro
}
