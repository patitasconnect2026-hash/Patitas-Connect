/**
 * Máquina de estados del paseo (Tarea 2). Funciones PURAS: no leen la hora ni guardan nada.
 * La pantalla del dueño, la del paseador y /admin leen el estado de aquí (nunca lo deducen aparte).
 *
 *   solicitado → aceptado → en_camino → en_paseo → entregado → cerrado
 *        ↘ rechazado   ↘ cancelado (desde solicitado, aceptado o en_camino)
 *        ↘ expirado                                  ↘ en_disputa → cerrado | cancelado
 *
 * Cada transición dice quién puede hacerla (dueño, paseador o sistema) y se registra con hora y autor.
 * «sistema» incluye lo que decide el equipo desde /admin (siempre con una nota).
 * La app no mueve dinero: el pago (la familia le paga a Patitas AL TERMINAR el paseo y Patitas al paseador) se lleva
 * aparte, en el libro de pagos (lib/pagos.ts). El paseo no espera ningún pago: ni salir ni empezar dependen de él.
 * Durante el paseo (en_paseo) el sistema puede dejar «avisos» de ubicación en el registro sin cambiar el estado
 * (lib/zona.ts): no bloquean a nadie, solo avisan.
 */

import type { TipoAviso } from './zona'

export const ESTADOS = [
  'solicitado',
  'aceptado',
  'rechazado',
  'expirado',
  'en_camino',
  'en_paseo',
  'entregado',
  'cerrado',
  'cancelado',
  'en_disputa',
] as const
export type EstadoPaseo = (typeof ESTADOS)[number]

export const ACTORES = ['dueno', 'paseador', 'sistema'] as const
export type Actor = (typeof ACTORES)[number]

export const ACCIONES = [
  'solicitar',
  'aceptar',
  'rechazar',
  'expirar',
  'salir',
  'recoger',
  'entregar',
  'confirmar_entrega',
  'recordar',
  'cerrar',
  'cancelar',
  'reportar',
  'resolver',
  'anular',
  'avisar',
] as const
export type AccionPaseo = (typeof ACCIONES)[number]

export interface Transicion {
  accion: AccionPaseo
  /** Estados desde los que se puede hacer. `null` = el paseo todavía no existe (solo «solicitar»). */
  de: readonly (EstadoPaseo | null)[]
  a: EstadoPaseo
  quien: readonly Actor[]
  /** Qué queda anotado en el registro. */
  registra: string
}

/** La tabla de transiciones permitidas. Lo que no está aquí no se puede hacer. */
export const TRANSICIONES: readonly Transicion[] = [
  { accion: 'solicitar', de: [null], a: 'solicitado', quien: ['dueno'], registra: 'El dueño envió la solicitud.' },
  { accion: 'aceptar', de: ['solicitado'], a: 'aceptado', quien: ['paseador'], registra: 'El paseador aceptó el paseo.' },
  { accion: 'rechazar', de: ['solicitado'], a: 'rechazado', quien: ['paseador'], registra: 'El paseador rechazó la solicitud.' },
  { accion: 'expirar', de: ['solicitado'], a: 'expirado', quien: ['sistema'], registra: 'Venció el plazo para aceptar.' },
  { accion: 'salir', de: ['aceptado'], a: 'en_camino', quien: ['paseador'], registra: 'El paseador salió a recoger al perro.' },
  { accion: 'recoger', de: ['en_camino'], a: 'en_paseo', quien: ['paseador'], registra: 'El paseador recogió al perro con el código.' },
  { accion: 'entregar', de: ['en_paseo'], a: 'entregado', quien: ['paseador'], registra: 'El paseador entregó al perro.' },
  { accion: 'confirmar_entrega', de: ['entregado'], a: 'entregado', quien: ['dueno'], registra: 'El dueño confirmó que recibió al perro.' },
  { accion: 'recordar', de: ['entregado'], a: 'entregado', quien: ['sistema'], registra: 'Se le recordó al dueño confirmar la entrega.' },
  { accion: 'cerrar', de: ['entregado'], a: 'cerrado', quien: ['sistema'], registra: 'Se cerró el paseo.' },
  { accion: 'cancelar', de: ['solicitado'], a: 'cancelado', quien: ['dueno'], registra: 'El dueño canceló la solicitud.' },
  { accion: 'cancelar', de: ['aceptado', 'en_camino'], a: 'cancelado', quien: ['dueno', 'paseador'], registra: 'Se canceló el paseo.' },
  { accion: 'reportar', de: ['aceptado', 'en_camino', 'en_paseo', 'entregado'], a: 'en_disputa', quien: ['dueno', 'paseador'], registra: 'Se reportó un problema.' },
  { accion: 'resolver', de: ['en_disputa'], a: 'cerrado', quien: ['sistema'], registra: 'El equipo resolvió el reporte.' },
  { accion: 'anular', de: ['en_disputa'], a: 'cancelado', quien: ['sistema'], registra: 'El equipo anuló el paseo al resolver el reporte.' },
  { accion: 'avisar', de: ['en_paseo'], a: 'en_paseo', quien: ['sistema'], registra: 'La app dejó un aviso de ubicación del paseo.' },
]

