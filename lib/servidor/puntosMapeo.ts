/**
 * Los puntos de control con el servidor (paso 9): el INICIO y el FIN del paseo con su ubicación van a la tabla
 * `puntos_control`; las fotos (los demás puntos de control) ya viajan en `fotos` con la suya. Funciones puras.
 *
 * NO es seguimiento continuo ni «en vivo»: un paseo tiene a lo sumo un inicio y un fin, y cada foto lleva su lugar. La memoria
 * del motor de avisos (`vigilancia`: la última lectura y lo reciente) NO sube nunca: se queda en el teléfono.
 * Sin ubicación se anota el motivo, como hoy. La hora y el lugar los pone el teléfono: son señales.
 */
import type { PuntoControl, TipoPuntoGuardado } from '../puntosControl'
import type { SinUbicacion } from '../fotos'
import { ubicacionParaServidor } from './fotosMapeo'
import { uuidDe } from './paseosMapeo'
import type { FilaCruda, FilaPuntoNueva } from './paseosTipos'

const TIPOS: readonly TipoPuntoGuardado[] = ['inicio', 'fin']
const MOTIVOS: readonly string[] = ['negada', 'omitida', 'no_disponible', 'sin_lectura']
const texto = (v: unknown): string => (typeof v === 'string' ? v : '')
const numero = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** El id de la fila: sale siempre igual del paseo y el tipo, así guardar el mismo punto dos veces no lo duplica. */
export const idDePunto = (paseoId: string, tipo: TipoPuntoGuardado): string => uuidDe(`punto:${paseoId}:${tipo}`)

/** La fila de `puntos_control`. Una lectura vieja o de demostración no sube como lugar (igual que en las fotos). */
export function filaDePunto(paseoId: string, p: PuntoControl): FilaPuntoNueva {
  const u = ubicacionParaServidor(p)
  return { id: idDePunto(paseoId, p.tipo), paseo_id: paseoId, tipo: p.tipo, en: new Date(p.t).toISOString(), lat: u.lat, lng: u.lng, precision_m: u.precision_m, sin_ubicacion: u.sin_ubicacion }
}

/** Una fila de la base como punto de control de la app. null si no se entiende. */
export function puntoDeFila(f: FilaCruda): { paseoId: string; punto: PuntoControl } | null {
  const paseoId = texto(f.paseo_id)
  const tipo = TIPOS.find((t) => t === f.tipo)
  const t = Date.parse(texto(f.en))
  if (!paseoId || !tipo || !Number.isFinite(t)) return null
  const lat = numero(f.lat)
  const lng = numero(f.lng)
  const conLugar = lat !== null && lng !== null
  const motivo = texto(f.sin_ubicacion)
  return {
    paseoId,
    punto: {
      tipo,
      t,
      ubicacion: conLugar ? { pos: [lat, lng], lecturaT: t, ...(numero(f.precision_m) !== null ? { precisionM: numero(f.precision_m) as number } : {}) } : null,
      ...(conLugar ? {} : { sinUbicacion: (MOTIVOS.includes(motivo) ? motivo : 'sin_lectura') as SinUbicacion }),
    },
  }
}

/** Los puntos que bajó la base, por paseo: uno por tipo (si hubiera dos, vale el primero). */
export function puntosDeFilas(filas: readonly FilaCruda[]): Map<string, PuntoControl[]> {
  const mapa = new Map<string, PuntoControl[]>()
  for (const f of filas) {
    const x = puntoDeFila(f)
    if (!x) continue
    const lista = mapa.get(x.paseoId) ?? []
    if (!lista.some((p) => p.tipo === x.punto.tipo)) lista.push(x.punto)
    mapa.set(x.paseoId, lista)
  }
  return mapa
}

/** Los puntos de este teléfono y los de la base juntos: uno por tipo, y manda el del teléfono (que se ve al instante y sin internet). */
export function mezclarPuntos(locales: readonly PuntoControl[] | undefined, remotos: readonly PuntoControl[] | undefined): PuntoControl[] | undefined {
  const lista: PuntoControl[] = []
  for (const tipo of TIPOS) {
    const p = locales?.find((x) => x.tipo === tipo) ?? remotos?.find((x) => x.tipo === tipo)
    if (p) lista.push(p)
  }
  return lista.length > 0 ? lista : undefined
}

/** Los puntos de este teléfono que la base todavía no tiene (`enBase`: los ids de fila que ya bajó). */
export function puntosPorSubir(paseoId: string, locales: readonly PuntoControl[] | undefined, enBase: ReadonlySet<string>): PuntoControl[] {
  return (locales ?? []).filter((p) => TIPOS.includes(p.tipo) && !enBase.has(idDePunto(paseoId, p.tipo)))
}
