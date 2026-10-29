import { TEXTO_FIJO_IA } from '../supabase/functions/_shared/resumen'

/** Los textos de la IA de apoyo en /admin (Bloque 7). Cortos y simples. La IA solo ayuda: decide una persona. */
export const TEXTO_IA = {
  boton: 'Resumen de apoyo con IA',
  botonCargando: 'Preparando el resumen…',
  fijo: TEXTO_FIJO_IA,
  quitado: 'Antes de enviar se quitan el nombre, el DNI, el teléfono y el correo.',
  apagado: 'El resumen con IA está apagado. El equipo lo enciende cuando esté listo.',
  avisoPendiente: 'Está apagado hasta que la abogada revise el aviso de privacidad para el paseador.',
  sinServidor: 'Solo funciona con servidor y con una cuenta del equipo.',
  sinRespuestas: 'Todavía no hay respuestas escritas para resumir.',
  sinClave: 'Falta poner la clave de la IA. Los pasos están en docs/PUBLICAR.md.',
  sinPermiso: 'Tu cuenta no tiene permiso del equipo para usar esto.',
  sinSesion: 'Entra de nuevo a tu cuenta del equipo.',
  sinConexion: 'No pudimos conectarnos. Revisa tu internet e inténtalo otra vez.',
  fallo: 'La IA no pudo responder ahora. Inténtalo más tarde.',
  tituloResumen: 'Lo que dijo la persona',
  tituloRevisar: 'Para revisar',
  tituloPreguntas: 'Preguntas para la videollamada',
} as const
