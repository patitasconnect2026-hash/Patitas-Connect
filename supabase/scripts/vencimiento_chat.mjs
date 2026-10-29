// Funciones PURAS del borrado de las imágenes del chat (las usa borrar_fotos_vencidas.mjs y las prueban los tests).
// Las imágenes del chat viven en `chat/<paseo>/<mensaje>.jpg` y NO tienen fila en la tabla `fotos`: no hay fecha de vencimiento
// guardada, así que el único dato es la fecha en que el almacén las recibió (`created_at`).

export const DIAS_DEL_CHAT = 7
const DIA_MS = 24 * 60 * 60 * 1000

/**
 * Un elemento de la lista del almacén (`POST /storage/v1/object/list/fotos`) como imagen de chat, o null si no sirve
 * (una carpeta, o un archivo sin fecha: sin fecha NO se borra, es lo más prudente).
 */
export function imagenDeChat(paseo, item) {
  if (!paseo || !item || typeof item.name !== 'string' || item.name === '' || item.id == null) return null
  const creado = Date.parse(item.created_at ?? item.updated_at ?? '')
  if (!Number.isFinite(creado)) return null
  return { paseo, ruta: `chat/${paseo}/${item.name}`, creado }
}

/**
 * Las rutas de las imágenes del chat que ya vencieron (más de `dias` días en el almacén), salvo las de un paseo que tiene un
 * caso abierto o está en disputa (se conservan hasta que se cierre, igual que las fotos del paseo).
 *   - `imagenes`: lo que devuelve `imagenDeChat`.
 *   - `conservar`: un Set con los ids de los paseos que NO se tocan.
 */
export function imagenesDeChatVencidas({ imagenes, ahora, conservar, dias = DIAS_DEL_CHAT }) {
  const limite = ahora - dias * DIA_MS
  return imagenes.filter((i) => i.creado <= limite && !conservar.has(i.paseo)).map((i) => i.ruta)
}

/** Los ids de los paseos que no se tocan: los de un caso sin resolver y los que están «en disputa». */
export function paseosAConservar({ casosAbiertos, paseosEnDisputa }) {
  return new Set([...casosAbiertos.map((c) => c.paseo_id), ...paseosEnDisputa.map((p) => p.id)].filter((x) => typeof x === 'string' && x !== ''))
}
