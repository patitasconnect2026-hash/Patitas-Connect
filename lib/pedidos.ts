/**
 * «Pedir paseo» estilo InDrive (Bloque 2). Funciones PURAS: la familia pide (día, hora, duración, perro y cuánto pagaría por UNA hora),
 * el pedido llega a los paseadores aprobados, disponibles y de su zona, cada uno acepta o manda UNA contraoferta de más dinero, y la
 * familia elige. Al elegir nace el paseo de siempre. Los montos y tiempos salen de lib/config.ts. En modo local y en la demostración
 * las ofertas las inventa `ofertasDeDemostracion` (marcadas «Demostración»).
 */
import { CONFIG } from './config'
import { SPOTS, type LatLng } from './geo'
import { distanciaMetros } from './zona'
import type { Dog, District, Walker } from './types'
import { walkerFits } from './schedule'

export type EstadoPedido = 'abierto' | 'con_ofertas' | 'elegido' | 'vencido' | 'cancelado'

export interface OfertaPedido {
  id: string
  paseadorId: string
  nombre: string
  /** Soles por hora. */
  monto: number
  tipo: 'acepta' | 'contraoferta'
  estado: 'enviada' | 'elegida' | 'descartada'
  /** Inventada para la demostración. */
  demo?: boolean
}

export interface Pedido {
  id: string
  creadoAt: number
  expiraAt: number
  /** Cuándo empieza el paseo (ms). */
  inicioAt: number
  slotLabel: string
  dayIdx: number
  startHour: number
  durationMin: number
  dog: Dog
  /** Lo que la familia pagaría por UNA hora. */
  montoHora: number
  distrito: District
  /** Parques cercanos a la casa (dentro de `radioPedidoMetros`). Vacío = todo el distrito. */
  parques: string[]
  /** La casa (punto de recojo). Solo la familia lo ve. */
  punto: LatLng | null
  estado: EstadoPedido
  ofertas: OfertaPedido[]
  /** Cuántos paseadores lo vieron y cuántos hay disponibles en su zona (solo cifras, nunca nombres). */
  vistos: number
  disponibles: number
  paseoId?: string
}

export const ESTADOS_ACTIVOS: readonly EstadoPedido[] = ['abierto', 'con_ofertas']

export const montoValido = (m: number): boolean => Number.isFinite(m) && m >= CONFIG.tarifaMinima && m <= CONFIG.tarifaMaxima

/** El monto con un sol más (sin pasar el tope) o con uno menos (sin bajar del mínimo). */
export const subirMonto = (m: number): number => Math.min(CONFIG.tarifaMaxima, Math.round(m) + 1)
export const bajarMonto = (m: number): number => Math.max(CONFIG.tarifaMinima, Math.round(m) - 1)

const MS_MIN = 60_000
const DIA_MS = 24 * 60 * MS_MIN
const LIMA_UTC = 5 * 60 * MS_MIN

/** Cuándo empieza un horario elegido (día contado desde hoy, hora de Lima) en ms. */
export function inicioDeSlot(dayIdx: number, hour: number, ahora: number): number {
  const lima = ahora - LIMA_UTC
  const medianoche = lima - (((lima % DIA_MS) + DIA_MS) % DIA_MS) + LIMA_UTC
  return medianoche + dayIdx * DIA_MS + hour * 60 * MS_MIN
}

/** Cuántos días (de Lima) faltan desde `ahora` hasta `inicio`: 0 = hoy, 1 = mañana. Es el `dayIdx` de una reserva. */
export function diaDesdeHoy(inicio: number, ahora: number): number {
  const dia = (t: number) => Math.floor((t - LIMA_UTC) / DIA_MS)
  return Math.max(0, dia(inicio) - dia(ahora))
}

/** El `dayIdx` de la reserva de este pedido, contado desde HOY (el pedido pudo hacerse un rato antes). */
export const diaDelPedido = (p: Pedido): number => diaDesdeHoy(p.inicioAt, Date.now())

/** El paseo no puede empezar antes de que el pedido venza, ni dentro de más de una semana. */
export function inicioValido(inicio: number, ahora: number, vidaMin: number = CONFIG.minutosVidaPedido): boolean {
  return inicio > ahora + vidaMin * MS_MIN && inicio <= ahora + 8 * DIA_MS
}

/** Los parques (ids) a `radio` metros o menos del punto, del mismo distrito. */
export function parquesCerca(punto: LatLng, distrito: District, radio: number = CONFIG.radioPedidoMetros): string[] {
  return SPOTS.filter((s) => s.district === distrito && distanciaMetros(punto, s.pos) <= radio).map((s) => s.id)
}

export interface EntradaPedido {
  id: string
  dog: Dog
  dayIdx: number
  startHour: number
  slotLabel: string
  durationMin: number
  montoHora: number
  distrito: District
  punto: LatLng | null
  ahora: number
}

