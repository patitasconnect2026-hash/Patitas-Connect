/**
 * Un «teléfono» de prueba: la copia en memoria de una persona, conectada a un servidor de prueba con su sesión.
 * Hace lo mismo que la app (sin pantallas): lee su paseo activo y lo cambia con las mismas funciones puras.
 */
import { crearAdaptadorConCopia, adaptadorMemoria, type AdaptadorConCopia } from '../../datos/adaptador'
import { almacenMemoria, guardarFoto, guardarSelfie, leerFotos, type AlmacenFotos, type ResultadoFoto } from '../../datos/fotos'
import { codigoDeFotos, type FotoPaseo, type UbicacionDeFoto } from '../../fotos'
import { mezclarFotos } from '../fotosMapeo'
import { CLAVES } from '../../datos/claves'
import { aplicarPaseoActivo, CAPACIDAD_SERVIDOR, normalizarPaseos, paseoActivoDe } from '../../datos/paseos'
import { makePin, newId, newMessageId, type ChatMsg, type Job, type LiveEvent } from '../../bus'
import { buildBooking, DEMO_ACCOUNT, DEMO_DOGS } from '../../data'
import { nuevoPaseo } from '../../paseo'
import { normalizarPagos, type Pago } from '../../pagos'
import type { CobroPaseador } from '../../walkerStore'
import { desgloseDePago } from '../../config'
import type { Persona } from '../../sos'
import type { Account, Booking, Dog, Walker } from '../../types'
import { crearRemotoPaseos, type RemotoPaseos } from '../remotoPaseos'
import type { ClientePaseos } from '../paseosTipos'
import type { ServidorDePrueba } from './servidorFalso'

export interface Telefono {
  uid: string | null
  cliente: ClientePaseos & { fallarConRed(n: number | 'siempre'): void; conteo(): Record<string, number> }
  remoto: RemotoPaseos
  copia: AdaptadorConCopia
  /** Lo que guarda este teléfono (campos que no viajan, descartados…). */
  local: ReturnType<typeof adaptadorMemoria>
  /** Los paseos de esta persona que tiene la copia ahora. */
  paseos(): Job[]
  /** El paseo activo de esta persona (el que mostraría la app). */
  activo(): Job | null
  /** Cambia el paseo activo como lo hace `usePaseoActivo`. */
  actuar(f: (activo: Job | null) => Job | null): void
  bitacora(): LiveEvent[]
  /** Todo el chat que tiene la copia de esta persona (de todos sus paseos). */
  chat(): ChatMsg[]
  /** Los pagos que tiene la copia de esta persona (lo que la base le entregó). */
  pagos(): Pago[]
  /** Las fotos que ve esta persona, como las ve la app: las de este teléfono y las que trae la base. */
  fotos(): FotoPaseo[]
  /** Los bytes de las fotos de este teléfono (IndexedDB en la app). */
  almacenFotos: AlmacenFotos
  /** Saca una foto del paseo como la cámara de la app: queda primero en el teléfono y se envía sola. */
  tomarFoto(o: { jobId: string; bytes?: ArrayBuffer; t?: number; ubicacion?: UbicacionDeFoto | null; tipo?: string }): Promise<ResultadoFoto>
  /** Saca la «foto de hoy» del paseador. */
  tomarSelfie(o: { walkerId: string; bytes?: ArrayBuffer; t?: number }): Promise<ResultadoFoto>
  /** Dónde cobra cada paseador, según lo que la base le entregó a esta persona. */
  cobros(): Record<string, CobroPaseador>
  /** Escribe en el chat del paseo activo como lo hace la app (con id propio y marcado con el paseo). */
  escribir(texto: string, id?: string): ChatMsg
  /** Añade un aviso a la bitácora como lo hace el paseador. */
  anotar(e: LiveEvent): void
  cerrar(): void
}

