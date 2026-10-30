'use client'

/**
 * Los datos de la app, por cosa de negocio (no por clave de localStorage).
 * Las pantallas usan SOLO estos hooks: no tocan localStorage ni el evento «storage».
 * Hoy el adaptador es el local (este navegador). Ver `adaptador.ts`.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { moverPaseo, type ChatMsg, type Job, type LiveEvent } from '../bus'
import { agregarPago, actualizarPago, intentarPago, normalizarPagos, nuevoPago, pagoDe, PASEO_HECHO, sincronizarPaseo, type AccionPago, type ActorPago, type Pago, type ResultadoPago } from '../pagos'
import { CONFIG } from '../config'
import { abrirCaso, casoEntregaSinConfirmar, type Caso } from '../casos'
import { solicitudVencida, tocaRecordatorio } from '../paseo'
import { EMPTY, type Persisted } from '../store'
import type { Review, Walker } from '../types'
import { cobroRegistrado, EMPTY_APP, makeCode, migrarPostulacion, walkerDesdePostulacion, type CobroPaseador, type WalkerApplication } from '../walkerStore'
import type { FotoPaseo } from '../fotos'
import { esPaseadorDeEjemplo, resolverMostrarEjemplos } from '../ejemplos'
import type { Account } from '../types'
import { valorCompartido } from './compartido'
import { adaptadorLocal, esConCopia, type Adaptador, type AdaptadorConCopia, type EstadoConexion, type Identidad } from './adaptador'
import { copiaEnUso, elegirAdaptador, esEnrutado } from './enrutado'
import { activarPorCuenta, adaptadorPorCuenta, alCambiarPropietario, borrarLoDeLaCuenta } from './propietario'
import { crearRemotoDePrueba } from './adaptadorPrueba'
import {
  aplicarPaseoActivo,
  CAPACIDAD_LOCAL,
  CAPACIDAD_SERVIDOR,
  deEstePaseo,
  empaquetarPaseos,
  marcarConPaseo,
  normalizarPaseos,
  paseoActivoDe,
} from './paseos'
import { esCuentaDeEjemplo } from '../data'
import { accesoActivo } from '../servidor/config'
import { clientePaseosDeLaApp, clientePedidosDeLaApp, clienteUbicacionDeLaApp } from '../servidor/cliente'
import type { UbicacionEnVivo } from '../servidor/clienteUbicacion'
import type { FilaCruda as FilaDeUbicacion } from '../servidor/paseosTipos'
import { argsDeCrear, pedidoDeFila, pedidoParaPaseador, type PedidoParaPaseador } from '../servidor/pedidosMapeo'
import { cancelarPedido, conOfertasDeDemostracion, elegirOferta, estadoDe as estadoDePedido, ESTADOS_ACTIVOS, type Pedido } from '../pedidos'
import { textoDeMotivo, TEXTO_PEDIDO } from '../pedidosTextos'
import { debeAvisar, idsNuevos, normalizarPref, PREF_INICIAL, type AvisosPref } from '../avisos'
import { prepararSonido, sonar, vibrar } from '../avisosSonido'
import type { Dog } from '../types'
import { crearRemotoPaseos, type RemotoPaseos } from '../servidor/remotoPaseos'
import { mezclarFotos } from '../servidor/fotosMapeo'
import { appAprobadaPorServidor, conResenas, paseadoresDeVista } from '../servidor/paseadoresReales'
import { mismoCobro } from '../servidor/pagosMapeo'
import { TEXTO_SERVIDOR } from '../servidor/paseosTextos'
import type { FilaCruda } from '../servidor/paseosTipos'
import { CLAVES, CLAVES_DEL_SERVIDOR } from './claves'
import {
  almacenDelNavegador,
  alCambiarFotos,
  borrarTodasLasFotos,
  conservarFotosDe,
  guardarFoto,
  guardarSelfie,
  leerFotos,
  versionDeFotos,
  type EntradaFoto,
  type ResultadoFoto,
} from './fotos'

export {
  adaptadorLocal,
  adaptadorMemoria,
  crearAdaptadorConCopia,
  esConCopia,
  type Adaptador,
  type AdaptadorConCopia,
  type EstadoGuardado,
  type Identidad,
  type Remoto,
} from './adaptador'
export { adaptadorDePrueba, crearRemotoDePrueba, type RemotoDePrueba } from './adaptadorPrueba'
export { elegirAdaptador, enrutar, esEnrutado, type ModoDatos } from './enrutado'
export { aplicarPaseoActivo, deEstePaseo, empaquetarPaseos, marcarConPaseo, normalizarPaseos, paseoActivoDe, paseosDe } from './paseos'
export { CLAVES } from './claves'
export { almacenMemoria, esEspacioLleno, guardarFoto, leerFotos, type AlmacenFotos, type EntradaFoto, type ResultadoFoto } from './fotos'

/** El servidor de los paseos (solo con `NEXT_PUBLIC_DATOS=servidor`). */
let remotoPaseos: RemotoPaseos | null = null

/**
 * Lo que se guarda en este teléfono. Con servidor y una sesión abierta, lo personal (cuenta, casa, perros, postulación,
 * pagos) queda atado a la cuenta (`lib/datos/propietario.ts`); sin servidor es el almacenamiento de siempre.
 */
const local = adaptadorPorCuenta(adaptadorLocal)

/**
 * ¿Esta persona está en la demostración? (el paseador de demostración, la cuenta de demostración o un paseo con un
 * paseador de ejemplo). Se lee SIEMPRE del teléfono. Lo de la demostración nunca sale del teléfono.
 */
function esDemoEnEsteNavegador(): boolean {
  const quien = remotoPaseos?.identidad() ?? null
  // El paseador de demostración es de quien entró como paseador (o no tiene sesión): una familia con sesión no lo es,
  // aunque en este navegador alguien haya probado esa demostración antes.
  if (local.leer<number>(CLAVES.demo, 0) === 1 && quien?.rol !== 'familia' && quien?.rol !== 'equipo') return true
  const cuenta = local.leer<Partial<Persisted> | null>(CLAVES.cuenta, null)
  if (esCuentaDeEjemplo(cuenta?.account ?? null)) return true
  // Con una sesión real abierta manda el servidor: un paseo de ejemplo que quedó de una demostración anterior no cuenta.
  if (quien) return false
  return normalizarPaseos(local.leer<unknown>(CLAVES.paseo, null)).some((j) => esPaseadorDeEjemplo(j.walkerId))
}

/** Lo que no sale del teléfono aunque todavía no se sepa que es demostración (al crearse). */
function siempreLocal(clave: string, valor?: unknown): boolean {
  if (clave === CLAVES.demo || clave === CLAVES.ejemplos) return true
  if (clave === CLAVES.cuenta) return esCuentaDeEjemplo((valor as Partial<Persisted> | null | undefined)?.account ?? null)
  if (clave === CLAVES.paseo && valor !== undefined) return normalizarPaseos(valor).some((j) => esPaseadorDeEjemplo(j.walkerId))
  return false
}

/**
 * Con qué trabaja la app: `NEXT_PUBLIC_DATOS` (`local` por defecto; `servidor` más adelante). Cambiarlo aquí cambia de
 * dónde salen los datos de TODAS las pantallas. Si `servidor` no está configurado, vuelve a local y lo dice en la consola.
 */
const eleccion = elegirAdaptador({
  valor: process.env.NEXT_PUBLIC_DATOS,
  local,
  // Pasos 6a a 9 de docs/PLAN-SERVIDOR.md: con servidor, los paseos, su bitácora, el chat, los pagos, dónde cobra el
  // paseador, las fotos y el inicio y el fin del paseo viven en la base y el almacén privado (con la sesión de cada
  // persona). Lo demás (la cuenta, la postulación) sigue en el teléfono; la memoria del motor de avisos de ubicación, siempre.
  servidor: () => {
    if (!accesoActivo()) return null
    remotoPaseos = crearRemotoPaseos({
      cliente: clientePaseosDeLaApp,
      leerFamilia: () => {
        const c = leerCuenta(local)
        return { account: c.account, emergencia: c.emergencia }
      },
      almacenLocal: local,
      // Los bytes de las fotos de este teléfono: de ahí salen al almacén privado.
      almacenFotos: almacenDelNavegador(),
    })
    return remotoPaseos
  },
  clavesDelServidor: CLAVES_DEL_SERVIDOR,
  prueba: () => crearRemotoDePrueba({ almacen: 'navegador' }),
  esDemo: esDemoEnEsteNavegador,
  siempreLocal,
  enNavegador: typeof window !== 'undefined',
  registrar: (m) => console.warn(m),
})
export const adaptador: Adaptador = eleccion.adaptador
// Con servidor, lo personal se guarda por cuenta desde ya (y no se lee ni se escribe hasta saber la sesión).
if (eleccion.modo === 'servidor') activarPorCuenta()
/** Con qué modo quedó la app (`local`, `prueba`, …). */
export const modoDeDatos = eleccion.modo

