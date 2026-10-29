/**
 * Pago intermediado MANUAL, AL FINAL del paseo. La familia le paga a Patitas cuando termina el paseo, le muestra el
 * pago al paseador y este toca «Vi el pago». Después el equipo confirma en SU cuenta que el dinero llegó, descuenta su
 * comisión y le paga al paseador. La app NO mueve dinero: solo lleva el registro de en qué va cada pago.
 *
 *   sin_pagar ──paseador «Vi el pago»──▶ visto ──equipo «Pagado al paseador»──▶ pagado_paseador
 *        ▲                                 │
 *        └──── no_encontrado ◀─────────────┘  (el equipo no ve el dinero en su cuenta: nota y caso)
 *
 * El pago NO condiciona el paseo: ni la reserva ni la salida del paseador esperan un pago. Lo único que depende del
 * pago es reservar OTRO paseo (mientras haya uno sin pagar, no se puede) y que el equipo le pague al paseador.
 * «Visto» es la palabra del paseador: el equipo todavía tiene que confirmarlo en su cuenta antes de pagar.
 * Los montos son una FOTO del momento de la reserva (si cambia la comisión, los pagos viejos no se mueven).
 * Funciones puras: no leen la hora ni guardan nada. El almacén está en `lib/datos/`.
 */
import { desgloseDePago } from './config'
import type { EstadoPaseo } from './paseo'
import type { Booking } from './types'

export type EstadoPago = 'sin_pagar' | 'visto' | 'no_encontrado' | 'pagado_paseador'

export interface Pago {
  /** Es el id del encargo: un pago por paseo. */
  id: string
  walkerId: string
  /** Nombre de pila del paseador y del dueño (para que el equipo sepa de quién es). */
  paseador: string
  dueno: string
  perro: string
  /** «Hoy · 10:00 am». */
  cuando: string
  /** Lo que paga la familia a Patitas. */
  monto: number
  /** Lo que se queda Patitas. */
  comision: number
  /** Lo que recibe el paseador. */
  neto: number
  creado: number
  estado: EstadoPago
  /** Cuándo se supo que el paseo terminó (desde ahí corre el plazo `horasParaPagar`). */
  hechoAt?: number
  /** El paseador tocó «Vi el pago». */
  vistoAt?: number
  /** La hora del pago que el paseador anotó (opcional, texto corto). */
  horaPago?: string
  noEncontradoAt?: number
  pagadoPaseadorAt?: number
  /** La nota del equipo (obligatoria al decir «No lo encuentro»). */
  nota?: string
  /** Lo último que se supo del paseo (lo sincroniza la app mientras está abierta). */
  paseo: EstadoPaseo
  /** Es un pago de demostración: el paseador es de ejemplo. Nunca es plata real. */
  demo?: boolean
}

export const ESTADOS_PAGO: readonly EstadoPago[] = ['sin_pagar', 'visto', 'no_encontrado', 'pagado_paseador']

export type AccionPago = 'ver_pago' | 'no_encontrado' | 'pagar_al_paseador'
export type ActorPago = 'paseador' | 'equipo'

interface TransicionPago {
  accion: AccionPago
  de: readonly EstadoPago[]
  a: EstadoPago
  quien: ActorPago
  /** Cuándo se puede según cómo va el paseo (undefined = siempre). */
  paseo?: readonly EstadoPaseo[]
  pideNota?: boolean
}

/** Paseos que ya no van a ocurrir: no hay nada que pagar. */
export const PASEO_NO_OCURRIO: readonly EstadoPaseo[] = ['rechazado', 'expirado', 'cancelado']
/** Paseos en los que el perro ya fue entregado: ahí toca pagar. */
export const PASEO_HECHO: readonly EstadoPaseo[] = ['entregado', 'cerrado']

/** La tabla de lo que se puede hacer. Lo que no está aquí no se puede. Nada de pagar antes del paseo. */
export const TRANSICIONES_PAGO: readonly TransicionPago[] = [
  { accion: 'ver_pago', de: ['sin_pagar', 'no_encontrado'], a: 'visto', quien: 'paseador', paseo: PASEO_HECHO },
  { accion: 'no_encontrado', de: ['visto'], a: 'no_encontrado', quien: 'equipo', pideNota: true },
  { accion: 'pagar_al_paseador', de: ['visto', 'no_encontrado'], a: 'pagado_paseador', quien: 'equipo', paseo: PASEO_HECHO },
]

export type ResultadoPago = { ok: true; pago: Pago } | { ok: false; motivo: string }

/** Un pago nuevo (sin pagar) con la foto de los montos de la reserva. */
export function nuevoPago(d: {
  jobId: string
  walkerId: string
  paseador: string
  dueno: string
  perro: string
  cuando: string
  reserva: Pick<Booking, 'walkPrice' | 'discount' | 'total' | 'comision' | 'neto'>
  at: number
  paseo: EstadoPaseo
  demo?: boolean
}): Pago {
  const { monto, comision, neto } = desgloseDePago(d.reserva)
  return {
    id: d.jobId,
    walkerId: d.walkerId,
    paseador: d.paseador,
    dueno: d.dueno,
    perro: d.perro,
    cuando: d.cuando,
    monto,
    comision,
    neto,
    creado: d.at,
    estado: 'sin_pagar',
    paseo: d.paseo,
    ...(d.demo ? { demo: true } : {}),
  }
}

