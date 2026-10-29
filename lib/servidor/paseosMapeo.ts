/**
 * Paseos con el servidor (paso 6a): de las filas de la base al paseo que usa la app, y al revés. Funciones PURAS.
 *
 * Qué se lleva a cada tabla (y qué NO):
 *   - `paseos`: lo que ven los dos desde la solicitud. El resumen del perro NO trae notas, datos médicos ni veterinario:
 *     la ficha completa vive en `perros` y la base solo se la muestra al paseador DESPUÉS de aceptar. La dirección vive
 *     en `casas`, con la misma regla.
 *   - `paseo_eventos`: el registro de la máquina de estados. Los cambios de estado los anota la base sola (con quién
 *     los hizo); la app solo agrega «confirmar_entrega», «recordar» y «avisar».
 *   - `bitacora`: lo que el paseador anota durante el paseo.
 *   - `codigos_recojo`: el código de 4 dígitos. Lo ve la familia; el paseador nunca lo lee.
 * Lo que viaja aparte (el chat, los pagos, las fotos y el inicio y el fin del paseo) está en sus propios archivos. Lo que se
 * queda SIEMPRE en el teléfono es la memoria del motor de avisos de ubicación (`vigilancia`: la última lectura y lo
 * reciente) y el estado del permiso (`ubicacion`): nunca suben, para que no haya seguimiento continuo.
 */
import { inicioDeReserva } from '../recordatorios'
import { desgloseDePago } from '../config'
import type { ChatMsg, Job, JobDog, LiveEvent } from '../bus'
import { newDog } from '../data'
import { ACCIONES, ACTORES, ESTADOS, type EstadoPaseo, type EventoPaseo, type Paseo } from '../paseo'
import type { Persona } from '../sos'
import type { Account, Booking, Dog, EventKind, FurKey, Size, Walker } from '../types'
import type { TipoAviso } from '../zona'
import type { FilaBitacoraNueva, FilaCasaNueva, FilaCruda, FilaEventoNueva, FilaMensajeNueva, FilaPaseoNueva, FilaPerroNueva, SesionDePaseos } from './paseosTipos'

/* ------------------------------------------------------------------ */
/* Lectura defensiva (lo que llega de la red no se da por bueno)        */
/* ------------------------------------------------------------------ */

const esObjeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const texto = (v: unknown, porDefecto = ''): string => (typeof v === 'string' ? v : porDefecto)
const numero = (v: unknown, porDefecto = 0): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  return Number.isFinite(n) ? n : porDefecto
}
const enLista = <T extends string>(v: unknown, lista: readonly T[]): T | null => (typeof v === 'string' && (lista as readonly string[]).includes(v) ? (v as T) : null)
const listaDeTextos = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

const TAMANOS: readonly Size[] = ['small', 'medium', 'large']
const PELAJES: readonly FurKey[] = ['dorado', 'negro', 'blanco', 'cafe', 'gris']
const FORMAS: readonly Dog['shape'][] = ['floppy', 'bat']
const DISTRITOS = ['San Isidro', 'Jesús María'] as const
const AVISOS: readonly TipoAviso[] = ['borde', 'salida', 'regreso', 'salto', 'quieto', 'sin_ubicacion']
const KINDS: readonly EventKind[] = ['start', 'route', 'cross', 'pee', 'water', 'photo', 'poop', 'return', 'arrived', 'sos']
/** Estados en los que el paseador ya aceptó y la base le deja ver la casa y la ficha (copia de `privado.paseador_ve_familia`). */
export const ESTADOS_ACEPTADOS: readonly EstadoPaseo[] = ['aceptado', 'en_camino', 'en_paseo', 'entregado', 'en_disputa']

/* ------------------------------------------------------------------ */
/* Identificador estable de un perro en el servidor                     */
/* ------------------------------------------------------------------ */

function hash32(s: string, semilla: number): number {
  let h = semilla >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
    h ^= h >>> 15
  }
  return h >>> 0
}

/**
 * Un uuid que sale siempre igual de la misma semilla: «guardar el perro» no lo duplica y el paseo siempre apunta al
 * mismo registro. No es un secreto ni una firma: solo un identificador.
 */