/** Quién es esta persona según el servidor (null en el teléfono: no hay sesión). */
function identidadActual() {
  return copiaEnUso(adaptador)?.identidad() ?? null
}
/** Cuántos paseos guarda a la vez: uno en el teléfono (como siempre), varios con servidor. */
function capacidadDePaseos(): number {
  return copiaEnUso(adaptador) ? CAPACIDAD_SERVIDOR : CAPACIDAD_LOCAL
}
const SIN_DESCARTADOS: string[] = []
/**
 * Los paseos que la familia cerró en su pantalla («Buscar otro paseador»). La base no borra paseos, así que se recuerdan
 * aquí (solo en este teléfono) para que no vuelvan a aparecer. Solo se usa con servidor.
 */
const descartados = valorCompartido<string[]>(adaptador, CLAVES.descartados, SIN_DESCARTADOS)

/** El paseo activo de esta persona. Si la familia ya cerró el más reciente, no hay activo (no vuelve uno más viejo). */
function paseoActivoVisible(lista: readonly Job[]): Job | null {
  const quien = identidadActual()
  const activo = paseoActivoDe(lista, quien)
  if (activo && quien?.rol === 'familia' && descartados.leer().includes(activo.id)) return null
  return activo
}
/** El id del paseo activo de esta persona (leído ahora). */
function idDelPaseoActivo(): string | undefined {
  return paseoActivoVisible(normalizarPaseos(adaptador.leer<unknown>(CLAVES.paseo, null)))?.id
}

/* ------------------------------------------------------------------ */
/* Funciones puras con adaptador (se prueban con adaptadorMemoria)      */
/* ------------------------------------------------------------------ */

export function leerCuenta(a: Adaptador): Persisted {
  const guardado = a.leer<Partial<Persisted> | null>(CLAVES.cuenta, null)
  return guardado ? { ...EMPTY, ...guardado } : EMPTY
}
export function guardarCuenta(a: Adaptador, s: Persisted) {
  a.guardar(CLAVES.cuenta, s)
}
export function borrarCuenta(a: Adaptador) {
  a.borrar(CLAVES.cuenta)
}

export function leerPostulacion(a: Adaptador): WalkerApplication | null {
  return migrarPostulacion(a.leer<unknown>(CLAVES.postulacion, null))
}
export function guardarPostulacion(a: Adaptador, p: WalkerApplication | null) {
  if (p) a.guardar(CLAVES.postulacion, p)
  else a.borrar(CLAVES.postulacion)
}

export interface VistaDni {
  walkerId: string
  at: string
}
export function leerVistasDni(a: Adaptador, walkerId: string): VistaDni[] {
  return a.leer<VistaDni[]>(CLAVES.vistasDni, []).filter((v) => v.walkerId === walkerId)
}
export function registrarVistaDni(a: Adaptador, walkerId: string, ahora: Date = new Date()) {
  a.guardar(CLAVES.vistasDni, [...a.leer<VistaDni[]>(CLAVES.vistasDni, []), { walkerId, at: ahora.toISOString() }])
}

export function leerCasos(a: Adaptador): Caso[] {
  return a.leer<Caso[]>(CLAVES.casos, [])
}
export function guardarCasos(a: Adaptador, casos: Caso[]) {
  a.guardar(CLAVES.casos, casos)
}
/** Agrega un caso a la cola del equipo (sin repetir uno abierto del mismo paseo y tipo). */
export function abrirCasoEnCola(a: Adaptador, nuevo: Caso) {
  guardarCasos(a, abrirCaso(leerCasos(a), nuevo))
}

export function leerPaseadorAprobado(a: Adaptador): Walker | null {
  const p = leerPostulacion(a)
  return p ? walkerDesdePostulacion(p) : null
}

/* ------------------------------------------------------------------ */
/* Hooks                                                                */
/* ------------------------------------------------------------------ */

type Setter<T> = (v: T | ((prev: T) => T)) => void

/**
 * Las pantallas de ESTA pestaña que leen la misma clave. El evento «storage» solo avisa a otras pestañas; con servidor,
 * donde varias pantallas escriben el mismo paseo, quien cambia algo avisa a las demás de su pestaña (si no, una pantalla
 * con lo viejo podría volver a escribirlo). Sin servidor no se usa: todo sigue como siempre.
 */
const lectoresDeLaClave = new Map<string, Set<() => void>>()

/**
 * Un valor compartido entre pestañas del mismo navegador. Se actualiza solo cuando otra pestaña escribe.
 * Empieza en `porDefecto` y lee lo guardado después de montar (así servidor y cliente pintan lo mismo).
 */
export function useDato<T>(clave: string, porDefecto: T, decodificar?: (v: T) => T, codificar?: (v: T) => unknown): [T, Setter<T>] {
  const base = useRef(porDefecto)
  const decodifica = useRef(decodificar)
  const codifica = useRef(codificar)
  const [valor, setValor] = useState<T>(porDefecto)
  const actual = useRef(valor)
  const releer = useRef<() => void>(() => undefined)
  useEffect(() => {
    actual.current = valor
  })

  useEffect(() => {
    const leer = () => {
      const guardado = adaptador.leer(clave, base.current)
      const v = decodifica.current ? decodifica.current(guardado) : guardado
      actual.current = v
      setValor(v)
    }
    releer.current = leer
    leer()
    const baja = adaptador.suscribir(clave, leer)
    const lectores = lectoresDeLaClave.get(clave) ?? new Set<() => void>()
    lectoresDeLaClave.set(clave, lectores)
    lectores.add(leer)
    return () => {
      baja()
      lectores.delete(leer)
    }
  }, [clave])

  const poner = useCallback<Setter<T>>(
    (v) => {
      const conServidor = copiaEnUso(adaptador) !== null
      if (conServidor) {
        // Con servidor otra pantalla pudo cambiar esto hace un momento: se parte de lo último guardado, no de lo que
        // esta pantalla leyó antes.
        const guardado = adaptador.leer(clave, base.current)
        actual.current = decodifica.current ? decodifica.current(guardado) : guardado
      }
      const siguiente = typeof v === 'function' ? (v as (p: T) => T)(actual.current) : v
      actual.current = siguiente
      setValor(siguiente)
      adaptador.guardar(clave, codifica.current ? codifica.current(siguiente) : siguiente)
      if (conServidor) lectoresDeLaClave.get(clave)?.forEach((leer) => leer !== releer.current && leer())
    },
    [clave],
  )
  return [valor, poner]
}

/** La cola de reportes y entregas sin confirmar (la lee /admin). */
export function useCasos(): [Caso[], Setter<Caso[]>] {
  return useDato<Caso[]>(CLAVES.casos, [])
}

/** Para abrir un caso en la cola del equipo (un reporte, o una entrega sin confirmar). */
export function useAbrirCaso(): (caso: Caso) => void {
  return useCallback((caso: Caso) => abrirCasoEnCola(adaptador, caso), [])
}

/** La hora de ahora, actualizada cada `cadaMs` (para plazos que se muestran en pantalla). 0 mientras carga. */
export function useAhora(cadaMs = 30_000): number {
  const [ahora, setAhora] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setAhora(Date.now()), 0)
    const id = setInterval(() => setAhora(Date.now()), cadaMs)
    return () => {
      clearTimeout(t)
      clearInterval(id)
    }
  }, [cadaMs])
  return ahora
}

const SIN_PASEOS: Job[] = []

/**
 * Todos los paseos guardados. En el teléfono hay uno solo (el formato de siempre: un `Job` suelto); con servidor,
 * varios. Cada pantalla pide solo el suyo con `usePaseoActivo`.
 */
export function usePaseos(): [Job[], Setter<Job[]>] {
  return useDato<Job[]>(CLAVES.paseo, SIN_PASEOS, (v) => normalizarPaseos(v), (lista) => empaquetarPaseos(lista, capacidadDePaseos()))
}

/**
 * El paseo de ESTA persona: el que el dueño reservó y el paseador tiene asignado. Con varios paseos (servidor) es el más
 * reciente de los suyos; en el teléfono es el único que hay. Quien lo cambia (`setJob`) cambia solo ese paseo.
 */