/** Intenta una acción. No lanza: devuelve el pago nuevo o el motivo por el que no se pudo. */
export function intentarPago(
  p: Pago,
  accion: AccionPago,
  quien: ActorPago,
  at: number,
  datos: { nota?: string; hora?: string } = {},
): ResultadoPago {
  const t = TRANSICIONES_PAGO.find((x) => x.accion === accion)
  if (!t) return { ok: false, motivo: `Acción desconocida: ${accion}` }
  if (!t.de.includes(p.estado)) return { ok: false, motivo: `No se puede «${accion}» con el pago «${p.estado}».` }
  if (t.quien !== quien) return { ok: false, motivo: `«${accion}» no lo puede hacer: ${quien}.` }
  if (t.paseo && !t.paseo.includes(p.paseo)) return { ok: false, motivo: `No se puede «${accion}» con el paseo «${p.paseo}».` }
  const nota = datos.nota?.trim() ?? ''
  if (t.pideNota && nota.length < 3) return { ok: false, motivo: 'La nota es obligatoria.' }
  const base = { ...p, estado: t.a }
  switch (accion) {
    case 'ver_pago': {
      const hora = datos.hora?.trim().slice(0, 20)
      return { ok: true, pago: { ...base, vistoAt: at, ...(hora ? { horaPago: hora } : {}), nota: undefined, noEncontradoAt: undefined } }
    }
    case 'no_encontrado':
      return { ok: true, pago: { ...base, noEncontradoAt: at, nota } }
    case 'pagar_al_paseador':
      return { ok: true, pago: { ...base, pagadoPaseadorAt: at } }
  }
}

/* ------------------------------------------------------------------ */
/* Lo que se pregunta sobre un pago                                     */
/* ------------------------------------------------------------------ */

/** ¿El paseador ya vio el pago? (Todavía falta que el equipo lo confirme en su cuenta.) */
export const pagoVistoPorPaseador = (p: Pago | null | undefined): boolean => p?.estado === 'visto' || p?.estado === 'pagado_paseador'

/** ¿Ya le pagaron al paseador? */
export const pagadoAlPaseador = (p: Pago | null | undefined): boolean => p?.estado === 'pagado_paseador'

/** ¿El paseo terminó y la familia todavía no le mostró el pago al paseador? */
export const debeLaFamilia = (p: Pago | null | undefined): boolean =>
  !!p && (p.estado === 'sin_pagar' || p.estado === 'no_encontrado') && PASEO_HECHO.includes(p.paseo)

/** ¿Es un paseo que no se hizo (rechazado, vencido o cancelado)? Ahí no hay nada que pagar. */
export const noHayQuePagar = (p: Pago | null | undefined): boolean => !!p && PASEO_NO_OCURRIO.includes(p.paseo)

/** ¿Pasó el plazo de pago (`horas`, de lib/config.ts) desde que terminó el paseo? Solo para un recordatorio suave. */
export function plazoDePagoVencido(p: Pago | null | undefined, ahora: number, horas: number): boolean {
  if (!p || !debeLaFamilia(p) || p.hechoAt === undefined || ahora <= 0) return false
  return ahora - p.hechoAt >= horas * 60 * 60_000
}

/** El primer pago que la familia debe (si lo hay): mientras exista, no se puede reservar otro paseo. */
export const pagoPendiente = (lista: readonly Pago[]): Pago | null => lista.find((p) => debeLaFamilia(p)) ?? null

/* ------------------------------------------------------------------ */
/* El libro de pagos (la lista que lee /admin)                          */
/* ------------------------------------------------------------------ */

export const pagoDe = (lista: readonly Pago[], jobId: string | null | undefined): Pago | null => (jobId ? (lista.find((p) => p.id === jobId) ?? null) : null)

/** Agrega el pago de un paseo (uno solo por paseo: si ya está, no lo repite ni lo pisa). */
export function agregarPago(lista: readonly Pago[], nuevo: Pago): Pago[] {
  return lista.some((p) => p.id === nuevo.id) ? [...lista] : [...lista, nuevo]
}

/** Cambia un pago de la lista con una función. Si ya no existe o no cambia, devuelve la misma lista. */
export function actualizarPago(lista: readonly Pago[], id: string, fn: (p: Pago) => Pago): Pago[] {
  let cambio = false
  const nueva = lista.map((p) => {
    if (p.id !== id) return p
    const n = fn(p)
    if (n !== p) cambio = true
    return n
  })
  return cambio ? nueva : (lista as Pago[])
}

/** Anota cómo va el paseo y, la primera vez que termina, la hora (`at`) desde la que corre el plazo de pago. */
export function sincronizarPaseo(lista: readonly Pago[], id: string, paseo: EstadoPaseo, at = 0): Pago[] {
  return actualizarPago(lista, id, (p) => {
    const hechoAt = PASEO_HECHO.includes(paseo) && p.hechoAt === undefined && at > 0 ? at : p.hechoAt
    return p.paseo === paseo && hechoAt === p.hechoAt ? p : { ...p, paseo, ...(hechoAt !== undefined ? { hechoAt } : {}) }
  })
}

