import type { SinUbicacion } from './fotos'

/**
 * Textos de las fotos del paseo. Cortos (título hasta 5 palabras, apoyo hasta 12; el detalle va en «Ver más»).
 * Honestidad: la hora y el lugar los pone el teléfono y se pueden alterar; son señales. No se escribe «prueba»,
 * «verificado» ni «garantizado», y entre dos celulares hace falta servidor.
 */
export const TEXTO_FOTOS = {
  titulo: 'Fotos del paseo',
  vacio: 'Aún no hay fotos.',
  tomar: 'Tomar foto',
  codigoTitulo: 'Código de las fotos',
  codigoPaseador: 'La app lo pone en cada foto.',
  codigoDueno: 'Cada foto debe llevar este número.',
  codigoNoCoincide: 'El código no coincide con el del paseo.',
  /** Siempre a la vista (no solo en «Ver más»): lo que el dueño y el paseador tienen que saber de estas fotos. */
  avisoDueno: 'La hora y el lugar los pone el teléfono. Hoy las fotos solo llegan si usan el mismo navegador.',
  avisoDuenoCorto: 'La hora y el lugar los pone el teléfono.',
  avisoPaseador: 'Hoy el dueño las ve solo si usan el mismo navegador.',
  paseoSigue: 'El paseo sigue igual.',
  sinUbicacion: 'Sin ubicación',
  /** «Ver más» del dueño: qué son estas fotos y qué no. */
  masAbrir: 'Qué son estas fotos',
  masDueno:
    'Son solo señales. La hora y el lugar los pone el teléfono del paseador y se pueden alterar. El código es un número que la app pone en cada foto: no confirma el lugar ni la hora. Si no coincide con el del paseo, repórtalo. Hoy las fotos solo te llegan si el paseador y tú usan el mismo navegador: entre dos celulares hace falta servidor.',
  masPaseador:
    'Las fotos se guardan en este teléfono, con la hora y, si diste el permiso, el último lugar. Son solo señales: el teléfono pone la hora y el lugar, y se pueden alterar. Hoy el dueño las ve solo si usan el mismo navegador: entre dos celulares hace falta servidor.',
  guardada: 'Foto guardada.',
  /** Con servidor las fotos viajan al almacén privado: ya no son «solo del mismo navegador». */
  servidor: {
    avisoDueno: 'La hora y el lugar los pone el teléfono. Las fotos llegan cuando el paseador tiene internet.',
    avisoPaseador: 'La familia las ve cuando se envían. Sin internet se envían solas al volver.',
    masDueno:
      'Son solo señales. La hora y el lugar los pone el teléfono del paseador y se pueden alterar. El código es un número que la app pone en cada foto: no confirma el lugar ni la hora. Si no coincide con el del paseo, repórtalo. Las fotos están en un almacén privado: solo las ven tú, el paseador y el equipo, con enlaces que vencen.',
    masPaseador:
      'Las fotos se guardan primero en este teléfono, con la hora y, si diste el permiso, el último lugar. Después se envían a un almacén privado: las ven la familia del paseo, tú y el equipo. Son solo señales: el teléfono pone la hora y el lugar, y se pueden alterar.',
  },
  /** La cámara de la app. */
  camaraAbriendo: 'Abriendo la cámara…',
  camaraIndicacion: 'Toca el botón de la cámara.',
  sacar: 'Sacar foto',
  cerrar: 'Cerrar',
  guardando: 'Guardando…',
} as const

/** «1 foto · máximo 12» (no «1 de 12»: suena a una cuota que el dueño tiene que completar). */
export function contadorFotos(n: number, tope: number): string {
  return `${n} ${n === 1 ? 'foto' : 'fotos'} · máximo ${tope}`
}

/** Por qué no se pudo abrir la cámara. */
export type ErrorCamara = 'negada' | 'sin_camara' | 'sin_https' | 'ocupada' | 'error'

export const TEXTO_ERROR_CAMARA: Record<ErrorCamara, { titulo: string; como?: string }> = {
  negada: { titulo: 'Sin cámara: no diste el permiso.', como: 'Permítela en los ajustes del navegador y recarga la página.' },
  sin_camara: { titulo: 'Este teléfono no tiene cámara disponible.' },
  sin_https: { titulo: 'La cámara pide una conexión segura (HTTPS).', como: 'En un celular real hace falta HTTPS; en la computadora sirve localhost.' },
  ocupada: { titulo: 'Otra app está usando la cámara.', como: 'Ciérrala y vuelve a intentar.' },
  error: { titulo: 'No pudimos abrir la cámara.', como: 'Cierra esta ventana y vuelve a intentar.' },
}

/** Por qué no se pudo guardar una foto. El paseo sigue igual en todos los casos. */
export type ErrorGuardado = 'tope' | 'lleno' | 'error'

export function textoErrorGuardado(e: ErrorGuardado, tope: number): string {
  if (e === 'tope') return `Ya sacaste las ${tope} fotos de este paseo.`
  if (e === 'lleno') return 'No hay espacio en el teléfono. Libera espacio y vuelve a intentar.'
  return 'No pudimos guardar la foto. Vuelve a intentar.'
}

/** Si la foto no lleva ubicación, por qué (queda anotado en la foto). */
export const MOTIVO_SIN_UBICACION_FOTO: Record<SinUbicacion, string> = {
  negada: 'El paseador no dio el permiso.',
  omitida: 'El paseador no la compartió.',
  no_disponible: 'Este navegador o esta conexión no la permite.',
  sin_lectura: 'Todavía no había una lectura de ubicación.',
}
