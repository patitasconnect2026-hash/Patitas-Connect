/**
 * Recordatorios de una reserva aceptada (Bloque 1). Funciones PURAS: la app abierta las consulta cada
 * `segundosEntreRecordatorios`. Los tiempos salen de `CONFIG.recordatoriosReservaMin` (60 = una hora antes).
 * Con la app cerrada todavía no hay aviso (ver docs/PUBLICAR.md).
 */
import type { Job } from './bus'
import { CONFIG } from './config'

const MS_MIN = 60_000
const LIMA_UTC = 5 * 60 * MS_MIN

/** Medianoche (hora de Lima) del día en que se hizo la reserva, en ms. */
function inicioDelDia(ts: number): number {
  const lima = ts - LIMA_UTC
  return lima - (((lima % (24 * 60 * MS_MIN)) + 24 * 60 * MS_MIN) % (24 * 60 * MS_MIN)) + LIMA_UTC
}

/** Cuándo empieza el paseo reservado (ms) o null si la reserva no dice la hora. */
export function inicioDeReserva(job: Pick<Job, 'createdAt' | 'reserva'>): number | null {
  const r = job.reserva
  if (!r || !Number.isFinite(r.startMin) || !Number.isFinite(r.dayIdx)) return null
  return inicioDelDia(job.createdAt) + r.dayIdx * 24 * 60 * MS_MIN + r.startMin * MS_MIN
}

export interface Recordatorio {
  /** Una clave por reserva y tiempo: sirve para no avisar dos veces. */
  clave: string
  jobId: string
  minutos: number
  inicio: number
}

/**
 * Los recordatorios que ya tocan: el paseo está aceptado (o en camino sin haber empezado), falta el tiempo configurado o menos
 * y todavía no empezó. Se devuelve a lo más UNO por reserva (el más cercano a la hora), para no avisar tres veces de golpe.
 */
export function recordatoriosQueTocan(jobs: readonly Job[], ahora: number, yaAvisados: ReadonlySet<string>, tiempos: readonly number[] = CONFIG.recordatoriosReservaMin): Recordatorio[] {
  const salida: Recordatorio[] = []
  for (const job of jobs) {
    if (job.paseo.estado !== 'aceptado') continue
    const inicio = inicioDeReserva(job)
    if (inicio === null || ahora >= inicio) continue
    const faltan = (inicio - ahora) / MS_MIN
    const tocan = [...tiempos].sort((a, b) => a - b).filter((m) => faltan <= m && !yaAvisados.has(`${job.id}|${m}`))
    if (tocan.length === 0) continue
    // Si ya pasaron varios tiempos (se abrió la app tarde), se avisa el más corto y se dan por avisados los demás.
    salida.push({ clave: `${job.id}|${tocan[0]}`, jobId: job.id, minutos: tocan[0], inicio })
  }
  return salida
}

/** Las claves de todos los tiempos que ya pasaron para ese recordatorio (para no volver a avisar los más largos). */
export function clavesQueQuedanAvisadas(r: Recordatorio, tiempos: readonly number[] = CONFIG.recordatoriosReservaMin): string[] {
  return tiempos.filter((m) => m >= r.minutos).map((m) => `${r.jobId}|${m}`)
}