/** Un pedido nuevo (abierto) o el motivo por el que no se puede pedir. */
export function crearPedido(i: EntradaPedido): { ok: true; pedido: Pedido } | { ok: false; motivo: 'monto' | 'hora' | 'perro' } {
  if (!montoValido(i.montoHora)) return { ok: false, motivo: 'monto' }
  const inicioAt = inicioDeSlot(i.dayIdx, i.startHour, i.ahora)
  if (!inicioValido(inicioAt, i.ahora)) return { ok: false, motivo: 'hora' }
  if (i.dog.rpp) return { ok: false, motivo: 'perro' }
  return {
    ok: true,
    pedido: {
      id: i.id,
      creadoAt: i.ahora,
      expiraAt: i.ahora + CONFIG.minutosVidaPedido * MS_MIN,
      inicioAt,
      slotLabel: i.slotLabel,
      dayIdx: i.dayIdx,
      startHour: i.startHour,
      durationMin: i.durationMin,
      dog: i.dog,
      montoHora: i.montoHora,
      distrito: i.distrito,
      parques: i.punto ? parquesCerca(i.punto, i.distrito) : [],
      punto: i.punto,
      estado: 'abierto',
      ofertas: [],
      vistos: 0,
      disponibles: 0,
    },
  }
}

/** El estado de ahora: un pedido activo que pasó de hora se ve «vencido» aunque nadie lo haya marcado todavía. */
export function estadoDe(p: Pedido, ahora: number): EstadoPedido {
  return ESTADOS_ACTIVOS.includes(p.estado) && ahora >= p.expiraAt ? 'vencido' : p.estado
}

export const segundosQueFaltan = (p: Pedido, ahora: number): number => Math.max(0, Math.ceil((p.expiraAt - ahora) / 1000))

/** ¿Se puede ofertar este monto? Acepta el pedido tal cual, o más dinero hasta el tope (UNA sola vez: sin regateo). */
export function ofertaValida(montoPedido: number, monto: number): boolean {
  return Number.isFinite(monto) && monto >= montoPedido && monto <= CONFIG.tarifaMaxima
}

export const tipoDeOferta = (montoPedido: number, monto: number): OfertaPedido['tipo'] => (monto === montoPedido ? 'acepta' : 'contraoferta')

/** Elegir una oferta: ella queda elegida y las demás se descartan (con aviso amable). */
export function elegirOferta(p: Pedido, ofertaId: string): Pedido {
  if (!p.ofertas.some((o) => o.id === ofertaId && o.estado === 'enviada')) return p
  return { ...p, estado: 'elegido', ofertas: p.ofertas.map((o) => (o.estado !== 'enviada' ? o : { ...o, estado: o.id === ofertaId ? 'elegida' : 'descartada' })) }
}

export const cancelarPedido = (p: Pedido): Pedido => (ESTADOS_ACTIVOS.includes(p.estado) ? { ...p, estado: 'cancelado', ofertas: p.ofertas.map((o) => (o.estado === 'enviada' ? { ...o, estado: 'descartada' as const } : o)) } : p)

/**
 * Ofertas inventadas para la demostración: a los pocos segundos, cada paseador de ejemplo compatible (distrito, tamaño, hora y
 * disponible) acepta al monto o, uno de ellos, manda una contraoferta de 2 soles más. Siempre marcadas `demo`.
 */
export function ofertasDeDemostracion(p: Pedido, walkers: readonly Walker[], ahora: number): OfertaPedido[] {
  const posibles = walkers
    .filter((w) => w.esEjemplo && w.disponible !== false && w.district === p.distrito && walkerFits(w, p.dog) && w.windows.some(([a, b]) => p.startHour >= a && p.startHour < b))
    .slice(0, 3)
  const ofertas: OfertaPedido[] = []
  posibles.forEach((w, i) => {
    if (ahora < p.creadoAt + (4 + i * 6) * 1000) return
    const contra = i === 1
    const monto = contra ? Math.min(CONFIG.tarifaMaxima, p.montoHora + 2) : p.montoHora
    ofertas.push({ id: `${p.id}:${w.id}`, paseadorId: w.id, nombre: w.firstName, monto, tipo: tipoDeOferta(p.montoHora, monto), estado: 'enviada', demo: true })
  })
  return ofertas
}

/** Une las ofertas que ya tiene el pedido con las de la demostración que ya tocan (sin repetir ni pisar las elegidas o descartadas). */
export function conOfertasDeDemostracion(p: Pedido, walkers: readonly Walker[], ahora: number): Pedido {
  if (!ESTADOS_ACTIVOS.includes(estadoDe(p, ahora))) return p
  const nuevas = ofertasDeDemostracion(p, walkers, ahora).filter((o) => !p.ofertas.some((x) => x.id === o.id))
  if (nuevas.length === 0) return p
  const ofertas = [...p.ofertas, ...nuevas]
  const disponibles = Math.max(p.disponibles, ofertas.length)
  return { ...p, estado: 'con_ofertas', ofertas, vistos: Math.max(p.vistos, ofertas.length), disponibles }
}
