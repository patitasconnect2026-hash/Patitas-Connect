/**
 * El almacén de las fotos del paseo.
 *
 * Una foto son dos cosas: sus DATOS (hora, lugar, código: poco texto, van en la lista `CLAVES.fotos` como todo lo demás)
 * y sus BYTES (la imagen). Los bytes no caben bien en localStorage (unos 5 MB para toda la app), así que van en IndexedDB,
 * que vive detrás de esta puerta: ninguna pantalla toca `indexedDB`. Si el navegador no tiene IndexedDB, se usa la memoria
 * de la pestaña (la foto dura mientras la app esté abierta y solo la ve esa pestaña).
 *
 * Qué pasa cuando no cabe: nunca se rompe nada. `guardarFoto` devuelve `{ ok: false, error: 'lleno' }`, la pantalla dice
 * una frase corta y el paseo sigue como estaba (el encargo y su estado no se tocan).
 */
import { CONFIG } from '../config'
import { fotosDe, type FotoPaseo, type SinUbicacion, type UbicacionDeFoto } from '../fotos'
import type { ErrorGuardado } from '../fotosTextos'
import type { Adaptador } from './adaptador'
import { CLAVES } from './claves'
import { claveSelfie, diaDeLima, esSelfie, esSelfieDe } from '../selfie'

export type ResultadoAlmacen = { ok: true } | { ok: false; motivo: 'lleno' | 'error' }

export interface AlmacenFotos {
  readonly tipo: 'indexeddb' | 'memoria'
  guardar(id: string, bytes: ArrayBuffer, tipoMime: string): Promise<ResultadoAlmacen>
  leer(id: string): Promise<{ bytes: ArrayBuffer; tipo: string } | null>
  borrar(id: string): Promise<void>
  /** Borra todo lo que no esté en `conservar`. */
  limpiar(conservar: readonly string[]): Promise<void>
}

/* ------------------------------------------------------------------ */
/* En memoria: para las pruebas y para navegadores sin IndexedDB        */
/* ------------------------------------------------------------------ */

export function almacenMemoria(opciones: { capacidadBytes?: number } = {}): AlmacenFotos & { datos: Map<string, { bytes: ArrayBuffer; tipo: string }> } {
  const datos = new Map<string, { bytes: ArrayBuffer; tipo: string }>()
  const usado = () => [...datos.values()].reduce((s, d) => s + d.bytes.byteLength, 0)
  return {
    tipo: 'memoria',
    datos,
    async guardar(id, bytes, tipo) {
      const previo = datos.get(id)?.bytes.byteLength ?? 0
      if (opciones.capacidadBytes !== undefined && usado() - previo + bytes.byteLength > opciones.capacidadBytes) return { ok: false, motivo: 'lleno' }
      datos.set(id, { bytes, tipo })
      return { ok: true }
    },
    async leer(id) {
      return datos.get(id) ?? null
    },
    async borrar(id) {
      datos.delete(id)
    },
    async limpiar(conservar) {
      const dejar = new Set(conservar)
      for (const id of [...datos.keys()]) if (!dejar.has(id)) datos.delete(id)
    },
  }
}

/* ------------------------------------------------------------------ */
/* IndexedDB                                                            */
/* ------------------------------------------------------------------ */

const NOMBRE_DB = 'patitas-fotos'
const ALMACEN = 'fotos'

/** ¿El error es «no hay espacio»? (el nombre cambia entre navegadores) */
export function esEspacioLleno(err: unknown): boolean {
  const e = err as { name?: string; code?: number } | null
  return !!e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22)
}

function abrir(idb: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = idb.open(NOMBRE_DB, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(ALMACEN)) req.result.createObjectStore(ALMACEN)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error('IndexedDB bloqueada'))
  })
}

/** Corre algo dentro de una transacción y espera a que termine de verdad (no solo a que se pida). */
function transaccion<T>(db: IDBDatabase, modo: IDBTransactionMode, hacer: (s: IDBObjectStore) => IDBRequest | void): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    let resultado: T | undefined
    let tx: IDBTransaction
    try {
      tx = db.transaction(ALMACEN, modo)
      const req = hacer(tx.objectStore(ALMACEN))
      if (req) req.onsuccess = () => (resultado = req.result as T)
    } catch (e) {
      reject(e)
      return
    }
    tx.oncomplete = () => resolve(resultado)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('transacción cancelada'))
  })
}

