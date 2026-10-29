/**
 * Datos de ejemplo (Tarea 10): los paseadores, las reseñas y los paseos anteriores de `lib/data.ts` son INVENTADOS.
 * Llevan `esEjemplo`, siempre se muestran con la etiqueta «Ejemplo» y se pueden ocultar con «Mostrar ejemplos»
 * (encendido en la demostración, apagado en una cuenta real). Una prueba impide mostrar uno sin la etiqueta.
 */
import { esCuentaDeEjemplo, WALKERS } from './data'
import type { Account, Walker } from './types'

export const TEXTO_EJEMPLOS = {
  etiqueta: 'Ejemplo',
  interruptor: 'Mostrar ejemplos',
  apoyo: 'Paseadores, reseñas y paseos inventados, para ver cómo se ve la app.',
  sinPaseadores: 'Aún no hay paseadores en tu zona.',
  sinPaseadoresApoyo: 'Cuando el equipo apruebe a los primeros, aparecerán aquí.',
} as const

/** Encendido en la demostración (cuenta de demostración o sin cuenta); apagado en una cuenta real. */
export function mostrarEjemplosPorDefecto(account: Account | null): boolean {
  return !account || esCuentaDeEjemplo(account)
}

/** Lo que eligió la persona manda; si no eligió, el valor por defecto de su cuenta. */
export function resolverMostrarEjemplos(elegido: boolean | null | undefined, account: Account | null): boolean {
  return typeof elegido === 'boolean' ? elegido : mostrarEjemplosPorDefecto(account)
}

const IDS_DE_EJEMPLO = new Set(WALKERS.map((w) => w.id))
const NOMBRES_DE_EJEMPLO = new Set(WALKERS.map((w) => w.firstName))

/** ¿Este caso del equipo es de un paseador de ejemplo? (los casos viejos no traen la marca: se sabe por el nombre) */
export function casoEsDeEjemplo(c: { ejemplo?: boolean; paseador: string }): boolean {
  return c.ejemplo ?? NOMBRES_DE_EJEMPLO.has(c.paseador)
}

/** ¿Este paseador (por id) es uno de los inventados? */
export function esPaseadorDeEjemplo(walkerId: string | undefined | null): boolean {
  return !!walkerId && IDS_DE_EJEMPLO.has(walkerId)
}

/** «2 paseadores», «2 paseadores de ejemplo» o «3 paseadores (1 de ejemplo)»: nunca cuenta gente inventada como real. */
export function textoPaseadores(walkers: readonly Walker[]): string {
  const n = walkers.length
  const e = walkers.filter((w) => w.esEjemplo).length
  const base = `${n} ${n === 1 ? 'paseador' : 'paseadores'}`
  if (e === 0) return base
  return e === n ? `${base} de ejemplo` : `${base} (${e} de ejemplo)`
}

/** Los paseadores que se muestran: sin «Mostrar ejemplos», solo los reales (los aprobados por el equipo). */
export function paseadoresVisibles(walkers: readonly Walker[], mostrarEjemplos: boolean): Walker[] {
  return mostrarEjemplos ? [...walkers] : walkers.filter((w) => !w.esEjemplo)
}
