/**
 * Textos de «Quiénes somos» y «Si algo pasa», escritos una sola vez.
 * Nada se inventa: el equipo y sus roles salen de docs/CONTEXTO.md (vía `CONFIG.equipo`) y los contactos de
 * `CONFIG`. Lo que falta, la pantalla lo dice («Falta configurar»); ningún texto queda mudo.
 * Reglas: título hasta 5 palabras, apoyo hasta 12, el detalle detrás de «Ver más».
 */
import { CONFIG, contactoPrincipal, NOMBRE_CORTO, TEXTOS_PAGO, type Config } from './config'

/* ------------------------------------------------------------------ */
/* Quiénes somos                                                        */
/* ------------------------------------------------------------------ */

export const TEXTO_QUIENES = {
  etiqueta: 'Piloto',
  titulo: 'Quiénes somos',
  equipoTitulo: 'Quién hace qué',
  faltaNombre: 'Falta configurar',
  /** Cuando no hay ningún nombre escrito: una sola nota en vez de una por persona. */
  faltanNombres: 'Falta configurar los nombres.',
  pilotoTitulo: 'Cómo vamos',
  piloto: 'Probamos con pocas familias conocidas.',
  pilotoMas: `Es un piloto del equipo y todavía no hay una empresa constituida. ${NOMBRE_CORTO} cobra y paga a mano.`,
  contactoTitulo: 'Habla con nosotros',
  /** Mensaje ya escrito del WhatsApp de contacto. */
  mensajeContacto: (nombreApp: string) => `Hola, quiero saber más de ${nombreApp}.`,
} as const

/** «Somos 3 estudiantes.» El número sale de la lista del equipo, no se escribe a mano. */
export function apoyoQuienesSomos(c: Config = CONFIG): string {
  const n = c.equipo.length
  return n === 1 ? 'Soy 1 estudiante.' : `Somos ${n} estudiantes.`
}

/** Frase honesta sobre el pago, la misma de toda la app. */
export const FRASE_PAGO = TEXTOS_PAGO.honestidad

export interface FilaEquipo {
  rol: string
  /** null = el equipo todavía no escribió el nombre (con permiso): se dice «Falta configurar». */
  nombre: string | null
}

export function filasEquipo(c: Config = CONFIG): FilaEquipo[] {
  return c.equipo.map((p) => ({ rol: p.rol, nombre: p.nombre.trim() === '' ? null : p.nombre.trim() }))
}

/* ------------------------------------------------------------------ */
/* Si algo pasa                                                         */
/* ------------------------------------------------------------------ */

export interface Situacion {
  id: 'perdido' | 'herido' | 'pelea'
  /** Título corto (hasta 5 palabras). */
  titulo: string
  /** Pasos, en orden. Cada uno, una frase corta. */
  pasos: readonly string[]
}

export const TEXTO_ALGO_PASA = {
  titulo: 'Si algo pasa',
  apoyo: 'Elige qué pasó y sigue los pasos.',
  contactosTitulo: 'A quién llamar',
  noLlamaSola: 'La app no llama sola: tú tocas el botón.',
  /** Bajo el botón de SOS: qué hace y qué no. */
  botonSosAyuda: 'Abre los pasos y los teléfonos. La app no llama sola.',
  botonSos: 'Abrir SOS del paseo',
  sinPaseo: 'El botón SOS aparece en «Paseo» cuando hay un paseo.',
} as const

/**
 * Las tres situaciones. No hay lista de veterinarias (no hay convenio): solo se dice «la más cercana».
 * El paso «cuéntale a Patitas» solo sale si el equipo ya configuró un contacto que sirve: sin contacto no hay a quién
 * contarle, y un paso sin salida destruye la confianza.
 */
export function situaciones(c: Config = CONFIG): Situacion[] {
  const hayContacto = contactoPrincipal(c.contactosAyuda) !== undefined
  const conContacto = (...pasos: string[]) => (hayContacto ? pasos : pasos.slice(0, -1))
  return [
    {
      id: 'perdido',
      titulo: 'Perro perdido',
      pasos: conContacto('Pregúntale al paseador dónde lo vio por última vez.', 'Busca cerca de ese lugar y pide ayuda al serenazgo.', `Cuéntale a ${NOMBRE_CORTO} lo que pasó.`),
    },
    {
      id: 'herido',
      titulo: 'Perro herido',
      pasos: conContacto('Pídele al paseador que lo mantenga quieto y tranquilo.', 'Llévalo a la veterinaria más cercana.', `Cuando esté atendido, cuéntale a ${NOMBRE_CORTO}.`),
    },
    {
      id: 'pelea',
      titulo: 'Pelea entre perros',
      pasos: conContacto('Mantén la calma. No metas las manos entre ellos.', 'Pídele al paseador que los separe con calma.', `Revisa si alguno tiene heridas y avisa a ${NOMBRE_CORTO}.`),
    },
  ]
}
