/**
 * Evaluación de situaciones para postulantes a paseador.
 * NO es un test psicológico (eso solo lo aplica un psicólogo colegiado): mide criterio y
 * conocimiento de las reglas con casos reales. Se llama "evaluación de situaciones".
 *
 * Cómo se mide:
 *  - cada pregunta vale 0, 1 o 2 puntos
 *  - las preguntas "críticas" (seguridad del perro) siempre aparecen
 *  - elegir una opción "peligrosa" en una crítica deriva el caso a revisión humana, aunque el puntaje sea alto
 *  - aprobado automático = 80 % o más y cero respuestas peligrosas
 *  - las preguntas abiertas siempre las lee una persona
 */

import { ESCENAS_CURSO } from './cursoEscenas'

/** Con este porcentaje (o más) se muestra el mini curso como «terminado». Antes también servía para el examen de opciones. */
export const PASS_PCT = 80

export interface QuizResult {
  points: number
  max: number
  pct: number
  danger: string[]
  open: Record<string, string>
  openFlags: string[]
  durationSec: number
  /** auto = aprobado sin alertas; review = lo decide una persona; fail = no aprobado */
  verdict: 'auto' | 'review' | 'fail'
  takenAt: string
}

/* ------------------------------------------------------------------ */
/* Mini curso (Bloque 5): ocho escenas «¿Qué harías si…?»               */
/* ------------------------------------------------------------------ */
/**
 * Ocho escenas (lib/cursoEscenas.ts): la situación, tres opciones, una explicación corta y un cierre de qué hacer. NO bloquea al
 * paseador: no prueba que nadie sepa cuidar perros, es una lectura guiada. Se "aprueba" con `PASS_PCT` solo para mostrar cómo le
 * fue; que el contenido aún lo lea una persona de confianza es un recordatorio SOLO para el equipo (`CONFIG.cursoRevisado`).
 */

export const MAX_INTENTOS_CURSO = 2
/** Meses de espera cuando se agotaron los intentos (docs/FILTROS-Y-PERFIL-PASEADORES.md). */
export const MESES_REINTENTO_CURSO = 3

export interface PreguntaCurso {
  id: string
  /** De qué escena es. */
  pantalla: string
  text: string
  options: string[]
  /** Índice de la opción correcta. */
  correcta: number
}

/** Las preguntas del curso son las escenas: la situación y sus tres opciones. */
export const TEST_CURSO: readonly PreguntaCurso[] = ESCENAS_CURSO.map((e) => ({ id: e.id, pantalla: e.id, text: e.situacion, options: [...e.opciones], correcta: e.correcta }))

export interface CursoResult {
  aciertos: number
  total: number
  pct: number
  /** Alcanzó `PASS_PCT`. */
  aprobado: boolean
  takenAt: string
}

/** Puntúa el test del curso. `picks`: id de pregunta → índice elegido. */
export function puntuarCurso(picks: Record<string, number>, ahora: Date = new Date()): CursoResult {
  const aciertos = TEST_CURSO.filter((q) => picks[q.id] === q.correcta).length
  const total = TEST_CURSO.length
  const pct = Math.round((aciertos / total) * 100)
  return { aciertos, total, pct, aprobado: pct >= PASS_PCT, takenAt: ahora.toISOString() }
}

export type EstadoCurso =
  | { estado: 'pendiente'; intento: number }
  | { estado: 'aprobado' }
  | { estado: 'reintentar'; intento: number }
  | { estado: 'espera'; desde: string }

/**
 * Dónde va el curso: hasta `MAX_INTENTOS_CURSO` intentos; sin aprobar y agotados, hay que esperar
 * `MESES_REINTENTO_CURSO` meses desde el último intento (después vuelve a empezar de cero).
 */
export function estadoDelCurso(curso: CursoResult | undefined, intentos: number, ahora: Date): EstadoCurso {
  if (curso?.aprobado) return { estado: 'aprobado' }
  if (!curso || intentos <= 0) return { estado: 'pendiente', intento: 1 }
  if (intentos < MAX_INTENTOS_CURSO) return { estado: 'reintentar', intento: intentos + 1 }
  const hasta = new Date(curso.takenAt)
  hasta.setMonth(hasta.getMonth() + MESES_REINTENTO_CURSO)
  if (ahora >= hasta) return { estado: 'pendiente', intento: 1 }
  return { estado: 'espera', desde: hasta.toISOString() }
}