/** Estados sin salidas: de ahí el paseo no vuelve a moverse. Sale de la tabla, no se escribe a mano. */
export const ESTADOS_FINALES: readonly EstadoPaseo[] = ESTADOS.filter((e) => !TRANSICIONES.some((t) => t.de.includes(e)))

export function esFinal(estado: EstadoPaseo): boolean {
  return ESTADOS_FINALES.includes(estado)
}

export interface EventoPaseo {
  accion: AccionPaseo
  de: EstadoPaseo | null
  a: EstadoPaseo
  quien: Actor
  /** Hora (milisegundos desde 1970). */
  at: number
  nota?: string
  /** true si lo hizo la demostración (el paseador de ejemplo, no una persona). */
  demo?: boolean
  /** Solo en «avisar»: qué se avisó (lib/zona.ts). El texto sale de lib/zonaTextos.ts. */
  aviso?: TipoAviso
}

export interface Paseo {
  estado: EstadoPaseo
  /** El registro, en orden: del más antiguo al más nuevo. */
  eventos: EventoPaseo[]
}

export type CodigoError = 'accion' | 'estado' | 'actor' | 'repetida' | 'hora' | 'nota'

export class TransicionInvalida extends Error {
  constructor(
    public readonly codigo: CodigoError,
    mensaje: string,
  ) {
    super(mensaje)
    this.name = 'TransicionInvalida'
  }
}

/** Un paseo nuevo: lo crea el dueño al enviar la solicitud. */
export function nuevoPaseo(at: number): Paseo {
  return { estado: 'solicitado', eventos: [{ accion: 'solicitar', de: null, a: 'solicitado', quien: 'dueno', at }] }
}

/** ¿Ya se hizo esta acción en este paseo? */
export function seHizo(p: Paseo, accion: AccionPaseo): boolean {
  return p.eventos.some((e) => e.accion === accion)
}

/** Hora de la última vez que se hizo una acción (o null). */
export function horaDe(p: Paseo, accion: AccionPaseo): number | null {
  for (let i = p.eventos.length - 1; i >= 0; i--) if (p.eventos[i].accion === accion) return p.eventos[i].at
  return null
}

export const entregaConfirmada = (p: Paseo) => seHizo(p, 'confirmar_entrega')
export const recordatorioEnviado = (p: Paseo) => seHizo(p, 'recordar')

/** Acciones que quedarían repetidas: solo se hacen una vez por paseo. */
const UNA_VEZ: readonly AccionPaseo[] = ['confirmar_entrega', 'recordar']

function buscar(accion: AccionPaseo, estado: EstadoPaseo): Transicion | undefined {
  return TRANSICIONES.find((t) => t.accion === accion && t.de.includes(estado))
}

export type Resultado = { ok: true; paseo: Paseo } | { ok: false; codigo: CodigoError; motivo: string }

/**
 * Intenta una transición. No lanza: devuelve el paseo nuevo o el motivo por el que no se pudo.
 * `nota` es obligatoria para lo que decide el equipo («resolver», «anular») y para cerrar sin que el dueño haya confirmado.
 */
