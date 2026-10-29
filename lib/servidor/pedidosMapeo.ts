/** «Pedir paseo» con el servidor: de las filas de la base al pedido de la app y al revés. Funciones puras. */
import type { Pedido, OfertaPedido, EstadoPedido } from '../pedidos'
import type { Dog, District } from '../types'
import type { ArgsCrearPedido } from './clientePedidos'
import { uuidDe } from './paseosMapeo'
import type { FilaCruda } from './paseosTipos'

const t = (v: unknown): string => (typeof v === 'string' ? v : '')
const n = (v: unknown): number => {
  const x = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  return Number.isFinite(x) ? x : 0
}
const ESTADOS: readonly EstadoPedido[] = ['abierto', 'con_ofertas', 'elegido', 'vencido', 'cancelado']
const DISTRITOS: readonly District[] = ['San Isidro', 'Jesús María']

export function ofertaDeFila(f: FilaCruda): OfertaPedido | null {
  const id = t(f.id)
  const paseadorId = t(f.paseador_id)
  if (!id || !paseadorId) return null
  const estado = f.estado === 'elegida' ? 'elegida' : f.estado === 'descartada' ? 'descartada' : 'enviada'
  return { id, paseadorId, nombre: t(f.paseador_nombre), monto: n(f.monto_hora), tipo: f.tipo === 'acepta' ? 'acepta' : 'contraoferta', estado }
}

/** El pedido de la familia tal como lo guardó la base. `perros`: sus perros de este teléfono (para recuperar el completo). */
export function pedidoDeFila(f: FilaCruda, ofertas: readonly FilaCruda[], vistos: number, disponibles: number, perros: readonly Dog[], sesionId: string): Pedido | null {
  const id = t(f.id)
  const estado = ESTADOS.find((e) => e === f.estado)
  const distrito = DISTRITOS.find((d) => d === f.distrito)
  const inicioAt = Date.parse(t(f.inicio))
  const expiraAt = Date.parse(t(f.expira_en))
  const creadoAt = Date.parse(t(f.creado_en))
  if (!id || !estado || !distrito || !Number.isFinite(inicioAt) || !Number.isFinite(expiraAt) || !Number.isFinite(creadoAt)) return null
  const resumen = (f.perro && typeof f.perro === 'object' ? f.perro : {}) as Record<string, unknown>
  const dog = perros.find((d) => uuidDe(`${sesionId}:${d.id}`) === t(f.perro_id)) ?? perros.find((d) => d.name === t(resumen.name)) ?? ({ id: '', name: t(resumen.name) || 'Tu perro', breed: '', ageYears: 0, sex: 'M', size: 'small', fur: 'brown', shape: 'floppy', temperament: [], sociable: true, vaccinated: true, sterilized: false, rpp: false, notes: '', medical: '', vet: '' } as unknown as Dog)
  const lat = n(f.punto_lat)
  const lng = n(f.punto_lng)
  const horas = new Date(inicioAt).toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Lima' })
  return {
    id,
    creadoAt,
    expiraAt,
    inicioAt,
    slotLabel: t(f.horario),
    dayIdx: 0,
    startHour: Number(horas) % 24,
    durationMin: n(f.duracion_min) || 60,
    dog,
    montoHora: n(f.monto_hora),
    distrito,
    parques: Array.isArray(f.parques_cerca) ? (f.parques_cerca as unknown[]).filter((x): x is string => typeof x === 'string') : [],
    punto: lat || lng ? [lat, lng] : null,
    estado,
    ofertas: ofertas.map(ofertaDeFila).filter((o): o is OfertaPedido => o !== null),
    vistos,
    disponibles,
    ...(t(f.paseo_id) ? { paseoId: t(f.paseo_id) } : {}),
  }
}

/** Lo que se manda a la base para crear el pedido. */
export function argsDeCrear(p: Pedido, sesionId: string, vidaMin: number): ArgsCrearPedido {
  return {
    id: p.id,
    perroId: p.dog.id ? uuidDe(`${sesionId}:${p.dog.id}`) : null,
    perro: { name: p.dog.name, breed: p.dog.breed, size: p.dog.size },
    dueno: '',
    horario: p.slotLabel,
    inicio: new Date(p.inicioAt).toISOString(),
    duracion: p.durationMin,
    tamano: p.dog.size,
    lat: p.punto?.[0] ?? 0,
    lng: p.punto?.[1] ?? 0,
    parques: p.parques,
    monto: p.montoHora,
    vidaMin,
  }
}

/** Lo que ve el paseador de un pedido: solo distrito y zona aproximada. */
export interface PedidoParaPaseador {
  id: string
  dueno: string
  perro: string
  tamano: string
  slotLabel: string
  inicioAt: number
  durationMin: number
  distrito: string
  zona: [number, number]
  montoHora: number
  expiraAt: number
  miOferta: { monto: number; estado: string } | null
  ocupado: boolean
}

export function pedidoParaPaseador(f: FilaCruda): PedidoParaPaseador | null {
  const id = t(f.pedido_id)
  const expiraAt = Date.parse(t(f.expira_en))
  if (!id || !Number.isFinite(expiraAt)) return null
  return {
    id,
    dueno: t(f.dueno_nombre),
    perro: t(f.perro_nombre),
    tamano: t(f.tamano),
    slotLabel: t(f.horario),
    inicioAt: Date.parse(t(f.inicio)),
    durationMin: n(f.duracion_min),
    distrito: t(f.distrito),
    zona: [n(f.zona_lat), n(f.zona_lng)],
    montoHora: n(f.monto_hora),
    expiraAt,
    miOferta: f.mi_oferta_monto === null || f.mi_oferta_monto === undefined ? null : { monto: n(f.mi_oferta_monto), estado: t(f.mi_oferta_estado) },
    ocupado: f.ocupado === true,
  }
}
