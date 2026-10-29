export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

/**
 * Un número con su sustantivo, bien en singular o plural: plural(1, 'paseador', 'paseadores') → «1 paseador».
 * Todo conteo que se muestre en pantalla pasa por aquí (así nunca sale «1 paseadores»).
 */
export function plural(n: number, uno: string, varios: string) {
  return `${n} ${n === 1 ? uno : varios}`
}

/** S/ 28.00 */
export function soles(n: number) {
  return `S/ ${n.toFixed(2)}`
}

/** S/ 25 (sin decimales si es entero) */
export function solesShort(n: number) {
  return Number.isInteger(n) ? `S/ ${n}` : `S/ ${n.toFixed(2)}`
}

export function uid() {
  return Math.random().toString(36).slice(2, 10)
}