export function uuidDe(semilla: string): string {
  const hex = [0x811c9dc5, 0x9e3779b1, 0x85ebca6b, 0xc2b2ae35].map((s) => hash32(semilla, s).toString(16).padStart(8, '0')).join('')
  const variante = '89ab'[parseInt(hex[16], 16) % 4]
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variante}${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

export const esUuid = (s: unknown): s is string => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

/* ------------------------------------------------------------------ */
/* De la base a la app                                                  */
/* ------------------------------------------------------------------ */

/** Una fila de `paseo_eventos` como evento del registro. null si no sirve. */
export function eventoDeFila(f: FilaCruda): EventoPaseo | null {
  const accion = enLista(f.accion, ACCIONES)
  const a = enLista(f.a, ESTADOS)
  const quien = enLista(f.quien, ACTORES)
  const at = Date.parse(texto(f.en))
  if (!accion || !a || !quien || !Number.isFinite(at)) return null
  const de = f.de === null || f.de === undefined ? null : enLista(f.de, ESTADOS)
  if (f.de !== null && f.de !== undefined && de === null) return null
  const nota = texto(f.nota).trim()
  const aviso = enLista(f.aviso, AVISOS)
  return { accion, de, a, quien, at, ...(nota ? { nota } : {}), ...(f.demo === true ? { demo: true } : {}), ...(aviso ? { aviso } : {}) }
}

/** Una fila de `bitacora` como aviso del paseo. null si no sirve. */
export function bitacoraDeFila(f: FilaCruda): LiveEvent | null {
  const kind = enLista(f.tipo, KINDS)
  const at = Date.parse(texto(f.en))
  const id = texto(f.id)
  const jobId = texto(f.paseo_id)
  if (!kind || !id || !jobId || !Number.isFinite(at)) return null
  return { id, kind, text: texto(f.texto), at, jobId }
}

/** Cuántos caracteres cabe un mensaje del chat (lo mismo que el campo de la pantalla). */
export const LARGO_MAXIMO_DE_MENSAJE = 500

/**
 * Una fila de `mensajes` como mensaje del chat. Una fila sin texto (por ejemplo, una con foto de una versión futura)
 * no se muestra: esta versión todavía no sabe pintar fotos del chat entre teléfonos.
 */
export function mensajeDeFila(f: FilaCruda): ChatMsg | null {
  const id = texto(f.id)
  const jobId = texto(f.paseo_id)
  const de = enLista(f.de, ['owner', 'walker'] as const)
  const text = texto(f.texto)
  const at = Date.parse(texto(f.en))
  if (!id || !jobId || !de || text.trim() === '' || !Number.isFinite(at)) return null
  return { id, from: de, text, at, jobId }
}

/** Lo que se manda a la base de un mensaje del chat; null si no se puede mandar (sin paseo, sin texto, ajeno). */
export function filaDeMensaje(m: ChatMsg, rol: SesionDePaseos['rol']): FilaMensajeNueva | null {
  if (!m || typeof m.id !== 'string' || m.id === '' || !m.jobId) return null
  // Cada persona manda solo lo suyo: la familia como «owner», el paseador como «walker».
  const de = rol === 'familia' ? 'owner' : rol === 'paseador' ? 'walker' : null
  if (!de || m.from !== de) return null
  const text = typeof m.text === 'string' ? m.text.trim().slice(0, LARGO_MAXIMO_DE_MENSAJE) : ''
  if (text === '') return null
  return { id: m.id, paseo_id: m.jobId, de, texto: text }
}

/** La ficha del perro: el resumen que viaja en el paseo y, si la base la entregó, la fila de `perros`. */
export function dogDeFilas(resumen: unknown, perro: FilaCruda | null | undefined): Dog {
  const r = esObjeto(resumen) ? resumen : {}
  const p = perro ?? null
  const tamano = enLista(p?.tamano, TAMANOS) ?? enLista(r.size, TAMANOS) ?? 'medium'
  return newDog({
    id: texto(r.id) || (p ? texto(p.id) : '') || 'perro',
    name: texto(p?.nombre) || texto(r.name) || 'Perro',
    breed: texto(p?.raza) || texto(r.breed) || 'Mestizo',
    size: tamano,
    fur: enLista(p?.pelaje, PELAJES) ?? enLista(r.fur, PELAJES) ?? 'dorado',
    shape: enLista(p?.forma, FORMAS) ?? enLista(r.shape, FORMAS) ?? 'floppy',
    ...(p
      ? {
          ageYears: numero(p.edad_anios, 3),
          sex: p.sexo === 'F' ? ('F' as const) : ('M' as const),
          ...(p.peso_kg !== null && p.peso_kg !== undefined ? { weightKg: numero(p.peso_kg) } : {}),
          temperament: listaDeTextos(p.temperamento),
          sociable: p.sociable !== false,
          vaccinated: p.vacunado === true,
          sterilized: p.esterilizado === true,
          rpp: p.rpp === true,
          notes: texto(p.notas),
          medical: texto(p.medico),
          vet: texto(p.veterinario),
        }
      : { sociable: r.sociable !== false }),
  })
}

const jobDogDe = (d: Dog): JobDog => ({
  name: d.name,
  breed: d.breed,
  size: d.size,
  fur: d.fur,
  shape: d.shape,
  photo: d.photo,
  notes: d.notes,
  medical: d.medical,
  vet: d.vet,
  temperament: d.temperament,
  sociable: d.sociable,
  vaccinated: d.vaccinated,
})

/** La dirección como se escribe en el paseo local: «Calle 123, Dpto · San Isidro». */
export function direccionDeCasa(c: FilaCruda): string {
  const calle = texto(c.calle).trim()
  if (!calle) return ''
  const unidad = texto(c.unidad).trim()
  const distrito = enLista(c.distrito, DISTRITOS)
  return `${calle}${unidad ? ', ' + unidad : ''}${distrito ? ' · ' + distrito : ''}`
}

export interface ContextoDeJob {
  eventos: readonly FilaCruda[]
  casa?: FilaCruda | null
  perro?: FilaCruda | null
  codigo?: string | null
}

/**
 * Un paseo de la app armado con lo que la base entregó A ESTA PERSONA. Lo que la base no le entrega (la casa y la
 * ficha antes de aceptar, el código de recojo al paseador) queda vacío: nunca se inventa.
 */
export function jobDeFilas(f: FilaCruda, ctx: ContextoDeJob): Job | null {
  const id = texto(f.id)
  const estado = enLista(f.estado, ESTADOS)
  const creado = Date.parse(texto(f.creado_en))
  const familiaId = texto(f.familia_id)
  const walkerId = texto(f.paseador_id)
  if (!id || !estado || !Number.isFinite(creado) || !familiaId || !walkerId) return null

  const eventos = ctx.eventos.map(eventoDeFila).filter((e): e is EventoPaseo => e !== null)
  // La base anota «solicitar» al crear el paseo; si todavía no llegó el registro, el paseo no queda sin primer evento.
  const registro: EventoPaseo[] = eventos.length > 0 ? eventos : [{ accion: 'solicitar', de: null, a: 'solicitado', quien: 'dueno', at: creado }]
  const paseo: Paseo = { estado, eventos: registro }

  const dog = dogDeFilas(f.perro, ctx.perro)
  const grupo = enLista(f.tamano_grupo, TAMANOS) ?? dog.size
  const casa = ctx.casa ?? null
  const emergenciaNombre = texto(casa?.emergencia_nombre).trim()
  const emergenciaTelefono = texto(casa?.emergencia_telefono).trim()
  const aceptado = ESTADOS_ACEPTADOS.includes(estado)
  const distrito = enLista(f.distrito, DISTRITOS)
  const reporte = esObjeto(f.reporte) ? (f.reporte as unknown as Job['reporte']) : undefined

  const job: Job = {
    id,
    familiaId,
    walkerFirst: texto(f.paseador_nombre),
    walkerId,
    ownerFirst: texto(f.dueno_nombre),
    dog: jobDogDe(dog),
    slotLabel: texto(f.horario),
    durationMin: numero(f.duracion_min, 60),
    pin: ctx.codigo ?? '',
    handoff: f.entrega === 'doorman' ? 'doorman' : 'door',
    doormanName: casa && casa.hay_portero === true ? texto(casa.nombre_portero) : '',
    address: casa ? direccionDeCasa(casa) : '',
    ...(aceptado && casa && typeof casa.lat === 'number' && typeof casa.lng === 'number' ? { punto: [casa.lat, casa.lng] as [number, number] } : {}),
    groupDogs: numero(f.perros_en_grupo, 0),
    groupSize: grupo,
    walkerPay: numero(f.pago_paseador, 0),
    createdAt: creado,
    paseo,
    ...(reporte ? { reporte } : {}),
    ...(f.cerrado_paseador === true ? { cerradoPaseador: true } : {}),
    ...(distrito ? { distrito } : {}),
    ...(emergenciaNombre || emergenciaTelefono ? { emergencia: { nombre: emergenciaNombre, telefono: emergenciaTelefono } } : {}),
    // La base entrega la ficha y la casa al aceptar: hasta que lleguen, la pantalla dice que están cargando.
    ...(aceptado && ((f.perro_id && !ctx.perro) || !casa) ? { fichaPendiente: true } : {}),
  }
  const reserva = reservaDeFila(f.reserva, dog)
  if (reserva) job.reserva = reserva
  return job
}

/** La reserva guardada en el paseo (sin la ficha del perro) con el perro completo que se conoce. */
export function reservaDeFila(r: unknown, dog: Dog): Booking | undefined {
  if (!esObjeto(r) || !esObjeto(r.walker) || typeof r.walker.id !== 'string') return undefined
  if (typeof r.total !== 'number' || typeof r.walkPrice !== 'number') return undefined
  return { ...(r as unknown as Booking), dog, walker: r.walker as unknown as Walker }
}

/* ------------------------------------------------------------------ */
/* De la app a la base                                                  */
/* ------------------------------------------------------------------ */

/** Lo que el paseador puede ver de un perro DESDE LA SOLICITUD: nada de notas, médico ni veterinario. */
export function resumenDePerro(d: { id: string; name: string; breed: string; size: Size; fur: string; shape: string; sociable: boolean }): Record<string, unknown> {
  return { id: d.id, name: d.name, breed: d.breed, size: d.size, fur: d.fur, shape: d.shape, sociable: d.sociable }
}

/**
 * La reserva tal como viaja en el paseo: con todo lo del precio y del horario, pero con el perro reducido al resumen,
 * sin fotos pesadas y sin la nota libre de la familia (esta fila la ve el paseador desde la solicitud; lo escrito para
 * él se muestra solo después de aceptar y hoy ninguna pantalla lo muestra).
 */
export function reservaPublica(b: Booking): Record<string, unknown> {
  const { dog, walker, ...resto } = b
  const foto = walker.photo && !walker.photo.startsWith('data:') ? walker.photo : undefined
  return { ...resto, notes: '', dog: resumenDePerro(dog), walker: { ...walker, photo: foto, reviews: [] } }
}

export function filaDeCasa(cuenta: Account, emergencia: Persona | null, familiaId: string): FilaCasaNueva {
  const distrito = enLista(cuenta.district, DISTRITOS)
  return {
    familia_id: familiaId,
    calle: cuenta.street ?? '',
    unidad: cuenta.unit ?? '',
    distrito,
    lat: cuenta.casa ? cuenta.casa[0] : null,
    lng: cuenta.casa ? cuenta.casa[1] : null,
    hay_portero: cuenta.doorman === true,
    nombre_portero: cuenta.doorman === true ? (cuenta.doormanName ?? '') : '',
    emergencia_nombre: emergencia?.nombre ?? '',
    emergencia_telefono: emergencia?.telefono ?? '',
  }
}

export function filaDePerro(d: Dog, familiaId: string, id: string): FilaPerroNueva {
  return {
    id,
    familia_id: familiaId,
    nombre: d.name,
    raza: d.breed,
    edad_anios: Number.isFinite(d.ageYears) ? Math.round(d.ageYears) : null,
    sexo: d.sex === 'F' ? 'F' : 'M',
    tamano: d.size,
    peso_kg: typeof d.weightKg === 'number' && Number.isFinite(d.weightKg) ? Math.round(d.weightKg * 10) / 10 : null,
    pelaje: d.fur,
    forma: d.shape,
    temperamento: d.temperament,
    sociable: d.sociable,
    vacunado: d.vaccinated,
    esterilizado: d.sterilized,
    rpp: d.rpp,
    notas: d.notes,
    medico: d.medical,
    veterinario: d.vet,
  }
}

/** La fila para crear el paseo. null si falta la reserva (de ahí salen los montos). */
export function filaDePaseoNuevo(job: Job, familiaId: string, perroId: string | null): FilaPaseoNueva | null {
  if (!job.reserva) return null
  const inicio = inicioDeReserva(job)
  const { monto, comision, neto } = desgloseDePago(job.reserva)
  return {
    id: job.id,
    familia_id: familiaId,
    paseador_id: job.walkerId,
    perro_id: perroId,
    perro: resumenDePerro({ id: job.reserva.dog.id, name: job.dog.name, breed: job.dog.breed, size: job.dog.size, fur: job.dog.fur, shape: job.dog.shape, sociable: job.dog.sociable }),
    dueno_nombre: job.ownerFirst,
    paseador_nombre: job.walkerFirst,
    horario: job.slotLabel,
    duracion_min: job.durationMin,
    entrega: job.handoff,
    perros_en_grupo: job.groupDogs,
    tamano_grupo: job.groupSize,
    pago_paseador: job.walkerPay,
    monto,
    comision,
    neto,
    reserva: reservaPublica(job.reserva),
    distrito: job.distrito ?? null,
    ...(inicio !== null ? { inicio: new Date(inicio).toISOString() } : {}),
  }
}

/** El reporte sube sin la foto (las fotos van en el paso 8). */
export function reporteParaServidor(r: NonNullable<Job['reporte']>): Record<string, unknown> {
  return { quien: r.quien, motivo: r.motivo, texto: r.texto, at: r.at }
}

export function filaDeEvento(paseoId: string, e: EventoPaseo): FilaEventoNueva {
  return {
    paseo_id: paseoId,
    accion: e.accion,
    de: e.de,
    a: e.a,
    quien: e.quien,
    en: new Date(e.at).toISOString(),
    nota: e.nota ?? null,
    demo: e.demo === true,
    aviso: e.aviso ?? null,
  }
}

export function filaDeBitacora(e: LiveEvent): FilaBitacoraNueva | null {
  if (!e.jobId) return null
  return { id: e.id, paseo_id: e.jobId, tipo: e.kind, texto: e.text, en: new Date(e.at).toISOString() }
}

/* ------------------------------------------------------------------ */
/* Qué hay que hacer en la base para que el paseo de aquí quede allá    */
/* ------------------------------------------------------------------ */

export type Operacion =
  /** El paseo todavía no existe en la base: casa, perro, paseo y código. */
  | { tipo: 'crear' }
  /** Un cambio de estado: la base lo valida con sus reglas y anota quién lo hizo. */
  | { tipo: 'estado'; evento: EventoPaseo }
  /** Un evento que no cambia el estado («confirmar_entrega», «recordar», «avisar»). */
  | { tipo: 'evento'; evento: EventoPaseo }
  /** El paseador cierra el paseo en su pantalla (el paseo sigue para la familia). */
  | { tipo: 'cerrar_para_paseador' }
  /** La familia cambió su contacto de emergencia. */
  | { tipo: 'emergencia' }

const mismaPersona = (a?: { nombre: string; telefono: string }, b?: { nombre: string; telefono: string }): boolean =>
  (a?.nombre ?? '') === (b?.nombre ?? '') && (a?.telefono ?? '') === (b?.telefono ?? '')

const EVENTOS_SIN_CAMBIO_DE_ESTADO = ['confirmar_entrega', 'recordar', 'avisar']

/**
 * Lo que cambió en `local` respecto de lo último que se supo de la base (`servidor`). Solo mira lo que le toca a cada
 * persona: una familia crea paseos; nadie borra nada. Los eventos nuevos van en orden (la base exige, por ejemplo,
 * «confirmar_entrega» antes de «cerrar»).
 */
export function operacionesDe(local: Job, servidor: Job | undefined, quien: SesionDePaseos): Operacion[] {
  const ops: Operacion[] = []
  let yaEnLaBase: number
  if (!servidor) {
    if (quien.rol !== 'familia') return []
    ops.push({ tipo: 'crear' })
    // El evento «solicitar» lo anota la base al crear el paseo.
    yaEnLaBase = 1
  } else {
    yaEnLaBase = servidor.paseo.eventos.length
  }
  for (const e of local.paseo.eventos.slice(yaEnLaBase)) {
    if (e.de !== e.a) ops.push({ tipo: 'estado', evento: e })
    else if (EVENTOS_SIN_CAMBIO_DE_ESTADO.includes(e.accion)) ops.push({ tipo: 'evento', evento: e })
  }
  if (servidor) {
    if (quien.rol === 'paseador' && local.cerradoPaseador === true && servidor.cerradoPaseador !== true) ops.push({ tipo: 'cerrar_para_paseador' })
    if (quien.rol === 'familia' && !mismaPersona(local.emergencia, servidor.emergencia)) ops.push({ tipo: 'emergencia' })
  }
  return ops
}
