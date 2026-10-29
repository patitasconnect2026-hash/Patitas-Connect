import type { Caso, Reporte } from './casos'
import type { MetodoPago } from './config'
import { aplicar, entregaConfirmada, intentar, nuevoPaseo, type AccionPaseo, type Actor, type EstadoPaseo, type Paseo } from './paseo'
import type { Booking, EventKind, Size } from './types'
import { agregarPunto, type PuntoControl } from './puntosControl'
import { evaluarLecturas, nuevaVigilancia, type Lectura, type Vigilancia } from './zona'
import { notaAviso, notaSinUbicacion, type MotivoSinUbicacion } from './zonaTextos'

/**
 * Tipos y utilidades de lo que se «dicen» la app del cliente (/) y la del paseador (/paseador).
 * Cómo viaja (localStorage entre pestañas del mismo navegador) está en `lib/datos/`.
 */

export interface ChatMsg {
  id: string
  from: 'owner' | 'walker'
  text?: string
  image?: string
  at: number
  /** De qué paseo es (se anota al guardar; los de antes no lo traen). Sirve para tener varios paseos a la vez. */
  jobId?: string
}

export interface JobDog {
  name: string
  breed: string
  size: Size
  fur: string
  shape: string
  photo?: string
  notes: string
  medical: string
  vet: string
  temperament: string[]
  sociable: boolean
  vaccinated: boolean
}

export interface Job {
  id: string
  /**
   * De qué familia es el paseo (la identidad de la sesión). Solo existe con servidor: en el navegador hay un paseo y
   * no hace falta. Con varios paseos, cada familia ve solo los suyos.
   */
  familiaId?: string
  walkerFirst: string
  walkerId: string
  ownerFirst: string
  dog: JobDog
  slotLabel: string
  durationMin: number
  pin: string
  handoff: 'door' | 'doorman'
  doormanName: string
  address: string
  /** Con servidor: el punto exacto de recojo. La base solo se lo entrega al paseador DESPUÉS de que acepta el paseo. */
  punto?: [number, number]
  groupDogs: number
  groupSize: Size
  /** Lo que recibe el paseador (la foto del momento de la reserva: lib/config.ts `pagoPaseador`). */
  walkerPay: number
  createdAt: number
  /** Estado del paseo y su registro (lib/paseo.ts). Todas las pantallas lo leen de aquí. */
  paseo: Paseo
  // El pago NO vive aquí: está en el libro de pagos (lib/pagos.ts, `patitas:bus:pagos`) con el mismo id del encargo,
  // porque el equipo tiene que poder verlo y pagarlo aunque el dueño ya haya pedido otro paseo.
  /** Lo que reportó el dueño o el paseador (el paseo está «en_disputa»). */
  reporte?: Reporte
  /**
   * El paseador ya «cerró» este paseo en su app. Su pantalla lo oculta, pero el encargo SIGUE para el dueño
   * (así no pierde el estado final, el pago ni el reporte). Se borra cuando el dueño reserva otra vez o lo descarta.
   */
  cerradoPaseador?: boolean
  /**
   * La reserva tal como la hizo el dueño. Sirve para que la app del dueño recupere el paseo si recarga la página
   * (el avance del mapa y la bitácora de ejemplo no se guardan).
   */
  reserva?: Booking
  /** Contacto de emergencia que dejó el dueño (opcional). Solo sirve para el SOS. */
  emergencia?: { nombre: string; telefono: string }
  /**
   * Solo con servidor: el paseo ya se aceptó pero la ficha del perro o la dirección todavía no llegaron (la base se las
   * entrega al paseador al aceptar). Mientras tanto la pantalla lo dice en vez de mostrar una ficha vacía.
   */
  fichaPendiente?: boolean
  /** Distrito del paseo (de la cuenta del dueño). De aquí sale el serenazgo del SOS. */
  distrito?: 'San Isidro' | 'Jesús María'
  /** Lo que recuerda el motor de avisos de ubicación entre una lectura y la siguiente (lib/zona.ts). */
  vigilancia?: Vigilancia
  /**
   * Qué eligió el paseador sobre su ubicación en este paseo: `activa` (dio el permiso) o por qué no la comparte
   * (`negada`, `omitida` o `no_disponible`). Sin esto todavía no eligió: se le explica y se le pregunta.
   */
  ubicacion?: 'activa' | MotivoSinUbicacion
  /**
   * Puntos de control: el inicio y el fin del paseo con su ubicación (lib/puntosControl.ts). Las fotos llevan la suya.
   * El seguimiento es por puntos de control con foto, no continuo.
   */
  puntos?: PuntoControl[]
}

