import { CONFIG } from './config'
import type { ClaseZona, TipoAviso } from './zona'

/**
 * Textos de la zona (dentro, borde, fuera). Cortos: el título tiene hasta 5 palabras, el apoyo hasta 12 y el detalle
 * va detrás de «Ver más». El margen sale de `CONFIG.zonaBufferMetros`, no se escribe a mano.
 */
export interface TextoZona {
  titulo: string
  apoyo: string
  detalle?: string
}

export function textoZona(clase: ClaseZona): TextoZona {
  const limite = `San Isidro, Jesús María y hasta ${CONFIG.zonaBufferMetros} m alrededor de sus límites`
  if (clase === 'dentro') return { titulo: 'Dentro de la zona', apoyo: '' }
  if (clase === 'borde') {
    return { titulo: 'Borde de la zona', apoyo: 'Puede que haya pocos paseadores cerca.', detalle: `Por ahora atendemos ${limite}.` }
  }
  return { titulo: 'Aún no llegamos a tu zona.', apoyo: 'Atendemos San Isidro y Jesús María.', detalle: `Por ahora atendemos ${limite}.` }
}

/** Pedir que marque la casa (cuentas que no la tienen) y los botones de la hoja del mapa. */
export const TEXTO_CASA = {
  titulo: 'Marca tu casa',
  apoyo: 'La necesitamos para ver si llegamos a tu zona.',
  marcar: 'Marcar mi casa',
  cambiar: 'Cambiar mi casa',
  usar: 'Usar este punto',
  /** Dentro de la hoja del mapa. */
  indicacion: 'Toca el mapa donde vives. Acerca con dos dedos si hace falta.',
  privacidad: 'Se queda en tu teléfono. El paseador no la ve.',
} as const

/* ------------------------------------------------------------------ */
/* Avisos durante el paseo                                              */
/* ------------------------------------------------------------------ */

export interface TextoAviso {
  titulo: string
  apoyo: string
}

/** El texto de cada aviso. Los números salen de `lib/config.ts`. */
export function textoAviso(tipo: TipoAviso): TextoAviso {
  switch (tipo) {
    case 'salida':
      return { titulo: 'Posible salida de la zona', apoyo: `${CONFIG.lecturasFueraParaAlerta} señales seguidas fuera de la zona.` }
    case 'regreso':
      return { titulo: 'Volvió a la zona', apoyo: 'Las señales vuelven a estar dentro.' }
    case 'borde':
      return { titulo: 'Cerca del borde', apoyo: `A menos de ${CONFIG.avisoBordeMetros} m del límite de la zona.` }
    case 'salto':
      return { titulo: 'Salto de ubicación', apoyo: `Más rápido que una caminata (${CONFIG.velocidadMaximaKmh} km/h). Se descartó.` }
    case 'quieto':
      return { titulo: `Quieto hace ${CONFIG.minutosQuietoParaAviso} minutos`, apoyo: 'Puede ser una parada. Revisa que todo esté bien.' }
    case 'sin_ubicacion':
      return { titulo: 'Sin ubicación del paseador', apoyo: 'No habrá avisos de ubicación en este paseo.' }
  }
}

/** Por qué el paseador no comparte su ubicación. Va en el registro del paseo. */
export type MotivoSinUbicacion = 'negada' | 'omitida' | 'no_disponible'

export const MOTIVO_SIN_UBICACION: Record<MotivoSinUbicacion, string> = {
  negada: 'El paseador no dio el permiso del navegador.',
  omitida: 'El paseador no la compartió.',
  no_disponible: 'Este navegador o esta conexión no la permite.',
}

/** Lo que queda escrito en el registro cuando no hay ubicación. */
export function notaSinUbicacion(motivo: MotivoSinUbicacion): string {
  return `${textoAviso('sin_ubicacion').titulo}. ${MOTIVO_SIN_UBICACION[motivo]}`
}

/** Lo que queda escrito en el registro del paseo (la hora y quién los pone el registro). */
export function notaAviso(tipo: TipoAviso, demo: boolean): string {
  const t = textoAviso(tipo)
  return `${demo ? 'Demostración · ' : ''}${t.titulo}. ${t.apoyo}`
}