/** El almacén de IndexedDB, o null si este navegador no lo tiene. */
export function almacenIndexedDB(idb: IDBFactory | undefined = typeof indexedDB === 'undefined' ? undefined : indexedDB): AlmacenFotos | null {
  if (!idb) return null
  let db: Promise<IDBDatabase> | null = null
  const conexion = () => (db ??= abrir(idb).catch((e) => {
    db = null
    throw e
  }))
  return {
    tipo: 'indexeddb',
    async guardar(id, bytes, tipo) {
      try {
        await transaccion(await conexion(), 'readwrite', (s) => s.put({ bytes, tipo }, id))
        return { ok: true }
      } catch (e) {
        return { ok: false, motivo: esEspacioLleno(e) ? 'lleno' : 'error' }
      }
    },
    async leer(id) {
      try {
        const v = await transaccion<{ bytes: ArrayBuffer; tipo: string }>(await conexion(), 'readonly', (s) => s.get(id))
        return v ?? null
      } catch {
        return null
      }
    },
    async borrar(id) {
      try {
        await transaccion(await conexion(), 'readwrite', (s) => s.delete(id))
      } catch {
        /* ya no estaba, o no se pudo: no pasa nada */
      }
    },
    async limpiar(conservar) {
      const dejar = new Set(conservar)
      try {
        const base = await conexion()
        const claves = (await transaccion<IDBValidKey[]>(base, 'readonly', (s) => s.getAllKeys())) ?? []
        const sobran = claves.filter((k) => !dejar.has(String(k)))
        if (sobran.length) await transaccion(base, 'readwrite', (s) => void sobran.forEach((k) => s.delete(k)))
      } catch {
        /* sin limpieza: la próxima vez */
      }
    },
  }
}

let delNavegador: AlmacenFotos | null = null
/** El almacén que usa la app: IndexedDB si hay; si no, la memoria de la pestaña. */
export function almacenDelNavegador(): AlmacenFotos {
  return (delNavegador ??= almacenIndexedDB() ?? almacenMemoria())
}

/* ------------------------------------------------------------------ */
/* Avisar de un cambio en ESTA pestaña                                  */
/* ------------------------------------------------------------------ */

// El evento «storage» solo avisa a las OTRAS pestañas. Quien guarda una foto también necesita verla en su pantalla.
const oyentes = new Set<() => void>()
let version = 0

/** Cambia cada vez que la lista de fotos cambia en esta pestaña (para refrescar lo que se lee de ella). */
export function versionDeFotos(): number {
  return version
}

/** Avisa a las pantallas de esta pestaña que la lista de fotos cambió. */
export function notificarCambioDeFotos(): void {
  version++
  oyentes.forEach((f) => f())
}

/** Pide que se avise cuando la lista de fotos cambie en esta pestaña. Devuelve cómo dejar de pedirlo. */
export function alCambiarFotos(aviso: () => void): () => void {
  oyentes.add(aviso)
  return () => void oyentes.delete(aviso)
}

/* ------------------------------------------------------------------ */
/* Guardar una foto (datos + bytes)                                     */
/* ------------------------------------------------------------------ */

export function leerFotos(a: Adaptador): FotoPaseo[] {
  return a.leer<FotoPaseo[]>(CLAVES.fotos, [])
}

export interface EntradaFoto {
  jobId: string
  bytes: ArrayBuffer
  tipo?: string
  /** Hora del teléfono (ms). */
  t: number
  codigo: string
  ubicacion: UbicacionDeFoto | null
  sinUbicacion?: SinUbicacion
}

export type ResultadoFoto = { ok: true; foto: FotoPaseo } | { ok: false; error: ErrorGuardado }

