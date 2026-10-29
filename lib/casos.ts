/**
 * Reportes y casos para el equipo (Tarea 4). Funciones puras.
 *
 *  - «Reportar problema»: dueño o paseador, con un motivo corto, un texto corto y una foto opcional.
 *    El paseo pasa a «en_disputa» y el caso aparece en la cola de /admin.
 *  - «Entrega sin confirmar»: el dueño no confirmó a tiempo. NO se confirma sola: el equipo la mira.
 *  - «Pago no encontrado»: el equipo no ve el dinero en su cuenta (o la familia/paseador reporta un problema con el
 *    pago). El pago es DESPUÉS del paseo: este caso no mueve el estado del paseo.
 *  - La app no mueve dinero: no hay reembolsos automáticos. El equipo resuelve a mano (paga o devuelve en /admin,
 *    lib/pagos.ts) y deja una nota.
 */
import type { Job } from './bus'
import { esPaseadorDeEjemplo } from './ejemplos'
import type { EstadoPago, Pago } from './pagos'
import type { EstadoPaseo, EventoPaseo } from './paseo'

export type MotivoReporte = 'pago' | 'entrega' | 'trato' | 'otro'

export const MOTIVOS: ReadonlyArray<{ id: MotivoReporte; etiqueta: string }> = [
  { id: 'pago', etiqueta: 'Pago' },
  { id: 'entrega', etiqueta: 'Entrega' },
  { id: 'trato', etiqueta: 'Trato' },
  { id: 'otro', etiqueta: 'Otro' },
]

export const MAX_TEXTO_REPORTE = 280

export type QuienReporta = 'dueno' | 'paseador'

export interface Reporte {
  quien: QuienReporta
  motivo: MotivoReporte
  texto: string
  /** Foto opcional (imagen reducida). */
  foto?: string
  at: number
}

export type TipoCaso = 'disputa' | 'entrega_sin_confirmar' | 'pago'

export interface Resolucion {
  /**
   * Qué hizo el equipo: cerró el paseo o lo anuló. No existe «dejarlo como estaba»: un reporte siempre termina en
   * un estado final (si no, el paseo y las dos personas quedarían esperando para siempre).
   */
  como: 'cerrado' | 'cancelado'
  nota: string
  at: number
}

export interface Caso {
  id: string
  jobId: string
  tipo: TipoCaso
  reporte?: Reporte
  perro: string
  paseador: string
  dueno: string
  estadoPaseo: EstadoPaseo
  /** Cómo iba el pago de este paseo (`sin_registro` = no hay pago en el libro). */
  pagoEstado: EstadoPago | 'sin_registro'
  /** Lo que paga la familia, para que el equipo decida sin abrir otra cosa. */
  monto?: number
  /** Copia del registro del paseo al abrir el caso (hora, quién y qué). */
  registro?: EventoPaseo[]
  abiertoAt: number
  resolucion?: Resolucion
  /** El paseador es uno de ejemplo (demostración): lleva la etiqueta «Ejemplo» y se puede ocultar. */
  ejemplo?: boolean
}

/** null si el reporte vale; si no, qué falta (en lenguaje simple). */
export function validarReporte(r: { motivo?: MotivoReporte | null; texto: string }): string | null {
  if (!r.motivo || !MOTIVOS.some((m) => m.id === r.motivo)) return 'Elige qué pasó.'
  const t = r.texto.trim()
  if (t.length < 3) return 'Cuenta en pocas palabras qué pasó.'
  if (t.length > MAX_TEXTO_REPORTE) return `Máximo ${MAX_TEXTO_REPORTE} letras.`
  return null
}

export function etiquetaMotivo(m: MotivoReporte): string {
  return MOTIVOS.find((x) => x.id === m)?.etiqueta ?? 'Otro'
}

function base(job: Job, tipo: TipoCaso, at: number, pago?: Pago | null): Caso {
  return {
    id: `${tipo}-${job.id}`,
    jobId: job.id,
    tipo,
    perro: job.dog.name,
    paseador: job.walkerFirst,
    dueno: job.ownerFirst,
    estadoPaseo: job.paseo.estado,
    pagoEstado: pago?.estado ?? 'sin_registro',
    monto: pago?.monto ?? job.reserva?.total ?? job.walkerPay,
    registro: job.paseo.eventos,
    abiertoAt: at,
    ...(esPaseadorDeEjemplo(job.walkerId) ? { ejemplo: true } : {}),
  }
}

export function casoDeReporte(job: Job, reporte: Reporte, pago?: Pago | null): Caso {
  return { ...base(job, 'disputa', reporte.at, pago), reporte }
}

export function casoEntregaSinConfirmar(job: Job, at: number, pago?: Pago | null): Caso {
  return base(job, 'entrega_sin_confirmar', at, pago)
}

/**
 * Un problema con el pago de un paseo ya hecho. Se arma desde el pago (no hace falta el encargo: el equipo lo abre aunque
 * la familia ya haya pedido otro paseo). Si lo reporta alguien, va el `reporte`; si lo abre el equipo, la nota del pago.
 */
export function casoDePago(pago: Pago, at: number, reporte?: Reporte): Caso {
  return {
    id: `pago-${pago.id}`,
    jobId: pago.id,
    tipo: 'pago',
    perro: pago.perro,
    paseador: pago.paseador,
    dueno: pago.dueno,
    estadoPaseo: pago.paseo,
    pagoEstado: pago.estado,
    monto: pago.monto,
    abiertoAt: at,
    ...(reporte ? { reporte } : {}),
    ...(esPaseadorDeEjemplo(pago.walkerId) ? { ejemplo: true } : {}),
  }
}

/** Agrega un caso a la cola. No repite un caso del mismo paseo y tipo que ya está abierto (salvo para sumarle el reporte). */
export function abrirCaso(casos: Caso[], nuevo: Caso): Caso[] {
  const abierto = casos.find((c) => c.id === nuevo.id && !c.resolucion)
  if (abierto) return nuevo.reporte && !abierto.reporte ? casos.map((c) => (c === abierto ? { ...abierto, reporte: nuevo.reporte } : c)) : casos
  return [...casos.filter((c) => c.id !== nuevo.id), nuevo]
}

export const abiertos = (casos: Caso[]) => casos.filter((c) => !c.resolucion)
export const resueltos = (casos: Caso[]) => casos.filter((c) => !!c.resolucion)

export type ResultadoResolver = { ok: true; casos: Caso[] } | { ok: false; motivo: string }

/** El equipo resuelve un caso a mano. La nota es obligatoria (queda en el registro). */
export function resolverCaso(casos: Caso[], id: string, como: Resolucion['como'], nota: string, at: number): ResultadoResolver {
  const c = casos.find((x) => x.id === id)
  if (!c) return { ok: false, motivo: 'No existe ese caso.' }
  if (c.resolucion) return { ok: false, motivo: 'Ese caso ya está resuelto.' }
  if (nota.trim().length < 3) return { ok: false, motivo: 'La nota es obligatoria.' }
  return { ok: true, casos: casos.map((x) => (x.id === id ? { ...x, resolucion: { como, nota: nota.trim(), at } } : x)) }
}
