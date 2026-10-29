/**
 * Varios paseos a la vez, cada uno con su familia y su paseador. Funciones PURAS (no leen ni guardan nada).
 *
 * Hoy hay UN solo paseo por navegador (clave `patitas:bus:job` con un `Job`). Con un servidor hay muchos: cada persona
 * ve solo los que le corresponden. Aquí está lo que hace falta para eso, sin cambiar lo que se ve hoy:
 *   - qué paseos son de quién (`paseosDe`) y cuál es el «activo» de cada persona (`paseoActivoDe`);
 *   - leer lo guardado en cualquiera de los dos formatos: un `Job` suelto (el de siempre) o una lista;
 *   - guardar el paseo activo: con `capacidad` 1 (navegador) un paseo nuevo REEMPLAZA al anterior, como hoy.
 */
import { migrarJob, type ChatMsg, type Job, type LiveEvent } from '../bus'
import type { Identidad } from './adaptador'

/** Cuántos paseos guarda a la vez el navegador (uno, como siempre) y el servidor. */
export const CAPACIDAD_LOCAL = 1
export const CAPACIDAD_SERVIDOR = 50

/** Lee lo guardado: nada, un `Job` suelto (formato de siempre) o una lista. Lo que no sirve se descarta. */
export function normalizarPaseos(v: unknown): Job[] {
  const crudos: unknown[] = Array.isArray(v) ? v : v && typeof v === 'object' ? [v] : []
  const salida: Job[] = []
  for (const c of crudos) {
    if (!c || typeof c !== 'object') continue
    const o = c as Partial<Job> & { status?: string; paid?: boolean }
    if (typeof o.id !== 'string' || o.id === '') continue
    const j = migrarJob(o)
    if (j) salida.push(j)
  }
  return salida
}

/** Cómo se guarda: con capacidad 1, el `Job` suelto (o null), igual que hoy; con más, la lista. */
export function empaquetarPaseos(lista: readonly Job[], capacidad: number): Job | Job[] | null {
  if (capacidad <= 1) return lista[lista.length - 1] ?? null
  return [...lista]
}

/**
 * Los paseos que le corresponden a una persona. Sin identidad (el navegador de hoy) son todos los guardados:
 * ahí hay uno solo y lo ven la app del dueño y la del paseador, como siempre.
 */
export function paseosDe(lista: readonly Job[], quien: Identidad | null): Job[] {
  if (!quien || quien.rol === 'equipo') return [...lista]
  if (quien.rol === 'familia') return lista.filter((j) => j.familiaId === quien.id)
  return lista.filter((j) => j.walkerId === quien.id && !j.cerradoPaseador)
}

const masReciente = (lista: readonly Job[]): Job | null => lista.reduce<Job | null>((m, j) => (!m || j.createdAt >= m.createdAt ? j : m), null)
const masAntiguo = (lista: readonly Job[]): Job | null => lista.reduce<Job | null>((m, j) => (!m || j.createdAt < m.createdAt ? j : m), null)
const EN_CURSO = ['aceptado', 'en_camino', 'en_paseo', 'entregado', 'en_disputa']

/**
 * El paseo «activo»: el más reciente de los suyos. Con varios paseos, al paseador se le muestra primero el que está en
 * curso y, si no hay, la solicitud más antigua (la que primero vence); con uno solo (el teléfono) es ese.
 */
export function paseoActivoDe(lista: readonly Job[], quien: Identidad | null): Job | null {
  const suyos = paseosDe(lista, quien)
  if (quien?.rol === 'paseador' && suyos.length > 1) {
    const enCurso = suyos.filter((j) => EN_CURSO.includes(j.paseo.estado))
    if (enCurso.length > 0) return masReciente(enCurso)
    const pendientes = suyos.filter((j) => j.paseo.estado === 'solicitado')
    if (pendientes.length > 0) return masAntiguo(pendientes)
  }
  return masReciente(suyos)
}

/**
 * Lo que queda en la lista cuando la persona cambia su paseo activo (`activo` → `siguiente`):
 *   - `siguiente` null: se quita el activo (la persona lo descartó);
 *   - mismo id: se reemplaza;
 *   - otro id (paseo nuevo): se suma; con capacidad 1 reemplaza a todos, como hoy.
 * Un paseo nuevo de una familia se marca con su `familiaId` para que solo ella lo vea.
 */
export function aplicarPaseoActivo(lista: readonly Job[], activo: Job | null, siguiente: Job | null, quien: Identidad | null, capacidad: number): Job[] {
  if (siguiente === null) return activo ? lista.filter((j) => j.id !== activo.id) : [...lista]
  const marcado: Job = quien?.rol === 'familia' && !siguiente.familiaId ? { ...siguiente, familiaId: quien.id } : siguiente
  if (capacidad <= 1) return [marcado]
  const existe = lista.some((j) => j.id === marcado.id)
  const nueva = existe ? lista.map((j) => (j.id === marcado.id ? marcado : j)) : [...lista, marcado]
  if (nueva.length <= capacidad) return nueva
  // Pasada la capacidad se sueltan los más viejos que ya terminaron (nunca el que se está guardando).
  const orden = [...nueva].sort((a, b) => a.createdAt - b.createdAt)
  const sobran = nueva.length - capacidad
  const fuera = new Set(orden.filter((j) => j.id !== marcado.id).slice(0, sobran).map((j) => j.id))
  return nueva.filter((j) => !fuera.has(j.id))
}

/* ------------------------------------------------------------------ */
/* Chat y bitácora de varios paseos                                     */
/* ------------------------------------------------------------------ */

type ConPaseo = { jobId?: string }

/** Marca con el paseo los mensajes o avisos nuevos (los que no traen `jobId`). Sin paseo activo, no toca nada. */
export function marcarConPaseo<T extends ChatMsg | LiveEvent>(items: readonly T[], jobId: string | undefined): T[] {
  if (!jobId) return [...items]
  return items.map((i) => ((i as ConPaseo).jobId ? i : { ...i, jobId }))
}

/** Los de un paseo. Los que no traen `jobId` (de antes) se ven en el paseo activo, como hoy. */
export function deEstePaseo<T extends ChatMsg | LiveEvent>(items: readonly T[], jobId: string | undefined): T[] {
  return items.filter((i) => {
    const id = (i as ConPaseo).jobId
    return !id || !jobId || id === jobId
  })
}
