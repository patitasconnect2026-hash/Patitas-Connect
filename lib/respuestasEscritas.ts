/**
 * El examen del paseador con respuestas ESCRITAS (Bloque 5). Cada pregunta se contesta con las palabras de la persona, entre
 * `respuestaMinima` y `respuestaMaxima` letras (lib/config.ts). No hay puntaje automático: las lee una persona del equipo, y por eso
 * el resultado siempre es «review». Las respuestas se guardan solo para el equipo (tabla `respuestas_escritas`).
 * Funciones puras.
 */
import { CONFIG } from './config'
import type { QuizResult } from './quiz'

export interface PreguntaEscrita {
  id: string
  texto: string
}

/** Los ids se mantienen estables: el equipo ve la respuesta de cada persona bajo su pregunta. */
export const PREGUNTAS_EXAMEN: readonly PreguntaEscrita[] = [
  { id: 'q1', texto: 'Llegas a recoger a un perro y el dueño te dice: «a veces muerde». ¿Qué harías? Cuéntalo con tus palabras.' },
  { id: 'q2', texto: 'El parque está casi vacío y los perros quieren correr. ¿Los soltarías? ¿Por qué?' },
  { id: 'q3', texto: 'Un perro grande del grupo jala fuerte hacia otro perro que pasa. ¿Qué harías, paso a paso?' },
  { id: 'q5', texto: 'Una familia te pide llevar juntos a un perro grande y a uno pequeño «porque se llevan bien». ¿Qué le responderías?' },
  { id: 'q10', texto: 'Un cliente te ofrece pagarte por fuera de la app «para que ganes más». ¿Qué harías?' },
  { id: 'o1', texto: 'Un perro de tu grupo se suelta de la correa y corre hacia una avenida. Cuéntanos, paso a paso, qué harías.' },
  { id: 'o2', texto: '¿Por qué quieres ser paseador y qué experiencia tienes con perros? Cuéntalo con tus palabras.' },
]

export type EstadoRespuesta = 'vacia' | 'corta' | 'ok' | 'larga'

export interface DetalleRespuesta {
  estado: EstadoRespuesta
  /** Letras escritas (sin contar espacios de los bordes). */
  largo: number
  /** Cuántas faltan para el mínimo (0 si ya llegó). */
  faltan: number
  min: number
  max: number
  /** Una frase amable cuando todavía no se puede avanzar; vacía si está bien. */
  mensaje: string
}

export const TEXTO_RESPUESTA = {
  corta: (faltan: number) => `Cuéntanos un poquito más: faltan ${faltan} ${faltan === 1 ? 'letra' : 'letras'}.`,
  larga: (sobran: number) => `Es un poco largo: quita ${sobran} ${sobran === 1 ? 'letra' : 'letras'}.`,
  contador: (largo: number, max: number) => `${largo} de ${max}`,
} as const

export function detalleDeRespuesta(texto: string, min: number = CONFIG.respuestaMinima, max: number = CONFIG.respuestaMaxima): DetalleRespuesta {
  const largo = texto.trim().length
  const estado: EstadoRespuesta = largo === 0 ? 'vacia' : largo < min ? 'corta' : largo > max ? 'larga' : 'ok'
  const faltan = Math.max(0, min - largo)
  const mensaje = estado === 'corta' ? TEXTO_RESPUESTA.corta(faltan) : estado === 'larga' ? TEXTO_RESPUESTA.larga(largo - max) : ''
  return { estado, largo, faltan, min, max, mensaje }
}

const normalizar = (t: string) => t.toLowerCase().replace(/[^a-záéíóúñü0-9]+/g, ' ').trim()

/**
 * Cosas que mirar con atención (no deciden solas): respuestas iguales entre sí, enunciado copiado, letras repetidas, poco cuidado
 * al escribir o haber terminado muy rápido. Las lee una persona.
 */
export function marcasDeRevision(respuestas: Readonly<Record<string, string>>, durationSec: number, preguntas: readonly PreguntaEscrita[] = PREGUNTAS_EXAMEN): string[] {
  const marcas: string[] = []
  const vistas = new Map<string, string>()
  for (const p of preguntas) {
    const t = respuestas[p.id] ?? ''
    const n = normalizar(t)
    if (!t.trim()) {
      marcas.push(`${p.id}: sin respuesta`)
      continue
    }
    const previa = vistas.get(n)
    if (previa) marcas.push(`${p.id}: igual a la respuesta de ${previa}`)
    else vistas.set(n, p.id)
    const enunciado = normalizar(p.texto)
    if (n.length > 25 && (enunciado.includes(n.slice(0, 40)) || n.includes(enunciado.slice(0, 40)))) marcas.push(`${p.id}: copió el enunciado`)
    if (/(.)\1{5,}/.test(t)) marcas.push(`${p.id}: letras repetidas`)
    const letras = (t.match(/[a-záéíóúñü]/gi) ?? []).length
    if (t.trim().length > 0 && letras / t.trim().length < 0.6) marcas.push(`${p.id}: casi no tiene letras`)
  }
  if (durationSec < 120) marcas.push('Terminó demasiado rápido (menos de 2 minutos)')
  return marcas
}

/** El resultado del examen escrito: sin puntaje, y siempre lo lee una persona. */
export function resultadoDeExamenEscrito(respuestas: Readonly<Record<string, string>>, durationSec: number, ahora: Date = new Date()): QuizResult {
  const limpias = Object.fromEntries(PREGUNTAS_EXAMEN.map((p) => [p.id, (respuestas[p.id] ?? '').trim()]))
  return { points: 0, max: 0, pct: 0, danger: [], open: limpias, openFlags: marcasDeRevision(limpias, durationSec), durationSec, verdict: 'review', takenAt: ahora.toISOString() }
}

/** Cómo se nombra el examen de una persona: con puntaje si es uno viejo (de opciones), o «enviado» si es escrito. */
export const etiquetaDeExamen = (q: QuizResult): string => (q.max > 0 ? `Examen: ${q.pct} %` : 'Examen enviado')
