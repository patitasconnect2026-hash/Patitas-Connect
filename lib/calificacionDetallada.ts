/**
 * Calificaciones por partes, con barras de 0 a 100 (pedido de Yahrod, 30 de octubre de 2026).
 *
 *  - La FAMILIA declara cómo es su perro (limpio, fuerza al jalar, agresividad…). El PASEADOR, después del paseo, marca lo
 *    que vio en esas mismas barras. Si no coincide, queda a la vista y el equipo lo revisa: así nadie engaña al otro.
 *  - El paseador también califica a la familia (puntualidad al entregar, información correcta, trato).
 *  - La familia califica al paseador por partes y le pone un PUNTAJE FINAL de 1 a 10. El ranking (1 a 10) es solo del paseador.
 *
 * Cada calificación lleva un comentario opcional. Se guardan en este teléfono hasta que exista la tabla en la base.
 */

export interface Atributo {
  id: string
  nombre: string
  /** Qué significa la barra en 0 y en 100. */
  bajo: string
  alto: string
  /** true = más es mejor; false = más es peor (agresividad, fuerza al jalar); null = ni bueno ni malo (energía). */
  masEsMejor: boolean | null
}

export const ATRIBUTOS_PERRO: Atributo[] = [
  { id: 'limpieza', nombre: 'Limpio', bajo: 'Llega sucio', alto: 'Muy limpio', masEsMejor: true },
  { id: 'fuerza', nombre: 'Fuerza al jalar', bajo: 'Camina suave', alto: 'Jala muy fuerte', masEsMejor: false },
  { id: 'agresividad', nombre: 'Agresividad', bajo: 'Nada agresivo', alto: 'Muy agresivo', masEsMejor: false },
  { id: 'energia', nombre: 'Energía', bajo: 'Tranquilo', alto: 'Muy activo', masEsMejor: null },
  { id: 'sociable', nombre: 'Sociable con perros', bajo: 'Evita perros', alto: 'Juega con todos', masEsMejor: true },
  { id: 'obediencia', nombre: 'Obedece', bajo: 'No hace caso', alto: 'Obedece siempre', masEsMejor: true },
]

export const ATRIBUTOS_FAMILIA: Atributo[] = [
  { id: 'puntualidad', nombre: 'Puntual al entregar', bajo: 'Me hizo esperar', alto: 'Listo a la hora', masEsMejor: true },
  { id: 'informacion', nombre: 'Ficha correcta', bajo: 'No coincidía', alto: 'Todo era cierto', masEsMejor: true },
  { id: 'trato', nombre: 'Trato', bajo: 'Poco amable', alto: 'Muy amable', masEsMejor: true },
]

export const ATRIBUTOS_PASEADOR: Atributo[] = [
  { id: 'puntualidad', nombre: 'Puntualidad', bajo: 'Llegó tarde', alto: 'A la hora', masEsMejor: true },
  { id: 'cuidado', nombre: 'Cuidado del perro', bajo: 'Descuidado', alto: 'Muy cuidadoso', masEsMejor: true },
  { id: 'comunicacion', nombre: 'Comunicación', bajo: 'No avisó nada', alto: 'Avisó todo', masEsMejor: true },
  { id: 'fotos', nombre: 'Fotos y control', bajo: 'Sin fotos', alto: 'Fotos a tiempo', masEsMejor: true },
  { id: 'trato', nombre: 'Trato', bajo: 'Poco amable', alto: 'Muy amable', masEsMejor: true },
]

export type Valores = Record<string, number>