export function usePaseoActivo(): [Job | null, Setter<Job | null>] {
  const [lista, setLista] = usePaseos()
  // Se lee aquí para que la pantalla se actualice cuando la familia cierra un paseo.
  useSyncExternalStore(descartados.suscribir, descartados.leer, () => SIN_DESCARTADOS)
  const activo = paseoActivoVisible(lista)
  const poner = useCallback<Setter<Job | null>>(
    (v) => {
      setLista((cur) => {
        const quien = identidadActual()
        const actual = paseoActivoVisible(cur)
        const siguiente = typeof v === 'function' ? (v as (p: Job | null) => Job | null)(actual) : v
        if (siguiente === actual) return cur
        // La base no borra paseos: lo que la familia cierra se recuerda en el teléfono.
        if (siguiente === null && actual && quien?.rol === 'familia') descartados.poner([...descartados.leer(), actual.id].slice(-100))
        return aplicarPaseoActivo(cur, actual, siguiente, quien, capacidadDePaseos())
      })
    },
    [setLista],
  )
  return [activo, poner]
}

/**
 * La lista de chat o de bitácora del paseo activo. Lo que se escribe queda marcado con el paseo (`jobId`) para que, con
 * varios paseos, cada uno vea lo suyo. En el teléfono (un solo paseo) se ve exactamente lo mismo que antes.
 */
function useListaDelPaseo<T extends ChatMsg | LiveEvent>(clave: string): [T[], Setter<T[]>] {
  const [todos, setTodos] = useDato<T[]>(clave, [])
  const filtrar = copiaEnUso(adaptador) !== null
  const visibles = filtrar ? deEstePaseo(todos, idDelPaseoActivo()) : todos
  const poner = useCallback<Setter<T[]>>(
    (v) => {
      setTodos((cur) => {
        const ahora = copiaEnUso(adaptador) !== null
        const id = idDelPaseoActivo()
        const vis = ahora ? deEstePaseo(cur, id) : cur
        const sig = typeof v === 'function' ? (v as (p: T[]) => T[])(vis) : v
        const marcados = marcarConPaseo(sig, id)
        return ahora ? [...cur.filter((m) => !vis.includes(m)), ...marcados] : marcados
      })
    },
    [setTodos],
  )
  return [visibles, poner]
}

/**
 * Plazos automáticos (los hace «el sistema»): la solicitud vence si el paseador no contesta y, si el dueño no confirma la
 * entrega, se le manda un recordatorio. La entrega NO se confirma sola: queda «Entrega sin confirmar» para el equipo.
 * Lo usa cada app mientras está abierta; si las dos están abiertas, la segunda no hace nada (el estado ya cambió).
 */
export function usePlazos(job: Job | null, setJob: Setter<Job | null>) {
  useEffect(() => {
    const revisar = () => {
      const j = job
      if (!j) return
      const ahora = Date.now()
      if (solicitudVencida(j.paseo, ahora, CONFIG.minutosParaAceptar)) {
        setJob((cur) => moverPaseo(cur, 'expirar', 'sistema', Date.now()))
      } else if (tocaRecordatorio(j.paseo, ahora, CONFIG.minutosRecordatorio)) {
        setJob((cur) => moverPaseo(cur, 'recordar', 'sistema', Date.now()))
        // Pasó el tiempo sin que el dueño confirme: no se confirma sola, queda para que el equipo la mire.
        abrirCasoEnCola(adaptador, casoEntregaSinConfirmar(j, ahora, pagoDe(adaptador.leer<Pago[]>(CLAVES.pagos, []), j.id)))
      }
    }
    // Se revisa al cargar y cada vez que cambia el encargo; mientras tanto, cada 15 segundos.
    revisar()
    const id = setInterval(revisar, 15_000)
    return () => clearInterval(id)
  }, [job, setJob])
}
export function useChat(): [ChatMsg[], Setter<ChatMsg[]>] {
  return useListaDelPaseo<ChatMsg>(CLAVES.chat)
}
export function useEventos(): [LiveEvent[], Setter<LiveEvent[]>] {
  return useListaDelPaseo<LiveEvent>(CLAVES.eventos)
}
const SIN_PAGOS: Pago[] = []
/** Un solo libro por pestaña: todas las pantallas (y los hooks de `useAccionesPago` y `useSincronizarPago`) lo comparten. */
// Se leen también los pagos de cuando el pago era antes del paseo (normalizarPagos traduce los estados viejos).
const libroDePagos = valorCompartido<Pago[]>(adaptador, CLAVES.pagos, SIN_PAGOS, normalizarPagos)

/**
 * ¿Los pagos de esta persona viven en la base ahora? (Paso 7: solo con `NEXT_PUBLIC_DATOS=servidor`, con una sesión
 * abierta y fuera de la demostración.) Entonces el libro solo se LEE: lo crea la base al pedir el paseo, lo mantiene al
 * día cuando el paseo avanza y las acciones pasan por `mover_pago`. En el teléfono y en la demostración nada cambia.
 */
function pagosEnLaBase(): boolean {
  return remotoPaseos !== null && copiaEnUso(adaptador) !== null
}

/**
 * El libro de pagos (lib/pagos.ts): lo leen las dos apps y /admin. Un pago por paseo.
 * Son los montos y el estado de lo que la familia le paga a Patitas y Patitas le paga al paseador.
 * Se comparte entre todas las pantallas de la pestaña y entre pestañas (a diferencia de `useDato`, dos usos a la vez no
 * se pisan: lo que escribe uno lo ven los demás al instante).
 * Con servidor, cada persona recibe de la base solo los suyos (la familia, los de sus paseos; el paseador, los suyos; el
 * equipo, todos) y escribir aquí no hace nada: los pagos solo se mueven con `useAccionesPago`.
 */
export function usePagos(): [Pago[], Setter<Pago[]>] {
  const lista = useSyncExternalStore(libroDePagos.suscribir, libroDePagos.leer, () => SIN_PAGOS)
  const poner = useCallback<Setter<Pago[]>>((v) => {
    if (pagosEnLaBase()) return
    const siguiente = typeof v === 'function' ? (v as (p: Pago[]) => Pago[])(libroDePagos.leer()) : v
    if (siguiente !== libroDePagos.leer()) libroDePagos.poner(siguiente)
  }, [])
  return [lista, poner]
}

/** Lo que devuelve una acción de pago: el pago nuevo o, si no se pudo, el motivo en lenguaje simple. */
export type AccionDePago = (id: string, accion: AccionPago, quien: ActorPago, datos?: { nota?: string; hora?: string }) => Promise<ResultadoPago>

/**
 * Hace una acción sobre el pago de un paseo (el paseador dice «Vi el pago»; el equipo no lo encuentra o paga al
 * paseador). Devuelve el resultado: si no se pudo, el motivo en lenguaje simple.
 *
 * En el teléfono y en la demostración es al instante, como siempre. Con servidor la base decide (`mover_pago`): recién
 * cuando contesta que sí el pago cambia en pantalla. Sin internet la acción espera y se reintenta sola, sin repetirse, y
 * mientras tanto NADA queda marcado (en especial, nunca «Pagado al paseador» sin que la base lo confirme).
 */
export function useAccionesPago(): AccionDePago {
  const [, setLista] = usePagos()
  return useCallback(
    async (id, accion, quien, datos = {}): Promise<ResultadoPago> => {
      if (pagosEnLaBase() && remotoPaseos) return remotoPaseos.moverPago(id, accion, datos)
      let resultado: ResultadoPago = { ok: false, motivo: 'No existe ese pago.' }
      setLista((cur) => {
        const p = cur.find((x) => x.id === id)
        if (!p) return cur
        resultado = intentarPago(p, accion, quien, Date.now(), datos)
        return resultado.ok ? actualizarPago(cur, id, () => (resultado as { ok: true; pago: Pago }).pago) : cur
      })
      return resultado
    },
    [setLista],
  )
}

const SIN_COLA: ReadonlyArray<{ id: string; accion: AccionPago }> = []

/** Las acciones de pago que esperan la respuesta de la base (también las que esperan internet). Vacío fuera del servidor. */
export function usePagosEnCola(): ReadonlyArray<{ id: string; accion: AccionPago }> {
  const clave = useSyncExternalStore(
    (aviso) => remotoPaseos?.alCambiarColaDePagos(aviso) ?? (() => undefined),
    () =>
      (remotoPaseos?.pagosEnCola() ?? [])
        .map((e) => `${e.id}|${e.accion}`)
        .sort()
        .join(','),
    () => '',
  )
  return useMemo(
    () =>
      clave === ''
        ? SIN_COLA
        : clave.split(',').map((x) => {
            const [id, accion] = x.split('|')
            return { id, accion: accion as AccionPago }
          }),
    [clave],
  )
}

const SIN_COBROS: Record<string, CobroPaseador> = {}
const cobrosDeLaBase = valorCompartido<Record<string, CobroPaseador>>(adaptador, CLAVES.cobros, SIN_COBROS)

/**
 * Dónde cobra cada paseador, según la base (por id del paseador). El paseador recibe solo el suyo y el equipo los de sus
 * pagos; la familia, ninguno. Fuera del servidor está vacío (el cobro vive en la postulación, como siempre).
 */
