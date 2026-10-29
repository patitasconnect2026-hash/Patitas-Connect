// Un «almacén de fotos de mentira» para las pruebas: hace lo que la API de Storage de Supabase hace por encima de las reglas
// de la base (tamaño y tipo del bucket, «ya existe», enlaces que vencen) y deja que las REGLAS DE FILA de las migraciones
// decidan quién puede subir, ver y borrar (inserta, consulta y borra en `storage.objects` con el rol de cada persona).
// Los bytes viven en memoria. No hay red, ni claves, ni Supabase. Lo usan servidor_simulado.mjs (por HTTP) y las pruebas
// con PGlite (lib/servidor/pruebas/servidorPglite.ts).
//
// Límites: no es la API de Storage completa; solo lo que usa la app (subir, enlace que vence, ver con el enlace y borrar).

const BUCKET = 'fotos'

/** Un error como los del almacén: HTTP, `statusCode` (texto) y mensaje. */
function fallo(status, statusCode, error, message) {
  return Object.assign(new Error(message), { almacen: true, status, statusCode, error })
}

/**
 * `db`: la base con las migraciones. `ejecutar(uid, f)`: corre `f(tx)` como esa persona (`authenticated`) o sin sesión (`anon`).
 */
export function crearAlmacenSimulado({ db, ejecutar }) {
  const objetos = new Map() // ruta → { bytes, tipo }
  const enlaces = new Map() // señal → { ruta, vence }
  let n = 0

  const comoFallo = (e, uid) => {
    if (e?.almacen) return e
    // Sin sesión («anon») o sin permiso sobre la tabla: no entra. Con sesión, una regla de fila que dice que no.
    if (e?.code === '42501') return uid ? fallo(403, '403', 'Unauthorized', 'new row violates row-level security policy') : fallo(401, '401', 'Unauthorized', 'Invalid JWT')
    return fallo(400, '400', 'Bad Request', String(e?.message ?? e))
  }

  return {
    /** Sube un archivo. Mismo orden que Storage: el tipo y el tamaño del bucket, luego las reglas de fila, luego «ya existe». */
    async subir({ uid, ruta, bytes, tipo }) {
      const b = (await db.query(`select file_size_limit, allowed_mime_types from storage.buckets where id = $1`, [BUCKET])).rows[0]
      if (!b) throw fallo(404, '404', 'Bucket not found', 'Bucket not found')
      const largo = bytes.byteLength ?? bytes.length
      if (b.file_size_limit != null && largo > Number(b.file_size_limit)) throw fallo(413, '413', 'Payload too large', 'The object exceeded the maximum allowed size')
      if (Array.isArray(b.allowed_mime_types) && b.allowed_mime_types.length > 0 && !b.allowed_mime_types.includes(tipo)) {
        throw fallo(415, '415', 'invalid_mime_type', `mime type ${tipo} is not supported`)
      }
      try {
        await ejecutar(uid, async (tx) => {
          await tx.query(`insert into storage.objects (bucket_id, name, owner) values ($1, $2, $3)`, [BUCKET, ruta, uid])
          // Ya estaba: se deshace la fila que se acaba de poner (la transacción se cancela).
          if (objetos.has(ruta)) throw fallo(400, '409', 'Duplicate', 'The resource already exists')
        })
      } catch (e) {
        throw comoFallo(e, uid)
      }
      objetos.set(ruta, { bytes: Buffer.from(bytes), tipo })
    },

    /** Un enlace que vence, solo si la persona puede ver ese archivo (regla de lectura de `storage.objects`). */
    async firmar({ uid, ruta, segundos }) {
      let hay
      try {
        hay = await ejecutar(uid, async (tx) => (await tx.query(`select 1 from storage.objects where bucket_id = $1 and name = $2`, [BUCKET, ruta])).rows.length > 0)
      } catch (e) {
        throw comoFallo(e, uid)
      }
      if (!hay || !objetos.has(ruta)) throw fallo(400, '404', 'not_found', 'Object not found')
      const senal = `s${++n}-${Math.random().toString(36).slice(2, 10)}`
      enlaces.set(senal, { ruta, vence: Date.now() + Number(segundos) * 1000 })
      return senal
    },

    /** Lo que devuelve el enlace: la imagen mientras no haya vencido; después, nada. */
    leerConEnlace(senal, ahora = Date.now()) {
      const e = enlaces.get(senal)
      if (!e || ahora > e.vence) return null
      return objetos.get(e.ruta) ?? null
    },

    /** Borra archivos que la persona puede borrar (regla de borrado). Devuelve los que se borraron. */
    async borrar({ uid, rutas }) {
      let borradas
      try {
        borradas = await ejecutar(uid, async (tx) => (await tx.query(`delete from storage.objects where bucket_id = $1 and name = any($2::text[]) returning name`, [BUCKET, rutas])).rows.map((r) => r.name))
      } catch (e) {
        throw comoFallo(e, uid)
      }
      for (const r of borradas) {
        objetos.delete(r)
        for (const [senal, e] of enlaces) if (e.ruta === r) enlaces.delete(senal)
      }
      return borradas
    },

    /** Para comprobar en las pruebas: cuántos archivos hay y si uno existe. */
    cuantos: () => objetos.size,
    existe: (ruta) => objetos.has(ruta),
    tamanoDe: (ruta) => objetos.get(ruta)?.bytes.length ?? null,
    /** Hace vencer todos los enlaces (para probar que un enlace vencido no sirve). */
    vencerEnlaces: () => enlaces.forEach((e) => (e.vence = 0)),
  }
}