/** Una barra vale entre 0 y 100, entera. Cualquier otra cosa se corrige al borde más cercano. */
export function acotar(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

/** Valores de partida para una ficha nueva: la mitad en todo. */
export function valoresIniciales(atributos: Atributo[]): Valores {
  return Object.fromEntries(atributos.map((a) => [a.id, 50]))
}

export type Coincidencia = 'coincide' | 'algo_distinto' | 'no_coincide'

export interface Diferencia {
  atributo: Atributo
  declarado: number
  observado: number
  /** Distancia en puntos (0 a 100). */
  distancia: number
  coincidencia: Coincidencia
}

/** Hasta 15 puntos es lo mismo; de 16 a 34, algo distinto; 35 o más, no coincide. */
export function coincidencia(distancia: number): Coincidencia {
  if (distancia >= 35) return 'no_coincide'
  if (distancia > 15) return 'algo_distinto'
  return 'coincide'
}

/** Compara la ficha que llenó la familia con lo que vio el paseador, atributo por atributo. */
export function compararPerro(declarado: Valores, observado: Valores, atributos: Atributo[] = ATRIBUTOS_PERRO): Diferencia[] {
  return atributos
    .filter((a) => declarado[a.id] !== undefined && observado[a.id] !== undefined)
    .map((a) => {
      const d = acotar(declarado[a.id])
      const o = acotar(observado[a.id])
      const distancia = Math.abs(d - o)
      return { atributo: a, declarado: d, observado: o, distancia, coincidencia: coincidencia(distancia) }
    })
}

export interface AlertaPerro {
  nivel: 'ninguna' | 'revisar' | 'urgente'
  motivos: string[]
}

/**
 * ¿Hay algo que el equipo deba revisar? Agresividad vista de 60 o más, o agresividad o fuerza que no coinciden con lo
 * declarado. Con una alerta, el paseador puede no volver a pasear a ese perro SIN penalidad.
 */
export function alertaPerro(difs: Diferencia[]): AlertaPerro {
  const motivos: string[] = []
  let nivel: AlertaPerro['nivel'] = 'ninguna'
  for (const d of difs) {
    if (d.atributo.id === 'agresividad' && d.observado >= 60) {
      motivos.push(`Agresividad vista: ${d.observado} %`)
      nivel = 'urgente'
    } else if ((d.atributo.id === 'agresividad' || d.atributo.id === 'fuerza') && d.coincidencia === 'no_coincide' && d.observado > d.declarado) {
      motivos.push(`${d.atributo.nombre}: la ficha dice ${d.declarado} % y se vio ${d.observado} %`)
      if (nivel === 'ninguna') nivel = 'revisar'
    }
  }
  return { nivel, motivos }
}

/* ------------------------------------------------------------------ */
/* Puntaje final del paseador (1 a 10) y ranking                        */
/* ------------------------------------------------------------------ */

export function puntajeValido(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= 10
}

/** Un puntaje sugerido a partir de las barras: el promedio de 0-100 llevado a 1-10. La familia lo puede cambiar. */
export function puntajeSugerido(valores: Valores, atributos: Atributo[] = ATRIBUTOS_PASEADOR): number {
  const usados = atributos.filter((a) => valores[a.id] !== undefined)
  if (usados.length === 0) return 10
  const prom = usados.reduce((s, a) => s + acotar(valores[a.id]), 0) / usados.length
  return Math.max(1, Math.min(10, Math.round(1 + (prom / 100) * 9)))
}

/**
 * El ranking del paseador (1 a 10, con un decimal). Para que un solo 10 o un solo 1 no lo decida todo, se suman
 * `peso` calificaciones imaginarias de `previo` (un punto de partida prudente). Con muchas calificaciones pesa lo real.
 */
export function rankingPaseador(puntajes: number[], previo = 8, peso = 3): number | null {
  const validos = puntajes.filter(puntajeValido)
  if (validos.length === 0) return null
  const total = validos.reduce((s, n) => s + n, 0) + previo * peso
  return Math.round((total / (validos.length + peso)) * 10) / 10
}

/** Promedio por atributo de muchas calificaciones (para las barras del perfil). */
export function promedioPorAtributo(lista: Valores[], atributos: Atributo[]): Valores {
  const salida: Valores = {}
  for (const a of atributos) {
    const vals = lista.map((v) => v[a.id]).filter((n): n is number => typeof n === 'number')
    if (vals.length) salida[a.id] = Math.round(vals.reduce((s, n) => s + acotar(n), 0) / vals.length)
  }
  return salida
}

/** Texto corto de una barra según si más es mejor o peor. */
export function lecturaBarra(a: Atributo, valor: number): string {
  const v = acotar(valor)
  return v >= 50 ? a.alto : a.bajo
}

/** Tono de la barra: verde si es bueno, rojo si es malo, neutro si no aplica. Más de 60 en algo malo es rojo. */
export function tonoBarra(a: Atributo, valor: number): 'bien' | 'atencion' | 'neutro' {
  const v = acotar(valor)
  if (a.masEsMejor === null) return 'neutro'
  const bueno = a.masEsMejor ? v : 100 - v
  return bueno >= 40 ? 'bien' : 'atencion'
}

/* ------------------------------------------------------------------ */
/* Lo que se guarda                                                     */
/* ------------------------------------------------------------------ */

export type QuienCalifica = 'familia' | 'paseador'

export interface CalificacionDetallada {
  id: string
  paseoId: string
  quien: QuienCalifica
  /** A quién se califica (para el ranking del paseador y la ficha del perro). */
  paseadorId?: string
  perroId?: string
  /** Si califica la familia: barras del paseador y puntaje final. Si califica el paseador: barras del perro y de la familia. */
  paseador?: Valores
  puntajeFinal?: number
  perro?: Valores
  familia?: Valores
  comentario: string
  en: number
}

export const COMENTARIO_MAX = 400

/** Revisa una calificación antes de guardarla. Devuelve el error en palabras o null. */
export function validarCalificacion(c: Omit<CalificacionDetallada, 'id' | 'en'>): string | null {
  if (c.comentario.length > COMENTARIO_MAX) return `El comentario puede tener hasta ${COMENTARIO_MAX} letras.`
  if (c.quien === 'familia') {
    if (!c.paseador) return 'Falta calificar al paseador.'
    if (c.puntajeFinal === undefined || !puntajeValido(c.puntajeFinal)) return 'Elige un puntaje final del 1 al 10.'
  } else {
    if (!c.perro) return 'Falta lo que viste del perro.'
    if (c.puntajeFinal !== undefined) return 'El puntaje final es solo para el paseador.'
  }
  return null
}
