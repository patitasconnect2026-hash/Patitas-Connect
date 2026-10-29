/**
 * Los casos y disputas con el servidor (paso 7b): del caso de la app a la fila de `casos` y al revés. Funciones puras.
 *
 *   - El caso lo abre la familia o el paseador de ese paseo (un reporte, o una entrega sin confirmar) o el equipo (un pago);
 *     el equipo los ve todos y SOLO el equipo los resuelve. La familia y el paseador ven los de su paseo.
 *   - La foto del reporte NO sube (hoy solo vive en el teléfono de quien reportó): el reporte lleva quién, el motivo, el texto
 *     y la hora.
 *   - El `id` de la fila es el mismo del caso (`<tipo>-<paseo>`): abrirlo dos veces es UN caso.
 */
import type { Caso, Reporte, Resolucion, TipoCaso } from '../casos'
import type { EstadoPago } from '../pagos'
import type { EstadoPaseo, EventoPaseo } from '../paseo'
import type { FilaCruda } from './paseosTipos'

const esObjeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const texto = (v: unknown): string => (typeof v === 'string' ? v : '')

const TIPOS: readonly TipoCaso[] = ['disputa', 'entrega_sin_confirmar', 'pago']
const ESTADOS_PASEO: readonly EstadoPaseo[] = ['solicitado', 'aceptado', 'rechazado', 'expirado', 'en_camino', 'en_paseo', 'entregado', 'cerrado', 'cancelado', 'en_disputa']
const ESTADOS_PAGO: readonly (EstadoPago | 'sin_registro')[] = ['sin_registro', 'sin_pagar', 'visto', 'no_encontrado', 'pagado_paseador']

/** La fila que se guarda en `casos`. */
export interface FilaCasoNueva {
  id: string
  paseo_id: string
  tipo: TipoCaso
  reporte: Record<string, unknown> | null
  perro: string
  paseador: string
  dueno: string
  estado_paseo: EstadoPaseo
  pago_estado: string | null
  monto: number | null
  registro: EventoPaseo[] | null
  abierto_en: string
  resolucion: Resolucion | null
  resuelto_en: string | null
}

/** El reporte sube sin la foto. */
export const reporteDeCaso = (r: Reporte): Record<string, unknown> => ({ quien: r.quien, motivo: r.motivo, texto: r.texto, at: r.at })

export function filaDeCaso(c: Caso): FilaCasoNueva {
  return {
    id: c.id,
    paseo_id: c.jobId,
    tipo: c.tipo,
    reporte: c.reporte ? reporteDeCaso(c.reporte) : null,
    perro: c.perro,
    paseador: c.paseador,
    dueno: c.dueno,
    estado_paseo: c.estadoPaseo,
    pago_estado: c.pagoEstado,
    monto: typeof c.monto === 'number' && Number.isFinite(c.monto) ? c.monto : null,
    registro: c.registro ?? null,
    abierto_en: new Date(c.abiertoAt).toISOString(),
    resolucion: c.resolucion ?? null,
    resuelto_en: c.resolucion ? new Date(c.resolucion.at).toISOString() : null,
  }
}

function reporteDeFila(v: unknown): Reporte | undefined {
  if (!esObjeto(v)) return undefined
  const quien = v.quien === 'paseador' ? 'paseador' : v.quien === 'dueno' ? 'dueno' : null
  const motivo = v.motivo === 'pago' || v.motivo === 'entrega' || v.motivo === 'trato' || v.motivo === 'otro' ? v.motivo : null
  const at = typeof v.at === 'number' && Number.isFinite(v.at) ? v.at : null
  if (!quien || !motivo || at === null) return undefined
  return { quien, motivo, texto: texto(v.texto), at }
}

function resolucionDeFila(v: unknown, resueltoEn: unknown): Resolucion | undefined {
  if (!esObjeto(v)) return undefined
  const como = v.como === 'cerrado' ? 'cerrado' : v.como === 'cancelado' ? 'cancelado' : null
  if (!como) return undefined
  const at = typeof v.at === 'number' && Number.isFinite(v.at) ? v.at : Date.parse(texto(resueltoEn))
  return { como, nota: texto(v.nota), at: Number.isFinite(at) ? at : 0 }
}

/** Una fila de `casos` como caso de la app. null si la fila no sirve. */
export function casoDeFila(f: FilaCruda): Caso | null {
  const id = texto(f.id)
  const jobId = texto(f.paseo_id)
  const tipo = TIPOS.find((t) => t === f.tipo)
  const abiertoAt = Date.parse(texto(f.abierto_en))
  if (!id || !jobId || !tipo || !Number.isFinite(abiertoAt)) return null
  const estadoPaseo = ESTADOS_PASEO.find((e) => e === f.estado_paseo) ?? 'en_disputa'
  const pagoEstado = ESTADOS_PAGO.find((e) => e === f.pago_estado) ?? 'sin_registro'
  const monto = typeof f.monto === 'number' ? f.monto : typeof f.monto === 'string' && f.monto.trim() !== '' && Number.isFinite(Number(f.monto)) ? Number(f.monto) : undefined
  const reporte = reporteDeFila(f.reporte)
  const resolucion = resolucionDeFila(f.resolucion, f.resuelto_en)
  return {
    id,
    jobId,
    tipo,
    ...(reporte ? { reporte } : {}),
    perro: texto(f.perro),
    paseador: texto(f.paseador),
    dueno: texto(f.dueno),
    estadoPaseo,
    pagoEstado,
    ...(monto !== undefined ? { monto } : {}),
    ...(Array.isArray(f.registro) ? { registro: f.registro as EventoPaseo[] } : {}),
    abiertoAt,
    ...(resolucion ? { resolucion } : {}),
  }
}

export const casosDeFilas = (filas: readonly FilaCruda[]): Caso[] => filas.map(casoDeFila).filter((c): c is Caso => c !== null).sort((a, b) => a.abiertoAt - b.abiertoAt)

export type CambioDeCaso = { reporte: Record<string, unknown> } | { resolucion: Resolucion; resuelto_en: string }

/**
 * Qué falta mandar de un caso que ya está en la base: el reporte (si la base no lo tiene todavía) o su resolución (si el
 * equipo lo resolvió aquí y la base aún no). null = nada. Un caso que la base ya resolvió no se vuelve a tocar.
 */
export function cambioParaLaBase(local: Caso, enBase: Caso): CambioDeCaso | null {
  if (enBase.resolucion) return null
  if (local.resolucion) return { resolucion: local.resolucion, resuelto_en: new Date(local.resolucion.at).toISOString() }
  if (local.reporte && !enBase.reporte) return { reporte: reporteDeCaso(local.reporte) }
  return null
}
