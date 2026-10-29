/**
 * Ayuda para las pruebas que leen el código: encuentra las etiquetas JSX de apertura
 * respetando llaves y comillas (un `=>` dentro de onClick no corta la etiqueta).
 * No se importa desde la app.
 */
export interface Etiqueta {
  nombre: string
  /** Texto completo de la etiqueta de apertura, con todos sus atributos. */
  texto: string
  /** Línea (desde 1) donde empieza. */
  linea: number
}

function finDeEtiqueta(s: string, inicio: number): number {
  let profundidad = 0
  let comilla: string | null = null
  for (let j = inicio + 1; j < s.length; j++) {
    const c = s[j]
    if (comilla) {
      if (c === '\\') j++
      else if (c === comilla) comilla = null
    } else if (c === '"' || c === "'" || c === '`') comilla = c
    else if (c === '{') profundidad++
    else if (c === '}') profundidad--
    else if (c === '>' && profundidad <= 0) return j
  }
  return -1
}

export function etiquetasJsx(src: string): Etiqueta[] {
  const salida: Etiqueta[] = []
  for (const m of src.matchAll(/(?<![\w)\]])<([a-zA-Z][\w.]*)\b/g)) {
    const inicio = m.index ?? 0
    const fin = finDeEtiqueta(src, inicio)
    if (fin === -1) continue
    salida.push({ nombre: m[1], texto: src.slice(inicio, fin + 1), linea: src.slice(0, inicio).split('\n').length })
  }
  return salida
}
