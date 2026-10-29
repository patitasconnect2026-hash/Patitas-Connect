import type { Walker } from './types'

/**
 * ¿Se muestra la calificación de este paseador? Solo con reseñas de verdad: el que viene de la base, si ya tiene al menos una
 * (la calificación es el promedio de esas reseñas); los de ejemplo, como siempre. Sin esto la tarjeta dice «Aún sin reseñas».
 */
export function tieneCalificacion(w: Pick<Walker, 'deServidor' | 'resenasN' | 'walks'>): boolean {
  return w.deServidor ? (w.resenasN ?? 0) > 0 : w.walks > 0
}
