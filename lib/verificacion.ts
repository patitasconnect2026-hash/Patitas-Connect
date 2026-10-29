/**
 * Las seis comprobaciones de un paseador. Lista APROBADA POR EL EQUIPO de forma PROVISIONAL (10 de octubre de 2026).
 * Es la única fuente: los textos de pantalla y, en la Tarea 12, las casillas de /admin salen de aquí.
 *
 * Reglas:
 *  - La app muestra solo las casillas marcadas. Nunca dice «verificado» a secas.
 *  - No se escribe ninguna afirmación de revisión que no esté en esta lista.
 */

export type ComprobacionId = 'dni' | 'distrito' | 'celular' | 'consultas' | 'examen' | 'primerPaseo'

export interface Comprobacion {
  id: ComprobacionId
  /** Redacción completa y oficial (la que verá quien marca las casillas en /admin). */
  completo: string
  /** Título corto para pantalla (hasta 5 palabras). */
  titulo: string
  /** Línea de apoyo (hasta 12 palabras). */
  apoyo: string
  /** Detalle, detrás de «Ver más». */
  detalle: string
}

export const COMPROBACIONES: readonly Comprobacion[] = [
  {
    id: 'dni',
    completo: 'DNI a la vista en videollamada o en persona (el rostro coincide y es mayor de 18)',
    titulo: 'DNI a la vista',
    apoyo: 'Lo vemos en videollamada o en persona.',
    detalle: 'El rostro coincide y es mayor de 18.',
  },
  {
    id: 'distrito',
    completo: 'Vive o estudia en el distrito (constancia o recibo visto)',
    titulo: 'Vecino del distrito',
    apoyo: 'Vive o estudia en San Isidro o Jesús María.',
    detalle: 'Vemos su constancia o un recibo.',
  },
  {
    id: 'celular',
    completo: 'Celular confirmado por WhatsApp',
    titulo: 'Celular confirmado',
    apoyo: 'Lo confirmamos por WhatsApp.',
    detalle: 'Es el número con el que se le contacta.',
  },
  {
    id: 'consultas',
    completo: 'Consultas oficiales hechas en vivo en la videollamada',
    titulo: 'Consultas oficiales',
    apoyo: 'Se hacen en vivo, en la videollamada.',
    detalle: 'Con su permiso y con su DNI.',
  },
  {
    id: 'examen',
    completo: 'Examen aprobado y respuestas críticas revisadas',
    titulo: 'Examen aprobado',
    apoyo: 'Una persona revisa las respuestas críticas.',
    detalle: 'Son casos reales: correa, calor, un perro que se escapa.',
  },
  {
    id: 'primerPaseo',
    completo: 'Primer paseo acompañado hecho',
    titulo: 'Primer paseo acompañado',
    apoyo: 'El equipo acompaña su primer paseo.',
    detalle: 'Se marca cuando ya se hizo.',
  },
] as const

/**
 * Lo que la app puede decir de un paseador: solo las comprobaciones marcadas, con su título corto.
 * Nunca devuelve «verificado». Si no hay ninguna marcada, la lista queda vacía (la pantalla no afirma nada).
 */
export function comprobacionesMarcadas(marcadas: readonly ComprobacionId[]): Comprobacion[] {
  return COMPROBACIONES.filter((c) => marcadas.includes(c.id))
}

/* ------------------------------------------------------------------ */
/* Dos reglas DISTINTAS, escritas una sola vez                          */
/* ------------------------------------------------------------------ */

/**
 * REGLA 1 · La comprobación 6 es «primer paseo acompañado hecho».
 * Se marca sola cuando el paseador tiene al menos 1 paseo acompañado registrado.
 */
export const PASEOS_ACOMPANADOS_PARA_COMPROBACION_6 = 1

/**
 * REGLA 2 · Etiqueta «Nuevo»: hasta los 10 paseos, con máximo 2 perros por paseo.
 * No tiene que ver con la comprobación 6: un paseador puede tener las seis y seguir siendo «Nuevo».
 */