export function useCobrosDeLaBase(): Record<string, CobroPaseador> {
  return useSyncExternalStore(cobrosDeLaBase.suscribir, cobrosDeLaBase.leer, () => SIN_COBROS)
}

/**
 * Con servidor, sube a la base dónde cobra ESTE paseador (Yape o Plin, su celular y el titular) cuando lo completa o lo
 * cambia. Lo ve él y el equipo; nunca la familia. Incompleto no se sube. En el teléfono y en la demostración no hace nada.
 */
export function useSincronizarCobro(cobro: CobroPaseador | undefined, demo: boolean) {
  const servidor = useServidor()
  const metodo = cobro?.metodo
  const telefono = cobro?.telefono
  const titular = cobro?.titular
  useEffect(() => {
    if (demo || !servidor.activo || servidor.rol !== 'paseador' || !servidor.id || !pagosEnLaBase()) return
    const actual: CobroPaseador | undefined = metodo !== undefined && telefono !== undefined && titular !== undefined ? { metodo, telefono, titular } : undefined
    if (!actual || !cobroRegistrado(actual)) return
    // Hasta no haber bajado lo de la base, lo que se guarde se descartaría: se espera.
    if (!copiaEnUso(adaptador)?.listo()) return
    const enBase = adaptador.leer<Record<string, CobroPaseador>>(CLAVES.cobros, {})[servidor.id]
    if (mismoCobro(enBase, actual)) return
    adaptador.guardar(CLAVES.cobros, { [servidor.id]: actual })
  }, [demo, servidor.activo, servidor.rol, servidor.id, metodo, telefono, titular])
}

/**
 * Mantiene al día, en el pago, cómo va el paseo (para saber si ya toca pagar y desde cuándo corre el plazo).
 * Si el encargo es de antes del libro de pagos (no tiene su pago), se lo crea a partir de la reserva: así ningún
 * paseo queda sin pago que verificar. Lo usan las apps mientras están abiertas; si no hay cambio, no escribe nada.
 * Con servidor no hace nada: la base crea el pago con el paseo y lo mantiene al día sola.
 */
export function useSincronizarPago(job: Job | null) {
  const [lista, setLista] = usePagos()
  const id = job?.id ?? null
  const estado = job?.paseo.estado ?? null
  const existente = id ? pagoDe(lista, id) : null
  const falta = !!job && !existente && !!job.reserva
  const desactualizado = !!existente && estado !== null && (existente.paseo !== estado || (PASEO_HECHO.includes(estado) && existente.hechoAt === undefined))
  useEffect(() => {
    if (!job || !id || !estado) return
    if (pagosEnLaBase()) return
    if (falta && job.reserva) {
      const r = job.reserva
      setLista((cur) =>
        agregarPago(
          cur,
          nuevoPago({
            jobId: id,
            walkerId: job.walkerId,
            paseador: job.walkerFirst,
            dueno: job.ownerFirst,
            perro: job.dog.name,
            cuando: job.slotLabel,
            reserva: r,
            at: job.createdAt,
            paseo: estado,
            demo: esPaseadorDeEjemplo(job.walkerId),
          }),
        ),
      )
    } else if (desactualizado) {
      setLista((cur) => sincronizarPaseo(cur, id, estado, Date.now()))
    }
  }, [falta, desactualizado, id, estado, job, setLista])
}

/** Para la app del cliente: ¿hay un paseador conectado en otra pestaña? (latido cada 3 s) */
export function usePaseadorConectado() {
  const [conectado, setConectado] = useState(false)
  useEffect(() => {
    const revisar = () => setConectado(Date.now() - adaptador.leer<number>(CLAVES.presencia, 0) < 9000)
    revisar()
    const id = setInterval(revisar, 2500)
    return () => clearInterval(id)
  }, [])
  return conectado
}

/** Para la app del paseador: avisa que está conectado. */
export function useLatidoPaseador(activo: boolean) {
  useEffect(() => {
    if (!activo) return
    const latir = () => adaptador.guardar(CLAVES.presencia, Date.now())
    latir()
    const id = setInterval(latir, 3000)
    return () => clearInterval(id)
  }, [activo])
}

/** La postulación del paseador, guardada en el navegador y sincronizada entre pestañas (app, panel interno). */
export function usePostulacion(): {
  app: WalkerApplication | null
  ready: boolean
  update: (fn: (a: WalkerApplication) => WalkerApplication) => void
  reset: () => void
  set: (a: WalkerApplication) => void
} {
  const [app, setApp] = useState<WalkerApplication | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setApp(leerPostulacion(adaptador))
    setReady(true)
    return adaptador.suscribir(CLAVES.postulacion, () => setApp(leerPostulacion(adaptador)))
  }, [])

  const set = useCallback((a: WalkerApplication) => {
    setApp(a)
    guardarPostulacion(adaptador, a)
  }, [])
  const update = useCallback((fn: (a: WalkerApplication) => WalkerApplication) => {
    setApp((cur) => {
      const siguiente = fn(cur ?? { ...EMPTY_APP, createdAt: new Date().toISOString(), code: makeCode() })
      guardarPostulacion(adaptador, siguiente)
      return siguiente
    })
  }, [])
  const reset = useCallback(() => {
    setApp(null)
    guardarPostulacion(adaptador, null)
  }, [])
  return { app, ready, update, reset, set }
}

/**
 * La cuenta del dueño (cuenta, perros, reseñas, favoritos, contacto de emergencia).
 * `store` es null hasta que el navegador carga lo guardado.
 */
export function useCuenta(): {
  store: Persisted | null
  setStore: React.Dispatch<React.SetStateAction<Persisted | null>>
  patch: (p: Partial<Persisted>) => void
  reiniciar: () => void
} {
  const [store, setStore] = useState<Persisted | null>(null)

  useEffect(() => {
    const leer = () => setStore(leerCuenta(adaptador))
    leer()
    // Con servidor, al entrar o cambiar de cuenta se vuelve a leer lo de esa cuenta (cada una guarda lo suyo).
    const bajaDueno = alCambiarPropietario(leer)
    // Con servidor, la cuenta baja un instante después: se vuelve a leer cuando llega. En el teléfono no hace falta.
    const baja = copiaEnUso(adaptador) ? adaptador.suscribir(CLAVES.cuenta, leer) : undefined
    return () => {
      bajaDueno()
      baja?.()
    }
  }, [])
  useEffect(() => {
    if (store) guardarCuenta(adaptador, store)
  }, [store])

  const patch = useCallback((p: Partial<Persisted>) => setStore((s) => (s ? { ...s, ...p } : s)), [])
  const reiniciar = useCallback(() => {
    borrarCuenta(adaptador)
    setStore(EMPTY)
  }, [])
  return { store, setStore, patch, reiniciar }
}

/** El paseador aprobado desde el panel interno, para mostrarlo como «nuevo» en la app del cliente. */
export function usePaseadorAprobado(): Walker | null {
  const [paseador, setPaseador] = useState<Walker | null>(null)
  useEffect(() => {
    const leer = () => setPaseador(leerPaseadorAprobado(adaptador))
    leer()
    return adaptador.suscribir(null, leer, { alEnfocar: true })
  }, [])
  return paseador
}

/** Quién abrió la hoja del DNI de este paseador. */
export function useVistasDni(walkerId: string): VistaDni[] {
  const [vistas, setVistas] = useState<VistaDni[]>([])
  useEffect(() => {
    const leer = () => setVistas(leerVistasDni(adaptador, walkerId))
    leer()
    return adaptador.suscribir(CLAVES.vistasDni, leer, { alEnfocar: true })
  }, [walkerId])
  return vistas
}

/** Los recordatorios de reserva que ya se avisaron en este teléfono. */
export function leerRecordados(): Set<string> {
  const lista = adaptador.leer<unknown>(CLAVES.recordados, [])
  return new Set(Array.isArray(lista) ? lista.filter((x): x is string => typeof x === 'string') : [])
}
export function guardarRecordados(s: ReadonlySet<string>): void {
  adaptador.guardar(CLAVES.recordados, [...s].slice(-200))
}

/**
 * Datos sueltos que solo viven en este teléfono (calificaciones por barras, preferencias de avisos, academia). Leer
 * devuelve `porDefecto` si no hay nada o está dañado; guardar nunca revienta.
 */
export function leerDelTelefono<T>(clave: (typeof CLAVES)['calificaciones' | 'avisosPreferencias' | 'academia'], porDefecto: T): T {
  return adaptador.leer<T>(clave, porDefecto)
}
export function guardarEnTelefono<T>(clave: (typeof CLAVES)['calificaciones' | 'avisosPreferencias' | 'academia'], valor: T): void {
  adaptador.guardar(clave, valor)
}

/** Para la app del cliente: anota que abrió la hoja del DNI de un paseador. */
export function useRegistrarVistaDni(): (walkerId: string) => void {
  return useCallback((walkerId: string) => registrarVistaDni(adaptador, walkerId), [])
}