export function intentar(p: Paseo, accion: AccionPaseo, quien: Actor, at: number, nota?: string, demo?: boolean, aviso?: TipoAviso): Resultado {
  if (!ACCIONES.includes(accion)) return { ok: false, codigo: 'accion', motivo: `Acción desconocida: ${accion}` }
  if (accion === 'solicitar') return { ok: false, codigo: 'estado', motivo: 'El paseo ya existe: «solicitar» solo crea uno nuevo.' }
  const t = buscar(accion, p.estado)
  if (!t) return { ok: false, codigo: 'estado', motivo: `No se puede «${accion}» cuando el paseo está «${p.estado}».` }
  if (!t.quien.includes(quien)) return { ok: false, codigo: 'actor', motivo: `«${accion}» no lo puede hacer: ${quien}.` }
  if (UNA_VEZ.includes(accion) && seHizo(p, accion)) return { ok: false, codigo: 'repetida', motivo: `«${accion}» ya se hizo.` }
  const ultima = p.eventos[p.eventos.length - 1]?.at ?? 0
  if (at < ultima) return { ok: false, codigo: 'hora', motivo: 'La hora es anterior al último evento del registro.' }
  const pideNota = accion === 'resolver' || accion === 'anular' || (accion === 'cerrar' && !entregaConfirmada(p))
  if (pideNota && !nota?.trim()) return { ok: false, codigo: 'nota', motivo: `«${accion}» pide una nota (queda en el registro).` }
  const evento: EventoPaseo = {
    accion,
    de: p.estado,
    a: t.a,
    quien,
    at,
    ...(nota?.trim() ? { nota: nota.trim() } : {}),
    ...(demo ? { demo: true } : {}),
    ...(aviso ? { aviso } : {}),
  }
  return { ok: true, paseo: { estado: t.a, eventos: [...p.eventos, evento] } }
}

/** Igual que `intentar`, pero lanza `TransicionInvalida` si no se puede (para código que ya comprobó). */
export function aplicar(p: Paseo, accion: AccionPaseo, quien: Actor, at: number, nota?: string, demo?: boolean, aviso?: TipoAviso): Paseo {
  const r = intentar(p, accion, quien, at, nota, demo, aviso)
  if (!r.ok) throw new TransicionInvalida(r.codigo, r.motivo)
  return r.paseo
}

/** Qué puede hacer cada actor desde un estado (para mostrar solo los botones que valen). */
export function accionesPosibles(p: Paseo, quien: Actor): AccionPaseo[] {
  return ACCIONES.filter((a) => a !== 'solicitar' && intentar(p, a, quien, p.eventos[p.eventos.length - 1]?.at ?? 0, 'nota').ok)
}

export function puede(p: Paseo, accion: AccionPaseo, quien: Actor): boolean {
  return accionesPosibles(p, quien).includes(accion)
}

/* ------------------------------------------------------------------ */
/* Plazos (las cifras vienen de lib/config.ts; aquí solo se comparan)   */
/* ------------------------------------------------------------------ */

const MIN = 60_000

/** ¿Venció el plazo para que el paseador acepte o rechace? */
export function solicitudVencida(p: Paseo, ahora: number, minutosParaAceptar: number): boolean {
  const desde = horaDe(p, 'solicitar')
  return p.estado === 'solicitado' && desde !== null && ahora - desde >= minutosParaAceptar * MIN
}

/** ¿El dueño no confirmó la entrega pasado el tiempo? No se confirma sola: queda «Entrega sin confirmar». */
export function entregaSinConfirmar(p: Paseo, ahora: number, minutos: number): boolean {
  const desde = horaDe(p, 'entregar')
  return p.estado === 'entregado' && !entregaConfirmada(p) && desde !== null && ahora - desde >= minutos * MIN
}

/** ¿Toca mandar el recordatorio? (una sola vez, cuando pasa el tiempo sin confirmación) */
export function tocaRecordatorio(p: Paseo, ahora: number, minutos: number): boolean {
  return entregaSinConfirmar(p, ahora, minutos) && !recordatorioEnviado(p)
}

/** Cancelar con menos de `horasGratis` horas para el paseo es «tardía» (hoy no cuesta nada: solo queda anotado). */
export function esCancelacionTardia(inicioPaseo: number, ahora: number, horasGratis: number): boolean {
  return inicioPaseo - ahora < horasGratis * 60 * MIN
}