export const REGLA_NUEVO = { etiqueta: 'Nuevo', paseos: 10, maxPerros: 2 } as const

export type Marcas = Partial<Record<ComprobacionId, boolean>>

export function primerPaseoHecho(paseosAcompanados: number): boolean {
  return paseosAcompanados >= PASEOS_ACOMPANADOS_PARA_COMPROBACION_6
}

/** Regla 2: ¿lleva todavía la etiqueta «Nuevo»? */
export function llevaEtiquetaNuevo(paseos: number): boolean {
  return paseos < REGLA_NUEVO.paseos
}

/** Las casillas marcadas de verdad: las cinco que marca el equipo y la 6, que se deduce de los paseos acompañados. */
export function casillasMarcadas(marcas: Marcas, paseosAcompanados: number): ComprobacionId[] {
  return COMPROBACIONES.filter((c) => (c.id === 'primerPaseo' ? primerPaseoHecho(paseosAcompanados) : marcas[c.id] === true)).map((c) => c.id)
}

/** «6 comprobaciones»: siempre sale de la lista, nunca se escribe a mano. */
export function textoCantidadComprobaciones(hechas?: number): string {
  const total = COMPROBACIONES.length
  return hechas === undefined ? `${total} comprobaciones` : `${hechas} de ${total} comprobaciones`
}

/** Regla 2, dicha al paseador. Con `paseos` ya cumplidos, dice que la etiqueta se quitó. */
export function reglaNuevoPaseador(paseos?: number): string {
  if (paseos !== undefined && !llevaEtiquetaNuevo(paseos)) {
    return `Ya cumpliste los ${REGLA_NUEVO.paseos} paseos: sin etiqueta «${REGLA_NUEVO.etiqueta}» y hasta ${MAX_PERROS_POR_PASEO} perros.`
  }
  return `Hasta los ${REGLA_NUEVO.paseos} paseos llevas la etiqueta «${REGLA_NUEVO.etiqueta}» y máximo ${REGLA_NUEVO.maxPerros} perros.`
}

/** Regla 2, dicha al dueño. */
export function reglaNuevoDueno(): string {
  return `Hasta los ${REGLA_NUEVO.paseos} paseos lleva la etiqueta «${REGLA_NUEVO.etiqueta}» y máximo ${REGLA_NUEVO.maxPerros} perros.`
}

/** «Hasta 6 comprobaciones»: un paseador nuevo todavía no tiene la última. */
export function textoHastaComprobaciones(): string {
  return `Hasta ${COMPROBACIONES.length} comprobaciones`
}

const EN_RESUMEN: readonly ComprobacionId[] = ['dni', 'examen', 'primerPaseo']

function enLista(titulos: readonly string[]): string {
  const t = titulos.map((s) => (s.startsWith('DNI') ? s : s[0].toLowerCase() + s.slice(1)))
  return t.length < 2 ? t.join('') : `${t.slice(0, -1).join(', ')} y ${t[t.length - 1]}`
}

/** Tres de las comprobaciones, en una línea (para la portada, el afiche y el marco de escritorio). */
export function resumenComprobaciones(): string {
  return `${enLista(COMPROBACIONES.filter((c) => EN_RESUMEN.includes(c.id)).map((c) => c.titulo))}.`
}

/** Las otras comprobaciones, detrás de «Ver más». */
export function restoComprobaciones(): string {
  return `También: ${enLista(COMPROBACIONES.filter((c) => !EN_RESUMEN.includes(c.id)).map((c) => c.titulo))}.`
}

/** Máximo de perros por paseo para cualquier paseador. Los «Nuevo» llevan menos (REGLA_NUEVO.maxPerros). */
export const MAX_PERROS_POR_PASEO = 3

export function textoMaxPerros(): string {
  return `Máximo ${MAX_PERROS_POR_PASEO} perros, nunca de tamaños distintos.`
}

/** Regla 1, dicha al paseador. */
export function reglaPrimerPaseoPaseador(): string {
  return 'Tu primer paseo lo hacemos contigo: es la comprobación 6.'
}