/** «Entrar como paseador de demostración». Se recuerda en este navegador. */
export function useModoDemo(): { demo: boolean; entrar: () => void; salir: () => void } {
  const [demo, setDemo] = useState(false)
  useEffect(() => {
    const leer = () => setDemo(adaptador.leer<number>(CLAVES.demo, 0) === 1)
    leer()
    const bajaDueno = alCambiarPropietario(leer)
    const baja = copiaEnUso(adaptador) ? adaptador.suscribir(CLAVES.demo, leer) : undefined
    return () => {
      bajaDueno()
      baja?.()
    }
  }, [])
  const entrar = useCallback(() => {
    adaptador.guardar(CLAVES.demo, 1)
    setDemo(true)
  }, [])
  const salir = useCallback(() => {
    adaptador.borrar(CLAVES.demo)
    setDemo(false)
  }, [])
  return { demo, entrar, salir }
}

/* ------------------------------------------------------------------ */
/* Fotos del paseo                                                      */
/* ------------------------------------------------------------------ */

const SIN_FOTOS: FotoPaseo[] = []
let fotosLeidas: { version: number; lista: FotoPaseo[] } | null = null
function suscribirFotos(aviso: () => void): () => void {
  const invalidar = () => {
    fotosLeidas = null
    aviso()
  }
  // Otras pestañas (evento «storage») y esta misma (cuando se guarda una foto aquí)
  const bajaOtras = adaptador.suscribir(CLAVES.fotos, invalidar)
  const bajaEsta = alCambiarFotos(invalidar)
  // Con servidor, las fotos que trae la base (las de mis paseos y la foto de hoy de mi paseador).
  const bajaServidor = adaptador.suscribir(CLAVES.fotosServidor, invalidar)
  return () => {
    bajaOtras()
    bajaEsta()
    bajaServidor()
  }
}
function fotosActuales(): FotoPaseo[] {
  const v = versionDeFotos()
  if (!fotosLeidas || fotosLeidas.version !== v) {
    // Las de este teléfono (con sus bytes) y, con servidor, las que la base trae y este teléfono no tiene. Sin servidor, las de siempre.
    const delServidor = adaptador.leer<FotoPaseo[]>(CLAVES.fotosServidor, [])
    fotosLeidas = { version: v, lista: mezclarFotos(leerFotos(adaptador), Array.isArray(delServidor) ? delServidor : []) }
  }
  return fotosLeidas.lista
}

/** Los datos de las fotos (hora, lugar, código) de todos los paseos de este navegador. Se actualiza solo, aquí y entre pestañas. */
export function useFotosPaseo(): FotoPaseo[] {
  return useSyncExternalStore(suscribirFotos, fotosActuales, () => SIN_FOTOS)
}

/**
 * La imagen de una foto, lista para un <img>. `falta` = no está en el almacén (por ejemplo, la guardó otra pestaña en
 * un navegador sin IndexedDB, o se borró): la pantalla dice «No se pudo cargar la foto».
 * Una foto que viene del servidor (`almacen: 'servidor'`) se ve con un ENLACE QUE VENCE que pide la app; si la persona no
 * puede verla, o no hay internet, también dice «No se pudo cargar la foto».
 */
export function useFotoUrl(foto: { id: string; almacen?: FotoPaseo['almacen']; ruta?: string } | null): { url: string | null; estado: 'cargando' | 'lista' | 'falta' } {
  const id = foto?.id ?? null
  const rutaRemota = foto?.almacen === 'servidor' ? (foto.ruta ?? null) : null
  const [cargada, setCargada] = useState<{ id: string; url: string | null }>({ id: '', url: null })
  useEffect(() => {
    if (!id) return
    let activo = true
    if (rutaRemota) {
      // Sin servidor no hay de dónde sacar la imagen: se dice «No se pudo cargar la foto» (siempre en un callback).
      const pedido = remotoPaseos ? remotoPaseos.enlaceDeFoto(rutaRemota) : Promise.reject(new Error('Sin servidor.'))
      pedido.then((url) => activo && setCargada({ id, url })).catch(() => activo && setCargada({ id, url: null }))
      return () => {
        activo = false
      }
    }
    let objeto: string | null = null
    almacenDelNavegador()
      .leer(id)
      .then((v) => {
        if (!activo) return
        if (v) objeto = URL.createObjectURL(new Blob([v.bytes], { type: v.tipo }))
        setCargada({ id, url: objeto })
      })
    return () => {
      activo = false
      if (objeto) URL.revokeObjectURL(objeto)
    }
  }, [id, rutaRemota])
  if (!id || cargada.id !== id) return { url: null, estado: 'cargando' }
  return cargada.url ? { url: cargada.url, estado: 'lista' } : { url: null, estado: 'falta' }
}

/**
 * Guarda una foto del paseo (datos + imagen). Si no cabe, lo dice; el paseo no se toca. La foto queda PRIMERO en este
 * teléfono; con servidor se envía sola al almacén privado (sin internet, cuando vuelva).
 */
export function useGuardarFoto(): (e: EntradaFoto) => Promise<ResultadoFoto> {
  return useCallback(async (e: EntradaFoto) => {
    const r = await guardarFoto({ adaptador, almacen: almacenDelNavegador() }, e)
    if (r.ok) void remotoPaseos?.sincronizarFotos()
    return r
  }, [])
}

/** Guarda la foto de hoy del paseador (una por día): primero en este teléfono y, con servidor, se envía sola. */
export function useGuardarSelfie(): (e: { walkerId: string; bytes: ArrayBuffer; tipo?: string; t: number }) => Promise<ResultadoFoto> {
  return useCallback(async (e) => {
    const r = await guardarSelfie({ adaptador, almacen: almacenDelNavegador() }, e)
    if (r.ok) void remotoPaseos?.sincronizarFotos()
    return r
  }, [])
}

const SIN_ENVIAR: ReadonlyMap<string, string | null> = new Map()

/**
 * Las fotos de este teléfono que todavía NO llegaron al servidor, por id de la foto: `null` = esperando (se envía sola
 * cuando haya internet) y un texto = la base dijo que no. Vacío fuera del servidor.
 */
export function useFotosSinEnviar(): ReadonlyMap<string, string | null> {
  const clave = useSyncExternalStore(
    (aviso) => {
      const a = remotoPaseos?.alCambiarSubidaDeFotos(aviso)
      const b = alCambiarFotos(aviso)
      return () => {
        a?.()
        b()
      }
    },
    () =>
      [...(remotoPaseos?.fotosSinSubir() ?? [])]
        .map(([id, motivo]) => `${id}\t${motivo ?? ''}`)
        .sort()
        .join('\n'),
    () => '',
  )
  return useMemo(
    () =>
      clave === ''
        ? SIN_ENVIAR
        : new Map(
            clave.split('\n').map((l) => {
              const [id, motivo] = l.split('\t')
              return [id, motivo || null] as [string, string | null]
            }),
          ),
    [clave],
  )
}

/**
 * Cuando empieza otro paseo: solo se conservan las fotos de estos paseos (libera espacio). Con servidor, las que todavía no
 * se enviaron NO se sueltan: se perderían sin haber llegado a la familia.
 */
export function conservarFotosDelPaseo(jobIds: string[]): Promise<void> {
  const sinEnviar = [...(remotoPaseos?.fotosSinSubir().keys() ?? [])]
  const pendientes = leerFotos(adaptador).filter((f) => sinEnviar.includes(f.id))
  return conservarFotosDe({ adaptador, almacen: almacenDelNavegador() }, [...jobIds, ...pendientes.map((f) => f.jobId)])
}

/** «Reiniciar la demostración»: no queda ninguna foto. */
export function reiniciarFotos(): Promise<void> {
  return borrarTodasLasFotos({ adaptador, almacen: almacenDelNavegador() })
}

/**
 * Después de borrar una cuenta en el servidor: en este teléfono no queda nada de ella (ni sus datos guardados por cuenta ni
 * las fotos que todavía estuvieran aquí). Lo suelto de la demostración y del modo local no se toca.
 */
export async function borrarDatosDeEstaCuenta(cuentaId: string): Promise<void> {
  borrarLoDeLaCuenta(adaptadorLocal, cuentaId)
  await reiniciarFotos()
}

/* ------------------------------------------------------------------ */
/* «Mostrar ejemplos»                                                   */
/* ------------------------------------------------------------------ */

const ejemplosElegidos = valorCompartido<boolean | null>(adaptador, CLAVES.ejemplos, null)

/**
 * ¿Se muestran los datos de ejemplo (paseadores, reseñas y paseos inventados)? Lo que eligió la persona manda; si no
 * eligió, está encendido en la demostración y apagado en una cuenta real. Se actualiza en todas las pantallas a la vez.
 */