function idNuevo(): string {
  return `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Guarda una foto: primero los bytes, después los datos, y comprueba que los datos quedaron. Si algo no cabe, deshace lo
 * que hizo y dice por qué (`tope`, `lleno` o `error`): el paseo no se toca.
 */
export async function guardarFoto(
  deps: { adaptador: Adaptador; almacen: AlmacenFotos },
  e: EntradaFoto,
  opciones: { tope?: number; id?: string } = {},
): Promise<ResultadoFoto> {
  const tope = opciones.tope ?? CONFIG.maxFotosPorPaseo
  const lista = leerFotos(deps.adaptador)
  if (fotosDe(lista, e.jobId).length >= tope) return { ok: false, error: 'tope' }

  const id = opciones.id ?? idNuevo()
  const r = await deps.almacen.guardar(id, e.bytes, e.tipo ?? 'image/jpeg')
  if (!r.ok) return { ok: false, error: r.motivo === 'lleno' ? 'lleno' : 'error' }

  const foto: FotoPaseo = {
    id,
    jobId: e.jobId,
    t: e.t,
    codigo: e.codigo,
    ubicacion: e.ubicacion,
    ...(e.sinUbicacion ? { sinUbicacion: e.sinUbicacion } : {}),
    bytes: e.bytes.byteLength,
    almacen: deps.almacen.tipo,
  }
  deps.adaptador.guardar(CLAVES.fotos, [...lista, foto])
  // localStorage no avisa si no cupo: se lee de vuelta. Si no quedó, se deshace.
  if (!leerFotos(deps.adaptador).some((f) => f.id === id)) {
    await deps.almacen.borrar(id)
    return { ok: false, error: 'lleno' }
  }
  notificarCambioDeFotos()
  return { ok: true, foto }
}

/**
 * Guarda la foto de hoy de un paseador (una por día; si ya había una de hoy, la reemplaza) y suelta las de días
 * anteriores del mismo paseador. Usa los mismos topes de tamaño que las fotos del paseo.
 */
export async function guardarSelfie(
  deps: { adaptador: Adaptador; almacen: AlmacenFotos },
  e: { walkerId: string; bytes: ArrayBuffer; tipo?: string; t: number },
): Promise<ResultadoFoto> {
  const lista = leerFotos(deps.adaptador)
  const clave = claveSelfie(e.walkerId, diaDeLima(e.t))
  const viejas = lista.filter((f) => esSelfieDe(f, e.walkerId))
  const r = await guardarFoto(
    { adaptador: deps.adaptador, almacen: deps.almacen },
    { jobId: clave, bytes: e.bytes, tipo: e.tipo, t: e.t, codigo: '', ubicacion: null, sinUbicacion: 'omitida' },
    { tope: 1 + viejas.filter((f) => f.jobId === clave).length },
  )
  if (!r.ok) return r
  // Solo después de guardar la nueva se sueltan las anteriores (si no cupo, la de antes sigue).
  const quedan = leerFotos(deps.adaptador).filter((f) => f.id === r.foto.id || !esSelfieDe(f, e.walkerId))
  if (quedan.length !== leerFotos(deps.adaptador).length) deps.adaptador.guardar(CLAVES.fotos, quedan)
  for (const f of viejas) await deps.almacen.borrar(f.id)
  notificarCambioDeFotos()
  return r
}

/** Deja solo las fotos de estos paseos (libera espacio cuando empieza otro paseo). */
export async function conservarFotosDe(deps: { adaptador: Adaptador; almacen: AlmacenFotos }, jobIds: readonly string[]): Promise<void> {
  const dejar = new Set(jobIds)
  const lista = leerFotos(deps.adaptador)
  // La foto de hoy del paseador (lib/selfie.ts) no es de ningún paseo: no se suelta cuando empieza otro.
  const quedan = lista.filter((f) => dejar.has(f.jobId) || esSelfie(f))
  if (quedan.length !== lista.length) deps.adaptador.guardar(CLAVES.fotos, quedan)
  await deps.almacen.limpiar(quedan.map((f) => f.id))
  notificarCambioDeFotos()
}

/** «Reiniciar la demostración»: no queda ninguna foto. */
export async function borrarTodasLasFotos(deps: { adaptador: Adaptador; almacen: AlmacenFotos }): Promise<void> {
  deps.adaptador.borrar(CLAVES.fotos)
  await deps.almacen.limpiar([])
  notificarCambioDeFotos()
}