/** Pagos que el paseador ya vio: toca confirmarlos en la cuenta del equipo y pagarle al paseador. */
export const porPagarAlPaseador = (lista: readonly Pago[]): Pago[] => lista.filter((p) => p.estado === 'visto').sort((a, b) => (a.vistoAt ?? 0) - (b.vistoAt ?? 0))

/** Pagos que el equipo no encontró en su cuenta (siguen abiertos hasta que aparezcan o se resuelva el caso). */
export const noEncontrados = (lista: readonly Pago[]): Pago[] => lista.filter((p) => p.estado === 'no_encontrado').sort((a, b) => (a.noEncontradoAt ?? 0) - (b.noEncontradoAt ?? 0))

/** Paseos hechos cuya familia todavía no le mostró el pago al paseador. */
export const sinPagar = (lista: readonly Pago[]): Pago[] => lista.filter((p) => p.estado === 'sin_pagar' && debeLaFamilia(p)).sort((a, b) => (a.hechoAt ?? a.creado) - (b.hechoAt ?? b.creado))

/** Lo que un paseador ya recibió y lo que le toca (plata que Patitas tiene que confirmar y pagarle). */
export function resumenDelPaseador(lista: readonly Pago[], walkerId: string): { recibido: number; porRecibir: number; pagos: number } {
  const suyos = lista.filter((p) => p.walkerId === walkerId)
  const suma = (xs: Pago[]) => Math.round(xs.reduce((s, p) => s + p.neto, 0) * 100) / 100
  const pagados = suyos.filter((p) => p.estado === 'pagado_paseador')
  const pendientes = suyos.filter((p) => (p.estado === 'visto' || p.estado === 'no_encontrado') && !PASEO_NO_OCURRIO.includes(p.paseo))
  return { recibido: suma(pagados), porRecibir: suma(pendientes), pagos: pagados.length }
}

/* ------------------------------------------------------------------ */
/* Datos guardados de versiones anteriores                              */
/* ------------------------------------------------------------------ */

const PASEOS: readonly string[] = ['solicitado', 'aceptado', 'rechazado', 'expirado', 'en_camino', 'en_paseo', 'entregado', 'cerrado', 'cancelado', 'en_disputa']
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
const txt = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined)

/**
 * Lee un pago guardado, también de cuando el pago era antes del paseo («en_revision», «verificado», «devuelto»).
 * Un estado viejo se traduce al nuevo; lo que no se entiende se descarta (null). Nunca lanza.
 */
export function normalizarPago(x: unknown): Pago | null {
  if (!x || typeof x !== 'object') return null
  const o = x as Record<string, unknown>
  const id = txt(o.id)
  const paseo = txt(o.paseo)
  const monto = num(o.monto)
  if (!id || !paseo || !PASEOS.includes(paseo) || monto === undefined) return null
  const p = paseo as EstadoPaseo
  const e = txt(o.estado)
  const estado: EstadoPago =
    e === 'pagado_paseador' ? 'pagado_paseador' : e === 'no_encontrado' ? 'no_encontrado' : e === 'visto' ? 'visto' : e === 'verificado' && PASEO_HECHO.includes(p) ? 'visto' : 'sin_pagar'
  const vistoAt = num(o.vistoAt) ?? (e === 'verificado' ? num(o.verificadoAt) : undefined)
  const hechoAt = num(o.hechoAt)
  const noEncontradoAt = num(o.noEncontradoAt)
  const pagadoPaseadorAt = num(o.pagadoPaseadorAt)
  const horaPago = txt(o.horaPago)
  const nota = estado === 'no_encontrado' ? txt(o.nota) : undefined
  return {
    id,
    walkerId: txt(o.walkerId) ?? '',
    paseador: txt(o.paseador) ?? '',
    dueno: txt(o.dueno) ?? '',
    perro: txt(o.perro) ?? '',
    cuando: txt(o.cuando) ?? '',
    monto,
    comision: num(o.comision) ?? 0,
    neto: num(o.neto) ?? 0,
    creado: num(o.creado) ?? 0,
    estado,
    paseo: p,
    ...(hechoAt !== undefined ? { hechoAt } : {}),
    ...(vistoAt !== undefined && estado !== 'sin_pagar' ? { vistoAt } : {}),
    ...(horaPago ? { horaPago } : {}),
    ...(noEncontradoAt !== undefined && estado === 'no_encontrado' ? { noEncontradoAt } : {}),
    ...(pagadoPaseadorAt !== undefined && estado === 'pagado_paseador' ? { pagadoPaseadorAt } : {}),
    ...(nota ? { nota } : {}),
    ...(o.demo === true ? { demo: true } : {}),
  }
}

/** La lista guardada, ya normalizada. Si no es una lista, está vacía. */
export function normalizarPagos(v: unknown): Pago[] {
  return Array.isArray(v) ? v.map(normalizarPago).filter((p): p is Pago => p !== null) : []
}