export interface LiveEvent {
  id: string
  kind: EventKind
  text: string
  at: number
  /** De qué paseo es (se anota al guardar; los de antes no lo traen). */
  jobId?: string
}

export function newId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/**
 * El id de un mensaje del chat. Con servidor la base lo usa para no duplicar el mensaje si hay que reenviarlo, así que
 * tiene que ser único aunque dos teléfonos escriban a la vez.
 */
export function newMessageId() {
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `${newId()}-${Math.random().toString(36).slice(2, 10)}`
}

export function makePin() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

export function clockLabel(at: number) {
  return new Date(at).toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' })
}

/**
 * Hace una transición del paseo del encargo. Si no se puede (otro la hizo antes, o no corresponde), devuelve el encargo igual:
 * así dos pestañas que tocan a la vez no se pisan.
 */
export function moverPaseo(j: Job | null, accion: AccionPaseo, quien: Actor, at: number, nota?: string, demo?: boolean): Job | null {
  if (!j) return j
  // Con servidor, el registro trae la hora de la base: si el reloj de este teléfono va atrasado, el paso no se pierde
  // por «la hora es anterior al último evento» (queda a la hora del último evento).
  const ultimo = j.paseo.eventos[j.paseo.eventos.length - 1]?.at ?? 0
  const r = intentar(j.paseo, accion, quien, Math.max(at, ultimo), nota, demo)
  return r.ok ? { ...j, paseo: r.paseo } : j
}

/**
 * Procesa lecturas de ubicación y deja los avisos en el registro del paseo (acción «avisar», la hace el sistema).
 * Solo durante el paseo (`en_paseo`). `demo` marca los avisos como de demostración; `desdeCero` olvida lo anterior
 * (cada prueba de la demostración empieza limpia). Si no hay avisos, el encargo solo recuerda su vigilancia.
 * La hora de cada aviso nunca es anterior al último evento del registro (la máquina de estados lo exige).
 */
export function registrarLecturas(j: Job | null, lecturas: readonly Lectura[], opciones: { demo: boolean; desdeCero?: boolean }): Job | null {
  if (!j || j.paseo.estado !== 'en_paseo' || lecturas.length === 0) return j
  const base = opciones.desdeCero ? nuevaVigilancia() : (j.vigilancia ?? nuevaVigilancia())
  const r = evaluarLecturas(base, lecturas)
  let paseo = j.paseo
  for (const a of r.avisos) {
    const ultimo = paseo.eventos[paseo.eventos.length - 1].at
    const res = intentar(paseo, 'avisar', 'sistema', Math.max(a.t, ultimo), notaAviso(a.tipo, opciones.demo), opciones.demo, a.tipo)
    if (res.ok) paseo = res.paseo
  }
  return { ...j, paseo, vigilancia: { ...r.vigilancia, demo: opciones.demo } }
}

/** Anota el inicio o el fin del paseo. Solo hay uno de cada uno: repetirlo no cambia nada. */
export function registrarPunto(j: Job | null, punto: PuntoControl): Job | null {
  if (!j) return j
  const puntos = agregarPunto(j.puntos, punto)
  return puntos.length === (j.puntos?.length ?? 0) ? j : { ...j, puntos }
}

/** El paseador eligió compartir su ubicación en este paseo (el navegador todavía puede negar el permiso). */
export function activarUbicacion(j: Job | null): Job | null {
  return j && j.paseo.estado === 'en_paseo' ? { ...j, ubicacion: 'activa' } : j
}

/**
 * El paseador no comparte su ubicación (la negó, eligió «Ahora no» o el navegador no la permite): puede seguir y el
 * registro del paseo lo anota (aviso `sin_ubicacion` del sistema). Se anota una sola vez por motivo.
 */