export function abrirTelefono(
  servidor: ServidorDePrueba,
  uid: string | null,
  opciones: {
    account?: Account | null
    emergencia?: Persona | null
    intervaloMs?: number
    reintentoMs?: number
    reintentoPagoMs?: number
    /** Para «cerrar y volver a abrir la app» en el mismo teléfono: lo guardado en él (datos y bytes de fotos) sigue ahí. */
    local?: ReturnType<typeof adaptadorMemoria>
    almacenFotos?: AlmacenFotos
  } = {},
): Telefono {
  const cliente = servidor.cliente(uid)
  const local = opciones.local ?? adaptadorMemoria()
  const almacenFotos = opciones.almacenFotos ?? almacenMemoria()
  const remoto = crearRemotoPaseos({
    cliente: async () => cliente,
    leerFamilia: () => ({ account: opciones.account === undefined ? DEMO_ACCOUNT : opciones.account, emergencia: opciones.emergencia ?? null }),
    almacenLocal: local,
    intervaloMs: opciones.intervaloMs ?? 30,
    reintentoPagoMs: opciones.reintentoPagoMs ?? 20,
    almacenFotos,
  })
  const copia = crearAdaptadorConCopia(remoto, { reintentoMs: opciones.reintentoMs ?? 20 })
  const paseos = () => normalizarPaseos(copia.leer<unknown>(CLAVES.paseo, []))
  const activo = () => paseoActivoDe(paseos(), copia.identidad())
  return {
    uid,
    cliente,
    remoto,
    copia,
    local,
    paseos,
    activo,
    actuar(f) {
      const lista = paseos()
      const quien = copia.identidad()
      const actual = paseoActivoDe(lista, quien)
      const siguiente = f(actual)
      if (siguiente === actual) return
      copia.guardar(CLAVES.paseo, aplicarPaseoActivo(lista, actual, siguiente, quien, CAPACIDAD_SERVIDOR))
    },
    bitacora: () => copia.leer<LiveEvent[]>(CLAVES.eventos, []),
    chat: () => copia.leer<ChatMsg[]>(CLAVES.chat, []),
    pagos: () => normalizarPagos(copia.leer<unknown>(CLAVES.pagos, [])),
    fotos: () => mezclarFotos(leerFotos(local), copia.leer<FotoPaseo[]>(CLAVES.fotosServidor, [])),
    almacenFotos,
    async tomarFoto({ jobId, bytes, t, ubicacion, tipo }) {
      const r = await guardarFoto(
        { adaptador: local, almacen: almacenFotos },
        { jobId, bytes: bytes ?? bytesDeFoto(), tipo: tipo ?? 'image/jpeg', t: t ?? Date.now(), codigo: codigoDeFotos(jobId), ubicacion: ubicacion ?? null, ...(ubicacion ? {} : { sinUbicacion: 'omitida' as const }) },
      )
      if (r.ok) void remoto.sincronizarFotos()
      return r
    },
    async tomarSelfie({ walkerId, bytes, t }) {
      const r = await guardarSelfie({ adaptador: local, almacen: almacenFotos }, { walkerId, bytes: bytes ?? bytesDeFoto(), t: t ?? Date.now() })
      if (r.ok) void remoto.sincronizarFotos()
      return r
    },
    cobros: () => copia.leer<Record<string, CobroPaseador>>(CLAVES.cobros, {}),
    escribir(texto, id) {
      const j = activo()
      if (!j) throw new Error('No hay paseo activo para escribir.')
      const from = copia.identidad()?.rol === 'paseador' ? 'walker' : 'owner'
      const msg: ChatMsg = { id: id ?? newMessageId(), from, text: texto, at: Date.now(), jobId: j.id }
      copia.guardar(CLAVES.chat, [...copia.leer<ChatMsg[]>(CLAVES.chat, []), msg])
      return msg
    },
    anotar(e) {
      copia.guardar(CLAVES.eventos, [...copia.leer<LiveEvent[]>(CLAVES.eventos, []), e])
    },
    cerrar() {
      remoto.detener()
      copia.detener()
    },
  }
}

/** Unos bytes cualquiera para una foto de prueba (el contenido no importa: se compara que llegue igual). */
export function bytesDeFoto(largo = 64, semilla = 7): ArrayBuffer {
  const b = new Uint8Array(largo)
  for (let i = 0; i < largo; i++) b[i] = (i * 31 + semilla) % 256
  return b.buffer
}

/** Espera (con sondeo corto) a que algo se cumpla; falla con un mensaje claro si no pasa. */
export async function esperar(condicion: () => boolean | Promise<boolean>, descripcion: string, ms = 4000): Promise<void> {
  const fin = Date.now() + ms
  while (Date.now() < fin) {
    if (await condicion()) return
    await new Promise((r) => setTimeout(r, 8))
  }
  throw new Error(`Se esperaba: ${descripcion}`)
}

/** El paseo que arma la app de la familia al enviar una solicitud (lo mismo que `PatitasApp.enviarSolicitud`). */
export function jobDeSolicitud(opciones: { walker: Walker; dog?: Dog; ownerFirst?: string; hora?: number; handoff?: 'door' | 'doorman'; emergencia?: Persona; ahora?: number }): { job: Job; booking: Booking } {
  const dog = opciones.dog ?? DEMO_DOGS[0]
  const booking = buildBooking({
    walker: opciones.walker,
    dog,
    dayIdx: 0,
    startHour: opciones.hora ?? 10,
    durationMin: 60,
    plan: 'once',
    handoff: opciones.handoff ?? 'doorman',
    notes: '',
    groupDogs: 0,
    groupSize: dog.size,
  })
  const ahora = opciones.ahora ?? Date.now()
  const job: Job = {
    id: newId(),
    walkerFirst: opciones.walker.firstName,
    walkerId: opciones.walker.id,
    ownerFirst: opciones.ownerFirst ?? 'Valeria',
    dog: {
      name: dog.name,
      breed: dog.breed,
      size: dog.size,
      fur: dog.fur,
      shape: dog.shape,
      photo: dog.photo,
      notes: dog.notes,
      medical: dog.medical,
      vet: dog.vet,
      temperament: dog.temperament,
      sociable: dog.sociable,
      vaccinated: dog.vaccinated,
    },
    slotLabel: booking.slotLabel,
    durationMin: booking.durationMin,
    pin: makePin(),
    handoff: booking.handoff,
    doormanName: DEMO_ACCOUNT.doormanName,
    address: `${DEMO_ACCOUNT.street}, ${DEMO_ACCOUNT.unit} · ${DEMO_ACCOUNT.district}`,
    groupDogs: booking.groupDogs,
    groupSize: booking.groupSize,
    walkerPay: desgloseDePago(booking).neto,
    createdAt: ahora,
    paseo: nuevoPaseo(ahora),
    reserva: booking,
    ...(opciones.emergencia ? { emergencia: opciones.emergencia } : {}),
    distrito: DEMO_ACCOUNT.district,
  }
  return { job, booking }
}