export function useMostrarEjemplos(account: Account | null): [boolean, (mostrar: boolean) => void] {
  const elegido = useSyncExternalStore(ejemplosElegidos.suscribir, ejemplosElegidos.leer, () => null)
  return [resolverMostrarEjemplos(elegido, account), ejemplosElegidos.poner]
}

const cuentaLeida = valorCompartido<Persisted | null>(adaptador, CLAVES.cuenta, null)

/** La cuenta del dueño, solo para LEERLA (por ejemplo, desde el panel interno): no escribe nada. */
export function useCuentaSoloLectura(): Account | null {
  const guardada = useSyncExternalStore(cuentaLeida.suscribir, cuentaLeida.leer, () => null)
  return guardada?.account ?? null
}

/* ------------------------------------------------------------------ */
/* Con servidor (paso 6a): conexión, identidad, paseadores, código       */
/* ------------------------------------------------------------------ */

/** El adaptador con copia del servidor (sin mirar si ahora atiende o no a la demostración). */
function copiaDelServidor(): AdaptadorConCopia | null {
  if (esEnrutado(adaptador)) return adaptador.copia
  return esConCopia(adaptador) ? adaptador : null
}

function suscribirServidor(aviso: () => void): () => void {
  const copia = copiaDelServidor()
  if (!copia) return () => undefined
  const a = copia.suscribirGuardado(aviso)
  const b = adaptador.suscribir(CLAVES.paseo, aviso)
  return () => {
    a()
    b()
  }
}

/**
 * ¿Esta persona trabaja con el servidor ahora? Solo con `NEXT_PUBLIC_DATOS=servidor`, con una sesión abierta y fuera
 * de la demostración. En el teléfono (modo local) y en la demostración es siempre `activo: false`.
 */
export function useServidor(): { activo: boolean; rol: Identidad['rol'] | null; id: string | null } {
  const clave = useSyncExternalStore(
    suscribirServidor,
    () => {
      const q = identidadActual()
      return q ? `${q.rol}:${q.id}` : ''
    },
    () => '',
  )
  if (!clave) return { activo: false, rol: null, id: null }
  const [rol, ...resto] = clave.split(':')
  return { activo: true, rol: rol as Identidad['rol'], id: resto.join(':') }
}

export interface EstadoServidor {
  /** Cómo está la conexión (siempre «conectado» fuera del servidor). */
  conexion: EstadoConexion
  /** Hay cambios hechos en esta pantalla que todavía no llegaron al servidor (se envían solos al volver internet). */
  pendientes: boolean
  /** Por qué la base dijo que NO al último cambio (null = nada que avisar). Se limpia solo. */
  rechazo: string | null
  cerrarRechazo: () => void
  /** Vuelve a intentar ahora lo que no se pudo subir o bajar. */
  reintentar: () => void
}

/** Lo que las dos apps muestran cuando no hay conexión o la base rechazó un cambio. */
export function useEstadoServidor(): EstadoServidor {
  const copia = copiaDelServidor()
  const conexion = useSyncExternalStore(
    suscribirServidor,
    () => (copia && copiaEnUso(adaptador) ? copia.estadoConexion() : 'conectado'),
    () => 'conectado' as EstadoConexion,
  )
  const guardado = useSyncExternalStore(
    suscribirServidor,
    () => (copia && copiaEnUso(adaptador) ? copia.estadoGuardado() : 'guardado'),
    () => 'guardado',
  )
  // Una acción de pago que espera a la base también es «algo que se envía solo al volver internet».
  const pagosEsperando = useSyncExternalStore(
    (aviso) => remotoPaseos?.alCambiarColaDePagos(aviso) ?? (() => undefined),
    () => (remotoPaseos?.pagosEnCola().length ?? 0) > 0,
    () => false,
  )
  const [rechazo, setRechazo] = useState<string | null>(null)
  useEffect(() => {
    if (!copia) return
    return copia.suscribirRechazos((r) => {
      // Un rechazo sin texto es un paso automático que perdió la carrera: no se le avisa a nadie.
      if (r.mensaje) setRechazo(r.mensaje)
    })
  }, [copia])
  useEffect(() => {
    if (!rechazo) return
    const t = setTimeout(() => setRechazo(null), 9000)
    return () => clearTimeout(t)
  }, [rechazo])
  const cerrarRechazo = useCallback(() => setRechazo(null), [])
  const reintentar = useCallback(() => {
    copia?.reintentar()
    remotoPaseos?.reintentarPagos()
    void remotoPaseos?.refrescar()
  }, [copia])
  return { conexion, pendientes: guardado !== 'guardado' || pagosEsperando, rechazo, cerrarRechazo, reintentar }
}

export type ResultadoEnvio = { ok: true } | { ok: false; mensaje: string; sinConexion: boolean }

/**
 * Con servidor: espera a que la base reciba (o rechace) las reseñas que se guardaron. Dice si llegó (`ok`) o si no (la base la
 * rechazó o no hay internet: se sigue intentando, pero todavía no llegó). Fuera del servidor ya está guardado.
 */
export function esperarGuardadoDeLasResenas(): Promise<boolean> {
  const copia = copiaEnUso(adaptador)
  if (!copia) return Promise.resolve(true)
  return copia.yaSeGuardo(CLAVES.resenas).then((estado) => estado === 'guardado')
}

/**
 * Con servidor: espera a que la base reciba (o rechace) lo último que se guardó de los paseos. Fuera del servidor ya
 * está guardado. Es lo que se espera antes de decir «solicitud enviada».
 */
export function esperarGuardadoDeLosPaseos(): Promise<ResultadoEnvio> {
  const copia = copiaEnUso(adaptador)
  if (!copia) return Promise.resolve({ ok: true })
  return new Promise<ResultadoEnvio>((resolver) => {
    let rechazo: string | null = null
    const baja = copia.suscribirRechazos((r) => {
      if (r.clave === CLAVES.paseo && r.mensaje) rechazo = r.mensaje
    })
    void copia.yaSeGuardo(CLAVES.paseo).then((estado) => {
      baja()
      if (rechazo) resolver({ ok: false, mensaje: rechazo, sinConexion: false })
      else if (estado === 'error') resolver({ ok: false, mensaje: TEXTO_SERVIDOR.envioSinConexion, sinConexion: true })
      else resolver({ ok: true })
    })
  })
}

export type ResultadoCodigo = 'ok' | 'mal' | 'sin_conexion'

/**
 * Comprueba el código de recojo. En el teléfono se compara con el del paseo; con servidor lo compara la base
 * (`verificar_codigo_recojo`): el paseador nunca lee el código y 5 intentos fallidos lo bloquean.
 */
export function useVerificarCodigo(): (job: Job, codigo: string) => Promise<ResultadoCodigo> {
  return useCallback(async (job: Job, codigo: string) => {
    if (!copiaEnUso(adaptador)) return codigo === job.pin ? 'ok' : 'mal'
    try {
      const cliente = await clientePaseosDeLaApp()
      if (!cliente) return 'sin_conexion'
      return (await cliente.verificarCodigo(job.id, codigo)) ? 'ok' : 'mal'
    } catch {
      return 'sin_conexion'
    }
  }, [])
}

const CADA_MINUTO_MS = 60_000

/**
 * Las reseñas que escribió esta familia con servidor (una por paseo): viven en la tabla `resenas` y, como el resto, se
 * guardan primero aquí y salen solas (sin internet esperan y no se duplican). Solo aplica con servidor y una sesión de familia.
 */
export function useMisResenas(): [Review[], Setter<Review[]>] {
  return useDato<Review[]>(CLAVES.resenas, [])
}

/**
 * Los paseadores aprobados que la base le entrega a la familia (`paseadores_publicos`). Fuera del servidor y fuera de
 * la sesión de una familia, `aplica` es false y la lista queda vacía: la app usa lo de siempre.
 */
