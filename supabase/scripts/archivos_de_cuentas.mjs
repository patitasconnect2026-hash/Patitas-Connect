// Funciones PURAS del borrado de los archivos de las cuentas borradas (las usa borrar_fotos_vencidas.mjs y las prueban los tests).
// `borrar_mi_cuenta()` borra las filas de las fotos al instante, pero un archivo del almacén solo se puede borrar por la API
// (con la clave de servicio): por eso anota la ruta de cada imagen en `archivos_por_borrar` y el script la borra de ahí.

/**
 * Las rutas de `archivos_por_borrar` que se pueden mandar a borrar: texto, sin espacios de más, sin «..», sin empezar por «/»
 * y sin repetir. Cualquier otra cosa se deja quieta (no se borra a ciegas).
 */
export function rutasDeCuentasBorradas(filas) {
  const rutas = new Set()
  for (const f of Array.isArray(filas) ? filas : []) {
    const ruta = f && typeof f.ruta === 'string' ? f.ruta.trim() : ''
    if (ruta === '' || ruta.startsWith('/') || ruta.split('/').includes('..')) continue
    rutas.add(ruta)
  }
  return [...rutas]
}

/** El filtro de PostgREST para quitar esas filas: `ruta=in.("a","b")`, con las comillas y el escape que pide. */
export function filtroDeRutas(rutas) {
  return `ruta=in.(${rutas.map((r) => `"${r.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`).join(',')})`
}