/** Textos fijos del bloque de avisos (dueño y paseador). */
export const TEXTO_AVISOS = {
  titulo: 'Avisos de ubicación',
  vacio: 'Sin avisos por ahora.',
  demostracion: 'Demostración',
  quien: 'La app',
  /** Detrás de «Ver más» para el dueño: lo que no se puede prometer. */
  servidorDueno:
    'Hoy los avisos de ubicación solo te llegan si el paseador y tú usan el mismo navegador. Entre dos celulares hace falta un servidor, y todavía no hay.',
  servidorPaseador: 'Hoy los avisos solo le llegan al dueño si los dos usan el mismo navegador. Entre dos celulares hace falta un servidor.',
  /** Con servidor (paso 6b): el aviso viaja con la sesión de cada persona; la ubicación NO viaja. */
  conServidorDueno:
    'Estos avisos los calcula el teléfono del paseador y te llegan por internet. Te llega solo el aviso, no su recorrido; los puntos de control van aparte. Si su teléfono no tiene internet, el aviso llega cuando lo recupere.',
  conServidorPaseador:
    'El dueño ve estos avisos en su teléfono. Le llega solo el aviso, no tu recorrido; tus puntos de control van aparte. Si no tienes internet, le llegan cuando lo recuperes.',
  /** Honestidad sobre lo que mide. */
  alcance: 'Son solo señales: el GPS de un celular puede fallar o alterarse. Los avisos no bloquean a nadie.',
  probar: 'Probar los avisos',
  probarApoyo: 'Señales inventadas por la app, solo para ver cómo avisa.',
  /** Dentro del panel de prueba: la misma honestidad que en «Cómo funciona». */
  servidorPanel: 'Entre dos celulares hace falta servidor.',
  resumen: 'Señales probadas',
} as const

/** La pantalla corta que explica para qué se pide la ubicación (antes del permiso del navegador) y el estado después. */
export const TEXTO_UBICACION = {
  eyebrow: 'Antes de empezar',
  titulo: 'Tu ubicación durante el paseo',
  linea1: 'La guardamos al empezar, al terminar y en cada foto.',
  linea2: 'Se queda en este teléfono. No se guarda en ningún servidor.',
  linea3: 'Hoy no llega a otro celular: falta servidor.',
  /**
   * Con servidor: esos puntos (inicio, fin y cada foto) se guardan, y además, mientras pasea con la app abierta, su última
   * ubicación se envía cada pocos segundos para que la familia la vea en el mapa (se borra al entregar). No se guarda el recorrido.
   * Los ven la familia del paseo y el equipo. Los avisos de zona viajan aparte y sin ubicación.
   */
  linea2Servidor: 'Se envía cada pocos segundos, con la app abierta.',
  linea3Servidor: 'La ven la familia del paseo y el equipo.',
  masServidor:
    'El seguimiento oficial es por puntos de control con foto: tu ubicación se guarda al empezar, al terminar y en cada foto. Además, mientras pasas con la app abierta, tu última ubicación se envía cada pocos segundos para que la familia te vea en el mapa; con la app cerrada o la pantalla apagada no se envía, y al entregar al perro se borra. No guardamos tu recorrido. La ven la familia del paseo y el equipo. Después el navegador te pedirá permiso. Si lo niegas, puedes seguir: el registro anota que no hubo ubicación. Los avisos de zona son solo una ayuda: funcionan con la pantalla encendida y con la pantalla apagada se pausan; al dueño le llega el aviso, no tu ubicación. Son solo señales.',
  permitir: 'Permitir ubicación',
  ahoraNo: 'Ahora no',
  masAbrir: 'Más detalles',
  mas: 'El seguimiento es por puntos de control con foto. Después el navegador te pedirá permiso. Si lo niegas, puedes seguir: el registro anota que no hubo ubicación. Los avisos de zona son solo una ayuda: funcionan con la pantalla encendida y con la pantalla apagada se pausan. El dueño ve los puntos de control y los avisos, no tu recorrido, y solo si usan el mismo navegador. Son solo señales.',
  /** Estados (tarjeta del paseo). */
  bloque: 'Tu ubicación',
  activa: 'Activa en este teléfono.',
  esperando: 'Esperando el permiso del navegador.',
  sinDecidir: 'Todavía no elegiste si compartes tu ubicación.',
  sinSenal: 'Buscando señal de ubicación.',
  negada: 'Sin ubicación: no diste el permiso.',
  negadaComo: 'Permítela en los ajustes del navegador y recarga la página.',
  omitida: 'Sin ubicación: elegiste seguir sin ella.',
  noDisponible: 'Sin ubicación: este navegador o esta conexión no la permite.',
  activar: 'Activar ubicación',
} as const

/**
 * Pantalla encendida: los avisos de zona son solo una ayuda y solo funcionan con la pantalla encendida. La app NO pide
 * mantenerla encendida: el seguimiento oficial es por puntos de control con foto y el paseador no vive pegado al teléfono.
 */
export const TEXTO_PANTALLA = {
  avisos: 'Los avisos de zona solo funcionan con la pantalla encendida.',
  masAbrir: 'Ver más',
  mas: 'La web no puede seguir tu ubicación con la pantalla apagada: los avisos se pausan hasta que la vuelvas a encender. Por eso el seguimiento es por puntos de control con foto y no tienes que mirar el teléfono todo el rato.',
  https: 'En un celular real hace falta HTTPS (en la computadora sirve localhost).',
} as const
