/**
 * Dónde se guardan las calificaciones por barras: en este teléfono (lib/datos), hasta que exista su tabla en la base.
 * Simulado a propósito: el pedido dice que las APIs se conectan después. Clave con versión para poder cambiar la forma.
 */
import type { CalificacionDetallada } from './calificacionDetallada'
import { CLAVES } from './datos/claves'
import { guardarEnTelefono, leerDelTelefono } from './datos'

const MAX = 200

export function leerCalificaciones(): CalificacionDetallada[] {
  const v = leerDelTelefono<unknown>(CLAVES.calificaciones, [])
  return Array.isArray(v) ? (v as CalificacionDetallada[]) : []
}

/** Agrega (o reemplaza la del mismo paseo y la misma parte). Devuelve false si el navegador no dejó guardar. */
export function guardarCalificacion(c: CalificacionDetallada): boolean {
  try {
    const resto = leerCalificaciones().filter((x) => !(x.paseoId === c.paseoId && x.quien === c.quien))
    guardarEnTelefono(CLAVES.calificaciones, [...resto, c].slice(-MAX))
    return true
  } catch {
    return false
  }
}

export function calificacionDe(paseoId: string, quien: CalificacionDetallada['quien']): CalificacionDetallada | undefined {
  return leerCalificaciones().find((x) => x.paseoId === paseoId && x.quien === quien)
}

/** Los puntajes finales (1 a 10) que recibió un paseador, para su ranking. */
export function puntajesDe(paseadorId: string): number[] {
  return leerCalificaciones()
    .filter((x) => x.quien === 'familia' && x.paseadorId === paseadorId && typeof x.puntajeFinal === 'number')
    .map((x) => x.puntajeFinal as number)
}