export function usePaseadoresReales(sesionId: string | null): { aplica: boolean; paseadores: Walker[]; cargando: boolean; sinConexion: boolean; recargar: () => void } {
  // `sesionId`: la cuenta de familia con sesión (la da `useAccesoApp`). Sin ella, o sin servidor, no aplica.
  const aplica = sesionId !== null && accesoActivo()
  const [estado, setEstado] = useState<{ lista: Walker[]; leido: boolean; fallo: boolean }>({ lista: [], leido: false, fallo: false })
  const [intento, setIntento] = useState(0)
  useEffect(() => {
    if (!aplica) return
    let vivo = true
    const leer = async () => {
      try {
        const cliente = await clientePaseosDeLaApp()
        if (!cliente) throw new Error('sin cliente')
        const filas = await cliente.paseadoresPublicos()
        const lista = paseadoresDeVista(filas)
        // Las reseñas de los demás: si no llegan, los paseadores se ven igual (con su calificación y sin los comentarios).
        const resenas = await cliente.resenasDePaseadores(lista.map((w) => w.id)).catch(() => [])
        if (vivo) setEstado({ lista: conResenas(lista, resenas, sesionId, Date.now()), leido: true, fallo: false })
      } catch {
        if (vivo) setEstado((e) => ({ ...e, fallo: true }))
      }
    }
    void leer()
    const id = setInterval(() => void leer(), CADA_MINUTO_MS)
    const alVolver = () => {
      if (document.visibilityState !== 'hidden') void leer()
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      vivo = false
      clearInterval(id)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [aplica, intento, sesionId])
  const recargar = useCallback(() => setIntento((n) => n + 1), [])
  return { aplica, paseadores: aplica ? estado.lista : [], cargando: aplica && !estado.leido && !estado.fallo, sinConexion: aplica && estado.fallo, recargar }
}

export interface AprobacionServidor {
  /** `no_aplica`: no hay servidor, o la sesión no es de un paseador. */
  estado: 'no_aplica' | 'cargando' | 'aprobado' | 'no_aprobado' | 'sin_conexion'
  /** Lo que dice la base de este paseador (solo si está aprobado): la fila de la vista pública y dónde cobra. */
  vista: FilaCruda | null
  cobro: FilaCruda | null
  /** Vuelve a preguntarle a la base ahora («Reintentar»). */
  recargar: () => void
}

/** La app del paseador con lo que dice el servidor (si está aprobado); si no, la de este teléfono tal cual. */
export function appConAprobacion(delTelefono: WalkerApplication | null, a: AprobacionServidor): WalkerApplication | null {
  return a.estado === 'aprobado' && a.vista ? appAprobadaPorServidor(delTelefono, a.vista, a.cobro) : delTelefono
}

const CADA_20_SEGUNDOS_MS = 20_000

/**
 * ¿El equipo ya aprobó a este paseador? Lo dice la base (la vista `paseadores_publicos` solo trae aprobados): aunque
 * su postulación todavía no esté en el servidor, su app muestra «Hoy» y recibe solicitudes. Se vuelve a preguntar cada
 * 20 segundos y al volver a la pestaña, para que la aprobación aparezca sola.
 */
export function useAprobacionServidor(sesionId: string | null): AprobacionServidor {
  // `sesionId`: la cuenta de paseador con sesión (la da `useAccesoApp`). Sin ella, o sin servidor, no aplica.
  const id = sesionId
  const aplica = id !== null && accesoActivo()
  const [lectura, setLectura] = useState<{ id: string; vista: FilaCruda | null; cobro: FilaCruda | null } | { fallo: true } | null>(null)
  const [intento, setIntento] = useState(0)
  const recargar = useCallback(() => {
    setLectura(null)
    setIntento((n) => n + 1)
  }, [])
  useEffect(() => {
    if (!aplica || !id) return
    let vivo = true
    const leer = async () => {
      try {
        const cliente = await clientePaseosDeLaApp()
        if (!cliente) throw new Error('sin cliente')
        const filas = await cliente.paseadoresPublicos(id)
        const vista = filas.find((f) => f.paseador_id === id) ?? null
        const cobro = vista ? await cliente.miCobro(id) : null
        if (vivo) setLectura({ id, vista, cobro })
      } catch {
        if (vivo) setLectura((l) => (l && 'vista' in l ? l : { fallo: true }))
      }
    }
    void leer()
    const t = setInterval(() => void leer(), CADA_20_SEGUNDOS_MS)
    const alVolver = () => {
      if (document.visibilityState !== 'hidden') void leer()
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      vivo = false
      clearInterval(t)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [aplica, id, intento])
  return useMemo((): AprobacionServidor => {
    const nada = { vista: null, cobro: null, recargar }
    if (!aplica) return { estado: 'no_aplica', ...nada }
    if (!lectura) return { estado: 'cargando', ...nada }
    if ('fallo' in lectura) return { estado: 'sin_conexion', ...nada }
    if (lectura.id !== id) return { estado: 'cargando', ...nada }
    if (!lectura.vista) return { estado: 'no_aprobado', ...nada }
    return { estado: 'aprobado', vista: lectura.vista, cobro: lectura.cobro, recargar }
  }, [aplica, lectura, id, recargar])
}

export { TEXTO_SERVIDOR }
export { useMiPostulacionEnElServidor, usePostulacionesDelEquipo } from './revisionServidor'
export type { PostulacionesDelEquipo, PostulacionPropiaDelServidor } from './revisionServidor'


/* ------------------------------------------------------------------ */
/* «Pedir paseo» (Bloque 2)                                            */
/* ------------------------------------------------------------------ */

export type ResultadoPedido = { ok: true } | { ok: false; mensaje: string }

export interface PedidoDeLaFamilia {
  /** Mi pedido más reciente (con su estado de ahora: un pedido que pasó de hora se ve «vencido»). null = ninguno. */
  pedido: Pedido | null
  /** ¿Hay un pedido abierto o con respuestas? (Solo se puede tener uno.) */
  activo: boolean
  pedir: (pedido: Pedido, dueno: string) => Promise<ResultadoPedido>
  cancelar: () => Promise<void>
  /** Marca la oferta como elegida. Con servidor lleva el id del paseo que ya se creó; sin servidor solo cierra el pedido. */
  elegir: (ofertaId: string, paseoId: string) => Promise<ResultadoPedido>
  /** Quita de la pantalla un pedido ya cerrado (vencido, cancelado o elegido). */
  cerrar: () => void
}

const SIN_PEDIDO: Pedido | null = null

/**
 * El pedido de la familia. Con servidor vive en la base y se consulta cada `segundosEntreConsultas` mientras la app está abierta.
 * Sin servidor (modo local y demostración) vive en este teléfono y las ofertas las inventan los paseadores de ejemplo.
 */
export function usePedidoDeLaFamilia(sesionId: string | null, perros: readonly Dog[], paseadores: readonly Walker[]): PedidoDeLaFamilia {
  const aplica = sesionId !== null && accesoActivo()
  const [local, setLocal] = useDato<Pedido | null>(CLAVES.pedido, SIN_PEDIDO)
  const [remoto, setRemoto] = useState<Pedido | null>(null)
  const ahora = useAhora(CONFIG.segundosEntreConsultas * 1000)
  const perrosRef = useRef(perros)
  useEffect(() => {
    perrosRef.current = perros
  })

  const leer = useCallback(async () => {
    if (!aplica || !sesionId) return
    try {
      const c = await clientePedidosDeLaApp()
      if (!c) return
      const r = await c.miPedido()
      setRemoto(r.pedido ? pedidoDeFila(r.pedido, r.ofertas, r.vistos, r.disponibles, perrosRef.current, sesionId) : null)
    } catch {
      // Sin internet se queda lo último que se vio; en la siguiente vuelta se intenta otra vez.
    }
  }, [aplica, sesionId])
  useEffect(() => {
    if (!aplica) return
    const t = setTimeout(() => void leer(), 0)
    const id = setInterval(() => {
      if (document.visibilityState !== 'hidden') void leer()
    }, CONFIG.segundosEntreConsultas * 1000)
    return () => {
      clearTimeout(t)
      clearInterval(id)
    }
  }, [aplica, leer])

  const [ocultos, setOcultos] = useState<string[]>([])
  const base = aplica ? remoto : local
  const pedido = useMemo(() => {
    if (!base || ocultos.includes(base.id)) return null
    if (ahora === 0) return base
    const conDemo = aplica ? base : conOfertasDeDemostracion(base, paseadores, ahora)
    const p = { ...conDemo, estado: estadoDePedido(conDemo, ahora) }
    // Un pedido ya cerrado se muestra un rato (para decir cómo terminó) y luego sale de la pantalla.
    return ESTADOS_ACTIVOS.includes(p.estado) || ahora - Math.max(p.expiraAt, p.creadoAt) < 10 * 60_000 ? p : null
  }, [base, aplica, paseadores, ahora, ocultos])
  const activo = !!pedido && ESTADOS_ACTIVOS.includes(pedido.estado)

  const pedir = useCallback(
    async (p: Pedido, dueno: string): Promise<ResultadoPedido> => {
      if (!aplica || !sesionId) {
        setLocal(p)
        return { ok: true }
      }
      try {
        const c = await clientePedidosDeLaApp()
        if (!c) return { ok: false, mensaje: TEXTO_PEDIDO.sinConexion }
        const r = await c.crear({ ...argsDeCrear(p, sesionId, CONFIG.minutosVidaPedido), dueno })
        if (!r.creado) return { ok: false, mensaje: textoDeMotivo(r.motivo) }
        await leer()
        return { ok: true }
      } catch {
        return { ok: false, mensaje: TEXTO_PEDIDO.sinConexion }
      }
    },
    [aplica, sesionId, leer, setLocal],
  )
  const cancelar = useCallback(async () => {
    if (!aplica) {
      setLocal((p) => (p ? cancelarPedido(p) : p))
      return
    }
    try {
      const id = remoto?.id
      const c = await clientePedidosDeLaApp()
      if (c && id) await c.cancelar(id)
      await leer()
    } catch {
      // Se queda como estaba: la persona puede volver a tocar «Cancelar pedido».
    }
  }, [aplica, remoto, leer, setLocal])
  const elegir = useCallback(
    async (ofertaId: string, paseoId: string): Promise<ResultadoPedido> => {
      if (!aplica) {
        if (pedido) setLocal(elegirOferta(pedido, ofertaId))
        return { ok: true }
      }
      try {
        const c = await clientePedidosDeLaApp()
        if (!c) return { ok: false, mensaje: TEXTO_PEDIDO.sinConexion }
        const r = await c.elegir(ofertaId, paseoId)
        await leer()
        return r.elegido ? { ok: true } : { ok: false, mensaje: textoDeMotivo(r.motivo) }
      } catch {
        return { ok: false, mensaje: TEXTO_PEDIDO.sinConexion }
      }
    },
    [aplica, pedido, leer, setLocal],
  )
  const cerrar = useCallback(() => {
    const id = pedido?.id
    if (id) setOcultos((l) => [...l, id])
    if (!aplica) setLocal(null)
  }, [aplica, pedido, setLocal])
  return { pedido, activo, pedir, cancelar, elegir, cerrar }
}

export interface PedidosDelPaseador {
  /** Solo con servidor y una sesión de paseador. */
  aplica: boolean
  pedidos: PedidoParaPaseador[]
  /** Cuántas respuestas suyas de la última hora ya se cerraron porque la familia eligió a otra persona o venció. */
  cerradas: number
  ofertar: (pedidoId: string, monto: number) => Promise<ResultadoPedido>
}

/** Los pedidos abiertos de la zona de este paseador (la base solo le deja ver distrito y zona aproximada). Se consulta cada pocos segundos con la app abierta. */
export function usePedidosDelPaseador(sesionId: string | null, activo: boolean): PedidosDelPaseador {
  const aplica = sesionId !== null && accesoActivo()
  const [pedidos, setPedidos] = useState<PedidoParaPaseador[]>([])
  const [cerradas, setCerradas] = useState(0)
  const leer = useCallback(async () => {
    try {
      const c = await clientePedidosDeLaApp()
      if (!c) return
      setPedidos((await c.abiertos()).map(pedidoParaPaseador).filter((p): p is PedidoParaPaseador => p !== null))
      const hace1h = Date.now() - 3_600_000
      setCerradas((await c.misOfertasCerradas()).filter((f) => Date.parse(String(f.creado_en ?? '')) >= hace1h).length)
    } catch {
      // Sin internet se queda lo último que se vio.
    }
  }, [])
  useEffect(() => {
    if (!aplica || !activo) return
    const t = setTimeout(() => void leer(), 0)
    const id = setInterval(() => {
      if (document.visibilityState !== 'hidden') void leer()
    }, CONFIG.segundosEntreConsultas * 1000)
    return () => {
      clearTimeout(t)
      clearInterval(id)
    }
  }, [aplica, activo, leer])
  const ofertar = useCallback(
    async (pedidoId: string, monto: number): Promise<ResultadoPedido> => {
      try {
        const c = await clientePedidosDeLaApp()
        if (!c) return { ok: false, mensaje: TEXTO_PEDIDO.ofertaNo }
        const r = await c.ofertar(pedidoId, monto)
        await leer()
        return r.ofertado ? { ok: true } : { ok: false, mensaje: textoDeMotivo(r.motivo) }
      } catch {
        return { ok: false, mensaje: TEXTO_PEDIDO.ofertaNo }
      }
    },
    [leer],
  )
  return { aplica, pedidos: aplica && activo ? pedidos : [], cerradas: aplica && activo ? cerradas : 0, ofertar }
}


/* ------------------------------------------------------------------ */
/* Avisos con sonido (Bloque 3)                                         */
/* ------------------------------------------------------------------ */

/** Si la persona activó o silenció los avisos (solo en este teléfono). */
export function useAvisos(): [AvisosPref, Setter<AvisosPref>] {
  return useDato<AvisosPref>(CLAVES.avisos, PREF_INICIAL, normalizarPref)
}

/**
 * Suena, vibra y deja la insignia cuando aparece un id que no estaba (un pedido para el paseador, una oferta para la familia).
 * Lo que ya estaba al abrir la pantalla no suena. Solo con la app abierta.
 */
export function useAvisoDeNuevos(ids: readonly string[]): void {
  const [pref] = useAvisos()
  const vistos = useRef<Set<string> | null>(null)
  const clave = ids.join('|')
  const prefRef = useRef(pref)
  useEffect(() => {
    prefRef.current = pref
  })
  useEffect(() => {
    // El navegador solo deja sonar después de un toque: el primero deja el sonido listo.
    const alToque = () => prepararSonido()
    document.addEventListener('pointerdown', alToque, { once: true })
    return () => document.removeEventListener('pointerdown', alToque)
  }, [])
  useEffect(() => {
    const actuales = clave ? clave.split('|') : []
    if (vistos.current === null) {
      vistos.current = new Set(actuales)
      return
    }
    const nuevos = idsNuevos(vistos.current, actuales)
    actuales.forEach((id) => vistos.current?.add(id))
    if (nuevos.length > 0 && debeAvisar(prefRef.current)) {
      sonar()
      vibrar()
    }
  }, [clave])
}


/* ------------------------------------------------------------------ */
/* Ubicación en vivo (Bloque 6): solo con la app abierta               */
/* ------------------------------------------------------------------ */

/**
 * El paseador publica su última lectura cada `segundosEnVivo` segundos mientras pasea, con la app abierta y con servidor. Lo que
 * no sirve (una lectura de hace más de 3 intervalos, la base que dice que no) se descarta sin avisar: es una señal, no un contrato.
 * `lectura`: la última que dio el teléfono. Es una SEÑAL: se puede falsificar, y la app no promete lo contrario.
 */
export function usePublicarUbicacionEnVivo(paseoId: string | null, activo: boolean, lectura: { pos: [number, number]; precisionM: number; t: number } | null): void {
  const ultima = useRef(lectura)
  useEffect(() => {
    ultima.current = lectura
  })
  useEffect(() => {
    if (!activo || !paseoId) return
    const cada = CONFIG.segundosEnVivo * 1000
    const id = setInterval(() => {
      const l = ultima.current
      if (!l || Date.now() - l.t > cada * 3 || document.visibilityState === 'hidden') return
      void clienteUbicacionDeLaApp()
        .then((c) => c?.publicar(paseoId, { pos: l.pos, precisionM: l.precisionM }))
        .catch(() => undefined)
    }, cada)
    return () => clearInterval(id)
  }, [activo, paseoId])
}

/** La familia mira la última ubicación de su paseo cada `segundosEnVivo` segundos (solo con servidor, con la app abierta y mientras pasean). */
export function useUbicacionEnVivo(paseoId: string | null, activo: boolean): UbicacionEnVivo | null {
  const [vista, setVista] = useState<{ paseo: string; u: UbicacionEnVivo | null } | null>(null)
  useEffect(() => {
    if (!activo || !paseoId) return
    let vivo = true
    const leer = () => {
      if (document.visibilityState === 'hidden') return
      void clienteUbicacionDeLaApp()
        .then((c) => c?.actual(paseoId))
        .then((u) => {
          if (vivo && u !== undefined) setVista({ paseo: paseoId, u })
        })
        .catch(() => undefined)
    }
    const t = setTimeout(leer, 0)
    const id = setInterval(leer, CONFIG.segundosEnVivo * 1000)
    return () => {
      vivo = false
      clearTimeout(t)
      clearInterval(id)
    }
  }, [activo, paseoId])
  return activo && vista?.paseo === paseoId ? vista.u : null
}

/** El equipo: las fotos marcadas «sospechosas» (solo con servidor y una sesión del equipo; la base solo se las deja leer a él). */
export function useSospechasDelEquipo(aplica: boolean): { sospechas: FilaDeUbicacion[]; cargando: boolean } {
  const [estado, setEstado] = useState<{ filas: FilaDeUbicacion[]; leido: boolean }>({ filas: [], leido: false })
  useEffect(() => {
    if (!aplica) return
    let vivo = true
    void clienteUbicacionDeLaApp()
      .then((c) => c?.sospechas())
      .then((filas) => {
        if (vivo && filas) setEstado({ filas, leido: true })
      })
      .catch(() => undefined)
    return () => {
      vivo = false
    }
  }, [aplica])
  return { sospechas: aplica ? estado.filas : [], cargando: aplica && !estado.leido }
}