export function registrarSinUbicacion(j: Job | null, motivo: MotivoSinUbicacion, at: number): Job | null {
  if (!j || j.paseo.estado !== 'en_paseo') return j
  if (j.ubicacion === motivo) return j
  const ultimo = j.paseo.eventos[j.paseo.eventos.length - 1].at
  const r = intentar(j.paseo, 'avisar', 'sistema', Math.max(at, ultimo), notaSinUbicacion(motivo), false, 'sin_ubicacion')
  return { ...j, ubicacion: motivo, paseo: r.ok ? r.paseo : j.paseo }
}

/**
 * Un encargo guardado antes de la máquina de estados traía `status` y `paid`. Se lee como el estado que le corresponde,
 * para que los celulares de prueba con un paseo a medias no se rompan.
 */
export function migrarJob<T extends Partial<Job> & { status?: string; paid?: boolean }>(j: T | null): Job | null {
  if (!j) return null
  if (j.paseo) return j as unknown as Job
  const base = j.createdAt ?? Date.now()
  let p: Paseo = nuevoPaseo(base)
  const paso = (a: AccionPaseo, q: Actor, k: number) => {
    p = aplicar(p, a, q, base + k)
  }
  paso('aceptar', 'paseador', 1)
  if (j.status && j.status !== 'asignado') {
    paso('salir', 'paseador', 2)
    paso('recoger', 'paseador', 3)
  }
  if (j.status === 'entregado') {
    paso('entregar', 'paseador', 4)
    if (j.paid) {
      paso('confirmar_entrega', 'dueno', 5)
      paso('cerrar', 'sistema', 6)
    }
  }
  return { ...(j as unknown as Job), paseo: p }
}

/**
 * Cierra el paseo cuando el dueño confirmó que recibió al perro. El pago ya se verificó ANTES del paseo y el pago al
 * paseador lo hace el equipo aparte (lib/pagos.ts): no hace falta esperarlos para cerrar el paseo.
 * Nunca cierra por sí solo una entrega sin confirmar (eso lo mira el equipo).
 */
export function cerrarSiListo(j: Job | null, at: number): Job | null {
  if (!j) return j
  if (j.paseo.estado !== 'entregado' || !entregaConfirmada(j.paseo)) return j
  return moverPaseo(j, 'cerrar', 'sistema', at)
}

/** El dueño toca «Recibí a [perro]»: el paseo se cierra. */
export function confirmarEntregaJob(j: Job | null, at: number): Job | null {
  return cerrarSiListo(moverPaseo(j, 'confirmar_entrega', 'dueno', at), at + 1)
}

/** Lo que ve la app del paseador: el encargo, salvo que ya lo haya cerrado. */
export function visibleParaPaseador(j: Job | null): Job | null {
  return j && !j.cerradoPaseador ? j : null
}

/** El paseador cierra el paseo en su pantalla (el encargo sigue para el dueño). */
export function cerrarParaPaseador(j: Job | null): Job | null {
  return j ? { ...j, cerradoPaseador: true } : j
}

/** «Reportar problema»: el paseo pasa a «en_disputa» y el reporte queda en el encargo. */
export function reportarJob(j: Job | null, reporte: Reporte): Job | null {
  if (!j) return j
  const movido = moverPaseo(j, 'reportar', reporte.quien, reporte.at, `Motivo: ${reporte.motivo}`)
  return movido === j ? j : { ...(movido as Job), reporte }
}

/**
 * El equipo resuelve a mano, con una nota. En una disputa: «cerrado» (resolver) o «cancelado» (anular).
 * En una entrega sin confirmar: «cerrado» cierra el paseo con la nota.
 * La plata la mueve el equipo a mano en /admin (lib/pagos.ts). Un caso de pago no cambia el estado del paseo.
 */
export function resolverJob(j: Job | null, caso: Pick<Caso, 'tipo'>, como: 'cerrado' | 'cancelado', nota: string, at: number): Job | null {
  if (!j || caso.tipo === 'pago') return j
  if (caso.tipo === 'disputa') return moverPaseo(j, como === 'cerrado' ? 'resolver' : 'anular', 'sistema', at, nota)
  return como === 'cerrado' ? moverPaseo(j, 'cerrar', 'sistema', at, nota) : j
}

export type { MetodoPago }

export type { EstadoPaseo }
