/**
 * Las reseñas con el servidor (parte 3b): lo que se manda a la base y cómo vuelve a la app. Funciones PURAS.
 *
 *   - Una reseña por paseo, solo de un paseo cerrado y solo de su familia y su paseador (la base lo cuida: `resenas`).
 *   - El nombre que se muestra («Valeria R.») y el distrito los pone la base: la app no los manda.
 *   - Lo que no se puede mostrar sin inventar algo (sin estrellas, sin autora) se descarta.
 */
import { REVIEW_TAGS } from '../data'
import type { District, Review } from '../types'
import type { FilaCruda } from './paseosTipos'

export const MAX_TEXTO_RESENA = 280
const MAX_ETIQUETAS = 8
const DISTRITOS: readonly District[] = ['San Isidro', 'Jesús María']

/** La fila que se manda a la base. Solo lo que escribió la persona: el nombre y el distrito los pone la base. */
export interface FilaResenaNueva {
  paseo_id: string
  familia_id: string
  paseador_id: string
  estrellas: number
  texto: string
  etiquetas: string[]
}

const texto = (v: unknown): string => (typeof v === 'string' ? v : '')

/**
 * La fila de una reseña de esta familia. null si falta algo que la base va a exigir (el paseo, el paseador o de 1 a 5
 * estrellas): se pide y se valida antes. El comentario se recorta a 280 letras y solo viajan las etiquetas que ofrece la app.
 */
export function filaDeResena(r: Pick<Review, 'paseoId' | 'walkerId' | 'rating' | 'text' | 'tags'>, familiaId: string): FilaResenaNueva | null {
  const estrellas = Math.round(r.rating)
  if (!r.paseoId || !r.walkerId || !familiaId || !(estrellas >= 1 && estrellas <= 5)) return null
  const etiquetas = [...new Set(r.tags.filter((t) => (REVIEW_TAGS as readonly string[]).includes(t)))].slice(0, MAX_ETIQUETAS)
  return { paseo_id: r.paseoId, familia_id: familiaId, paseador_id: r.walkerId, estrellas, texto: r.text.trim().slice(0, MAX_TEXTO_RESENA), etiquetas }
}

/** «Hoy», «Ayer», «Hace 3 días», «Hace 2 semanas», «Hace 4 meses»: cuándo se escribió, en palabras simples. */
export function cuandoFue(iso: string, ahora: number): string {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return ''
  const dias = Math.max(0, Math.floor((ahora - t) / 86_400_000))
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Ayer'
  if (dias < 7) return `Hace ${dias} días`
  if (dias < 30) {
    const semanas = Math.floor(dias / 7)
    return semanas === 1 ? 'Hace 1 semana' : `Hace ${semanas} semanas`
  }
  const meses = Math.floor(dias / 30)
  return meses === 1 ? 'Hace 1 mes' : `Hace ${meses} meses`
}

/**
 * Una reseña de la base como la usa la app. `miId`: si la escribió esta persona, queda marcada como suya («Tu reseña»).
 * null si no hay un paseo, un paseador, de 1 a 5 estrellas o quién la escribió.
 */
export function reviewDeFila(f: FilaCruda, miId: string | null, ahora: number): Review | null {
  const paseoId = texto(f.paseo_id)
  const walkerId = texto(f.paseador_id)
  const estrellas = typeof f.estrellas === 'number' ? f.estrellas : Number(f.estrellas)
  const autor = texto(f.autor).trim()
  if (!paseoId || !walkerId || !Number.isFinite(estrellas) || estrellas < 1 || estrellas > 5 || !autor) return null
  const mine = !!miId && texto(f.familia_id) === miId
  const etiquetas = Array.isArray(f.etiquetas) ? f.etiquetas.filter((t): t is string => typeof t === 'string') : []
  const distrito = DISTRITOS.find((d) => d === f.distrito) ?? ''
  return {
    // El id es el del paseo: una sola reseña por paseo y siempre la misma, venga de donde venga.
    id: `resena-${paseoId}`,
    author: autor,
    district: distrito,
    rating: Math.round(estrellas),
    text: texto(f.texto).trim(),
    tags: etiquetas,
    when: cuandoFue(texto(f.creado_en), ahora),
    ...(mine ? { mine: true } : {}),
    walkerId,
    paseoId,
  }
}

/** Las reseñas que bajó la base, ya como las usa la app (las que no se entienden se descartan). */
export function resenasDeFilas(filas: readonly FilaCruda[], miId: string | null, ahora: number): Review[] {
  return filas.map((f) => reviewDeFila(f, miId, ahora)).filter((r): r is Review => r !== null)
}
