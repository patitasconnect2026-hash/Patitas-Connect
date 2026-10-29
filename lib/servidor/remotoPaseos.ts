/**
 * El `Remoto` de los paseos (paso 6a): el adaptador con copia de `lib/datos/` lo usa para guardar y leer los paseos y su
 * bitácora en las tablas `paseos`, `paseo_eventos` y `bitacora`, con la sesión de cada persona.
 *
 *   - Cada persona ve solo lo que las reglas de la base le entregan: la familia, sus paseos; el paseador, los suyos; el
 *     equipo, todos. Aquí no se filtra nada «a mano»: lo que la base no entrega, no llega.
 *   - Los estados cambian por las reglas de la base (`transiciones_paseo`): la app pide el cambio con «solo si todavía
 *     está en X» y la base lo acepta o lo rechaza. Un rechazo no se reintenta: se descarta el cambio y se avisa.
 *   - Lo que cambia la otra persona llega por sondeo (cada pocos segundos mientras la pantalla está visible y al volver
 *     a ella). Realtime no hace falta y no pide cambios en la base.
 *   - Sin internet: los cambios quedan en la copia y se reintentan solos (lo hace el adaptador con copia).
 *
 * El chat (paso 6b) viaja igual: tabla `mensajes`, sondeo cada pocos segundos, y un mensaje sin enviar se reintenta solo
 * sin duplicarse (cada mensaje lleva su propio `id`).
 *
 * Los pagos (paso 7) se bajan con el mismo sondeo, pero NO se escriben como el resto: cada acción («Vi el pago», «No lo
 * encuentro», «Pagado al paseador») pide a la base `mover_pago` y recién cuando la base contesta que sí, se ve el cambio.
 * Sin internet la acción espera en una cola (en memoria) y se reintenta sola sin repetirse; mientras tanto NADA queda
 * marcado. Dónde cobra el paseador (Yape o Plin) viaja a `cobros_paseador`: lo ve él y el equipo, nunca la familia.
 *
 * Las fotos (paso 8) viajan aparte: la foto queda PRIMERO en el teléfono (los bytes en IndexedDB y sus datos en la lista
 * local de fotos) y se envía sola: los bytes al almacén PRIVADO `fotos` y sus datos (hora, lugar, código) a la tabla `fotos`.
 * Qué falta enviar se calcula comparando lo que hay en el teléfono con lo que la base ya tiene, y cada foto lleva siempre el
 * mismo id: un reintento no la duplica y, si se corta internet, se sigue donde se quedó. Se ven con enlaces que vencen.
 *
 * Los puntos de control (paso 9) siguen la misma idea: el INICIO y el FIN del paseo con su ubicación (las fotos ya llevan la
 * suya) viajan a la tabla `puntos_control`, solo del paseador de ese paseo. NO hay seguimiento continuo ni «en vivo»: la
 * memoria del motor de avisos (`vigilancia`, la última lectura) nunca sube. Un punto lleva siempre el mismo id: no se duplica.
 *
 * No usa la clave de servicio ni crea cuentas. Recibe el cliente (`ClientePaseos`): las pruebas le pasan uno simulado.
 */
import { RechazoDelServidor, type Adaptador, type Identidad, type Remoto } from '../datos/adaptador'
import { CLAVES } from '../datos/claves'
import { normalizarPaseos } from '../datos/paseos'
import type { ChatMsg, Job, LiveEvent } from '../bus'
import { TRANSICIONES_PAGO, type AccionPago, type Pago } from '../pagos'
import type { FotoPaseo } from '../fotos'
import { claveSelfie, diaDeLima } from '../selfie'
import type { PuntoControl } from '../puntosControl'
import type { AlmacenFotos } from '../datos/fotos'
import type { Account } from '../types'
import type { Persona } from '../sos'
import type { CobroPaseador } from '../walkerStore'
import {
  bitacoraDeFila,
  ESTADOS_ACEPTADOS,
  filaDeBitacora,
  filaDeCasa,
  filaDeEvento,
  filaDePaseoNuevo,
  filaDePerro,
  jobDeFilas,
  operacionesDe,
  reporteParaServidor,
  uuidDe,
  esUuid,
  filaDeMensaje,
  mensajeDeFila,
  type Operacion,
} from './paseosMapeo'
import type { Caso } from '../casos'
import type { Review } from '../types'
import { filaDeResena, resenasDeFilas } from './resenasMapeo'
import { casosDeFilas, cambioParaLaBase, filaDeCaso } from './casosMapeo'
import { filaDeCobro, mismoCobro, pagoDeFila, pagosDeFilas, cobrosDeFilas } from './pagosMapeo'
import { fotoDeFila, fotosDeFilas, fotosPorSubir, filaDeFoto, LIMITE_BYTES_ALMACEN, SEGUNDOS_DEL_ENLACE } from './fotosMapeo'
import { filaDePunto, idDePunto, mezclarPuntos, puntosDeFilas, puntosPorSubir } from './puntosMapeo'
import { rechazoDe, rechazoDeFoto, rechazoDePago, TEXTO_FOTO_SERVIDOR, TEXTO_PAGO_SERVIDOR, TEXTO_SERVIDOR, type ContextoDeCambio } from './paseosTextos'
import type { ClientePaseos, FilaCruda, SesionDePaseos } from './paseosTipos'

/**
 * Lo del paseo que se guarda aparte, en este teléfono. `vigilancia` (la memoria del motor de avisos, con la última lectura)
 * y `ubicacion` (el permiso) NUNCA suben. `puntos` (el inicio y el fin) se guardan aquí primero y salen solos a la base.
 */
export interface CamposLocales {
  vigilancia?: Job['vigilancia']
  ubicacion?: Job['ubicacion']
  puntos?: Job['puntos']
}

export interface OpcionesRemotoPaseos {
  cliente: () => Promise<ClientePaseos | null>
  /** La cuenta y el contacto de emergencia de la familia (viven en su teléfono): de ahí salen la casa y el perro. */
  leerFamilia: () => { account: Account | null; emergencia: Persona | null }
  /** Dónde se guardan los campos que no viajan. Sin esto se guardan solo en memoria. */
  almacenLocal?: Adaptador
  /** Cada cuánto se pregunta por cambios. Por defecto 5 segundos. */
  intervaloMs?: number
  /** Cuántos paseos se piden (los más recientes). */
  limite?: number
  /** Cada cuánto se reintenta una acción de pago que no llegó por falta de internet. Por defecto 5 segundos. */
  reintentoPagoMs?: number
  /** Los bytes de las fotos de este teléfono (IndexedDB). Sin esto no se envían fotos. */
  almacenFotos?: AlmacenFotos
}

/** Lo que se bajó de la base en una lectura. */
interface Bajado {
  sesion: SesionDePaseos | null
  jobs: Job[]
  bitacora: LiveEvent[]
  mensajes: ChatMsg[]
  pagos: Pago[]
  cobros: Record<string, CobroPaseador>
  fotos: FotoPaseo[]
  /** El inicio y el fin de cada paseo (solo lo que la base entregó a esta persona). */
  /** Los casos que la base entregó a esta persona (los de su paseo; el equipo, todos). */
  casos: Caso[]
  /** Las reseñas que escribió esta familia (solo para una familia). */
  resenas: Review[]
  puntos: Map<string, PuntoControl[]>
  /** Los ids de las filas de `puntos_control` que la base entregó. */
  idsDePuntos: Set<string>
  /** Los paseos tal como vinieron (para unir sus nombres a los pagos). */
  filasDePaseos: FilaCruda[]
}

/** Lo que pasó con una acción de pago: la base la aceptó (y este es el pago nuevo) o dijo que no (y este es el motivo). */
export type ResultadoMoverPago = { ok: true; pago: Pago } | { ok: false; motivo: string }

export interface RemotoPaseos extends Remoto {
  /** Vuelve a leer ahora (y avisa lo que cambió). Para las pruebas y para «Reintentar». */
  refrescar(): Promise<void>
  /**
   * Una acción sobre el pago de un paseo. Espera la respuesta de la base: nada se marca antes. Con un corte de internet
   * queda esperando y se reintenta sola; pedir la misma acción dos veces sobre el mismo pago es UNA sola.
   */
  moverPago(id: string, accion: AccionPago, datos?: { nota?: string; hora?: string }): Promise<ResultadoMoverPago>
  /** Las acciones de pago que esperan respuesta (en camino o sin internet), por pago. */
  pagosEnCola(): ReadonlyArray<{ id: string; accion: AccionPago }>
  /** Avisa cuando entra o sale una acción de la cola. */
  alCambiarColaDePagos(aviso: () => void): () => void
  /** Reintenta ahora las acciones que esperan internet. */
  reintentarPagos(): void
  /** Envía ahora las fotos de este teléfono que todavía no están en el servidor (se llama solo después de cada lectura). */
  sincronizarFotos(): Promise<void>
  /** Envía ahora el inicio y el fin del paseo que todavía no están en el servidor (se llama solo después de cada lectura). */
  sincronizarPuntos(): Promise<void>
  /** Las fotos de este teléfono que NO están en el servidor: por id de la foto, `null` = esperando y un texto = la base dijo que no. */
  fotosSinSubir(): ReadonlyMap<string, string | null>
  /** Avisa cuando cambia qué fotos faltan por enviar. */
  alCambiarSubidaDeFotos(aviso: () => void): () => void
  /** Un enlace que VENCE para ver una foto del almacén privado (se reutiliza unos segundos; nunca es una dirección pública). */
  enlaceDeFoto(ruta: string): Promise<string>
  /** Deja de preguntar y de escuchar. */
  detener(): void
}

const texto = (v: unknown): string => (typeof v === 'string' ? v : '')
const unicos = (xs: string[]): string[] => [...new Set(xs.filter((x) => x !== ''))]
const hayLocales = (l: CamposLocales): boolean => l.vigilancia !== undefined || l.ubicacion !== undefined || l.puntos !== undefined

function extraerLocales(j: Job): CamposLocales {
  return {
    ...(j.vigilancia !== undefined ? { vigilancia: j.vigilancia } : {}),
    ...(j.ubicacion !== undefined ? { ubicacion: j.ubicacion } : {}),
    ...(j.puntos !== undefined ? { puntos: j.puntos } : {}),
  }
}

export function crearRemotoPaseos(o: OpcionesRemotoPaseos): RemotoPaseos {
  const intervaloMs = o.intervaloMs ?? 5000
  const limite = o.limite ?? 100
  const reintentoMs = o.reintentoPagoMs ?? 5000
  let sesion: SesionDePaseos | null = null
  /** Lo último que se supo de la base, por paseo (sin los campos solo del teléfono). Es la base de comparación. */
  let ultimo = new Map<string, Job>()
  let bitacoraEnBase = new Set<string>()
  /** Los mensajes del chat que ya están en la base (por `id`): uno que ya llegó no se vuelve a mandar. */
  let mensajesEnBase = new Set<string>()
  const emitido = new Map<string, string>()
  /** Lo último que se supo de los pagos y de dónde cobra cada paseador (solo lo que la base le entrega a esta persona). */
  let pagosEnBase: Pago[] = []
  let cobrosEnBase: Record<string, CobroPaseador> = {}
  let filasDePaseos = new Map<string, FilaCruda>()
  /** Los casos que la base tiene (por id): uno que ya llegó no se vuelve a abrir, y solo se le suma lo que falte. */
  let casosEnBase = new Map<string, Caso>()
  /** Los paseos de los que la base ya tiene la reseña (es una por paseo): una que ya llegó no se vuelve a mandar. */
  let resenasEnBase = new Set<string>()
  /** Las fotos que la base entregó a esta persona (sin bytes) y los ids de sus filas. */
  let fotosEnBase: FotoPaseo[] = []
  let idsDeFotosEnBase = new Set<string>()
  /** Las fotos de este teléfono que la base o el almacén rechazaron (por id local): no se reintentan hasta recargar. */
  const fotosRechazadas = new Map<string, string>()
  /** Los ids de las filas de `puntos_control` que la base ya tiene, y los puntos que la base rechazó (no se reintentan). */
  let idsDePuntosEnBase = new Set<string>()
  const puntosRechazados = new Set<string>()
  let subiendoPuntos = false
  let subiendoFotos = false
  const oyentesDeSubida = new Set<() => void>()
  /** Enlaces ya pedidos: se reutilizan hasta poco antes de que venzan. */
  const enlaces = new Map<string, { url: string; hasta: number }>()
  /** Las acciones de pago que esperan respuesta (clave «paseo|acción»): una sola por pago y acción, aunque se toque dos veces. */
  const colaDePagos = new Map<string, { id: string; accion: AccionPago; listo: Promise<ResultadoMoverPago>; cancelar: (motivo: string) => void }>()
  const oyentesDeCola = new Set<() => void>()
  const despertares = new Set<() => void>()
  const locales = new Map<string, CamposLocales>()
  let localesCargados = false
  /** Sube cada vez que esta persona cambia algo: un sondeo que empezó antes puede traer datos viejos y se descarta. */
  let version = 0
  let escribiendo = 0
  let refrescando = false
  let detenido = false
  let aviso: ((clave: string, valor: unknown) => void) | null = null
  const bajas: Array<() => void> = []
  /** El último intento de hablar con la base falló por falta de conexión (también el de preguntar por cambios). */
  let sinRed = false
  const oyentesDeRed = new Set<() => void>()
  const ponerRed = (valor: boolean) => {
    if (sinRed === valor) return
    sinRed = valor
    oyentesDeRed.forEach((f) => f())
  }

  /* ---- campos solo del teléfono ---- */
  const cargarLocales = () => {
    if (localesCargados) return
    localesCargados = true
    const guardado = o.almacenLocal?.leer<Record<string, CamposLocales>>(CLAVES.paseoLocal, {}) ?? {}
    for (const [id, l] of Object.entries(guardado)) if (l && typeof l === 'object') locales.set(id, l)
  }
  const persistirLocales = () => o.almacenLocal?.guardar(CLAVES.paseoLocal, Object.fromEntries(locales))
  const conLocales = (j: Job): Job => {
    const l = locales.get(j.id)
    if (!l) return j
    // Los puntos de control son los de este teléfono y los que tiene la base, juntos (uno por tipo; manda el del teléfono).
    const puntos = mezclarPuntos(l.puntos, j.puntos)
    return { ...j, ...l, ...(puntos ? { puntos } : {}) }
  }

  /* ---- bajar lo que le corresponde a esta persona ---- */
  async function descargar(c: ClientePaseos): Promise<Bajado> {
    const s = await c.sesion()
    if (!s) return { sesion: null, jobs: [], bitacora: [], mensajes: [], pagos: [], cobros: {}, fotos: [], casos: [], resenas: [], puntos: new Map(), idsDePuntos: new Set(), filasDePaseos: [] }
    const filas = await c.listarPaseos(limite)
    const ids = unicos(filas.map((f) => texto(f.id)))
    const [eventos, bitacoraFilas, codigos, mensajeFilas, pagoFilas, fotoFilas, puntoFilas, casoFilas, resenaFilas] = await Promise.all([
      c.listarEventos(ids),
      c.listarBitacora(ids),
      s.rol === 'familia' ? c.listarCodigos(ids) : Promise.resolve([] as FilaCruda[]),
      // El equipo no usa el chat de la app: no se le baja.
      s.rol === 'equipo' ? Promise.resolve([] as FilaCruda[]) : c.listarMensajes(ids),
      // Los pagos: la base le entrega a cada persona solo los suyos (la familia, los de sus paseos; el equipo, todos).
      c.listarPagos(limite),
      // Las fotos de esos paseos y la foto de hoy: la base solo entrega las que esta persona puede ver.
      c.listarFotos(ids, diaDeLima(Date.now())),
      // El inicio y el fin de esos paseos con su ubicación (las fotos ya traen la suya).
      c.listarPuntos(ids),
      // Los casos y disputas: la base le entrega a cada persona los de su paseo (el equipo, todos).
      c.listarCasos(),
      // Las reseñas que escribió esta familia (las de los demás paseadores las trae la lista de paseadores).
      s.rol === 'familia' ? c.listarMisResenas(s.id) : Promise.resolve([] as FilaCruda[]),
    ])
    // Dónde cobra el paseador: la base solo lo entrega a él (el suyo) y al equipo (los de los pagos). A la familia, nada.
    const paseadoresDeCobro = s.rol === 'paseador' ? [s.id] : s.rol === 'equipo' ? unicos(pagoFilas.map((f) => texto(f.paseador_id))) : []
    const cobroFilas = paseadoresDeCobro.length > 0 ? await c.listarCobros(paseadoresDeCobro) : []
    let casas: FilaCruda[] = []
    let perros: FilaCruda[] = []
    if (s.rol !== 'equipo') {
      // Al paseador la base solo le entrega la casa y la ficha después de aceptar: no se piden las demás.
      const visibles = s.rol === 'familia' ? filas : filas.filter((f) => ESTADOS_ACEPTADOS.some((e) => e === f.estado))
      ;[casas, perros] = await Promise.all([
        c.listarCasas(unicos(visibles.map((f) => texto(f.familia_id)))),
        c.listarPerros(unicos(visibles.map((f) => texto(f.perro_id)).filter(esUuid))),
      ])
    }
    const casaDe = new Map(casas.map((f) => [texto(f.familia_id), f]))
    const perroDe = new Map(perros.map((f) => [texto(f.id), f]))
    const codigoDe = new Map(codigos.map((f) => [texto(f.paseo_id), texto(f.codigo)]))
    const puntosPorPaseo = puntosDeFilas(puntoFilas)
    const jobs: Job[] = []
    for (const f of filas) {
      const id = texto(f.id)
      const job = jobDeFilas(f, {
        eventos: eventos.filter((e) => texto(e.paseo_id) === id),
        casa: casaDe.get(texto(f.familia_id)) ?? null,
        perro: perroDe.get(texto(f.perro_id)) ?? null,
        codigo: codigoDe.get(id) ?? null,
      })
      if (job) {
        const puntos = puntosPorPaseo.get(id)
        jobs.push(puntos?.length ? { ...job, puntos } : job)
      }
    }
    const bitacora = bitacoraFilas.map(bitacoraDeFila).filter((e): e is LiveEvent => e !== null)
    const mensajes = mensajeFilas.map(mensajeDeFila).filter((m): m is ChatMsg => m !== null)
    return { sesion: s, jobs, bitacora, mensajes, pagos: pagosDeFilas(pagoFilas, filas), cobros: cobrosDeFilas(cobroFilas), fotos: fotosDeFilas(fotoFilas), casos: casosDeFilas(casoFilas), resenas: resenasDeFilas(resenaFilas, s.id, Date.now()), puntos: puntosPorPaseo, idsDePuntos: new Set(puntoFilas.map((f) => texto(f.id))), filasDePaseos: filas }
  }

  /** Guarda lo bajado como «lo último que se supo» y arma lo que se entrega a la app (con sus campos del teléfono). */
  function aplicar(d: Bajado): Record<string, unknown> {
    cargarLocales()
    if (d.sesion?.id !== sesion?.id) {
      ultimo = new Map()
      bitacoraEnBase = new Set()
      mensajesEnBase = new Set()
      casosEnBase = new Map()
      resenasEnBase = new Set()
      // Otra persona (o ninguna): lo que esperaba el pago de la anterior no se envía a nombre de la nueva.
      cancelarCola(TEXTO_PAGO_SERVIDOR.sinSesion)
    }
    sesion = d.sesion
    ultimo = new Map(d.jobs.map((j) => [j.id, j]))
    bitacoraEnBase = new Set(d.bitacora.map((e) => e.id))
    mensajesEnBase = new Set(d.mensajes.map((m) => m.id))
    pagosEnBase = d.pagos
    cobrosEnBase = d.cobros
    fotosEnBase = d.fotos
    idsDeFotosEnBase = new Set(d.fotos.map((f) => f.id))
    idsDePuntosEnBase = d.idsDePuntos
    casosEnBase = new Map(d.casos.map((c) => [c.id, c]))
    resenasEnBase = new Set(d.resenas.flatMap((r) => (r.paseoId ? [r.paseoId] : [])))
    filasDePaseos = new Map(d.filasDePaseos.map((f) => [texto(f.id), f]))
    return {
      [CLAVES.paseo]: d.jobs.map(conLocales),
      [CLAVES.eventos]: d.bitacora,
      [CLAVES.chat]: d.mensajes,
      [CLAVES.pagos]: d.pagos,
      [CLAVES.cobros]: d.cobros,
      [CLAVES.fotosServidor]: d.fotos,
      [CLAVES.casos]: d.casos,
      [CLAVES.resenas]: d.resenas,
    }
  }

  /* ---- subir un cambio ---- */
  /**
   * Lo que la base tiene de este paseo después de que `op` salió bien. Así, si más adelante falla otro paso de la misma
   * subida y se reintenta, lo que ya se hizo no se vuelve a hacer (no se duplican eventos).
   */
  function despuesDe(op: Operacion, job: Job): Job {
    const antes = ultimo.get(job.id)
    switch (op.tipo) {
      case 'crear':
        return { ...job, pin: '', paseo: { estado: 'solicitado', eventos: job.paseo.eventos.slice(0, 1) } }
      case 'estado':
        return antes ? { ...antes, paseo: { estado: op.evento.a, eventos: [...antes.paseo.eventos, op.evento] } } : job
      case 'evento':
        return antes ? { ...antes, paseo: { ...antes.paseo, eventos: [...antes.paseo.eventos, op.evento] } } : job
      case 'cerrar_para_paseador':
        return antes ? { ...antes, cerradoPaseador: true } : job
      case 'emergencia':
        return antes ? { ...antes, emergencia: job.emergencia } : job
    }
  }

  async function ejecutar(c: ClientePaseos, s: SesionDePaseos, job: Job, op: Operacion): Promise<void> {
    switch (op.tipo) {
      case 'crear': {
        const { account, emergencia } = o.leerFamilia()
        if (account) await c.guardarCasa(filaDeCasa(account, job.emergencia ?? emergencia, s.id))
        const perro = job.reserva?.dog
        const perroId = perro ? uuidDe(`${s.id}:${perro.id}`) : null
        if (perro && perroId) await c.guardarPerro(filaDePerro(perro, s.id, perroId))
        const fila = filaDePaseoNuevo(job, s.id, perroId)
        if (!fila) throw new RechazoDelServidor(TEXTO_SERVIDOR.sinReserva)
        await c.crearPaseo(fila)
        if (/^\d{4}$/.test(job.pin)) await c.crearCodigo(job.id, job.pin)
        return
      }
      case 'estado': {
        const e = op.evento
        const cambios = {
          estado: e.a,
          ...(e.accion === 'reportar' && job.reporte ? { reporte: reporteParaServidor(job.reporte) } : {}),
        }
        // «Solo si todavía está en el estado de antes»: si cambió mientras tanto, no se pisa.
        const filas = await c.cambiarPaseo(job.id, cambios, e.de ?? undefined)
        if (filas === 0) {
          // Lo que hace «el sistema» (vencer, cerrar) lo puede hacer también la otra app: si perdió la carrera, no
          // hay nada que explicarle a la persona (no fue ella). Se vuelve a lo que dice la base, en silencio.
          throw new RechazoDelServidor(e.quien === 'sistema' ? '' : TEXTO_SERVIDOR.cambioYaNoVale, 'sin_filas')
        }
        return
      }
      case 'evento':
        await c.crearEvento(filaDeEvento(job.id, op.evento))
        return
      case 'cerrar_para_paseador':
        await c.cambiarPaseo(job.id, { cerrado_paseador: true })
        return
      case 'emergencia': {
        const { account } = o.leerFamilia()
        if (account) await c.guardarCasa(filaDeCasa(account, job.emergencia ?? null, s.id))
        return
      }
    }
  }

  const contextoDe = (op: Operacion): ContextoDeCambio => (op.tipo === 'crear' ? 'crear' : 'cambiar')

  const perteneceA = (j: Job, s: SesionDePaseos): boolean =>
    s.rol === 'equipo' || (s.rol === 'familia' ? !j.familiaId || j.familiaId === s.id : j.walkerId === s.id)

  /**
   * Lo del paseo que solo vive en el teléfono (la memoria del motor de avisos, el permiso y el inicio y el fin) se guarda en
   * el teléfono ANTES de hablar con la base, con lo último que se sabe de quién es la sesión: así, sin internet, no se
   * pierde si se cierra la app. Solo la paseadora lo guarda (la familia recibe los puntos de la base y no los copia aquí).
   */
  function guardarLocalesDelTelefono(jobs: Job[], s: SesionDePaseos | null) {
    if (!s || s.rol !== 'paseador') return
    cargarLocales()
    for (const job of jobs) {
      if (!perteneceA(job, s)) continue
      const l = extraerLocales(job)
      if (hayLocales(l) && JSON.stringify(locales.get(job.id)) !== JSON.stringify(l)) {
        locales.set(job.id, l)
        persistirLocales()
      }
    }
  }

  async function subirPaseos(valor: unknown): Promise<void> {
    const jobs = normalizarPaseos(valor)
    guardarLocalesDelTelefono(jobs, sesion)
    const c = await o.cliente()
    if (!c) throw new Error('El servidor no está disponible.')
    const s = (await c.sesion()) ?? null
    // Sin sesión no hay a nombre de quién guardar: queda esperando (el adaptador lo reintenta).
    if (!s) throw new Error('No hay una sesión abierta.')
    sesion = s
    guardarLocalesDelTelefono(jobs, s)
    version += 1
    escribiendo += 1
    try {
      let tocados = false
      for (const job of jobs) {
        if (!perteneceA(job, s)) continue
        for (const op of operacionesDe(job, ultimo.get(job.id), s)) {
          try {
            await ejecutar(c, s, job, op)
          } catch (e) {
            const rechazo = rechazoDe(e, contextoDe(op))
            // Un «no» de la base es una respuesta (hay conexión); un corte, no.
            ponerRed(rechazo === null)
            throw rechazo ?? e
          }
          ponerRed(false)
          ultimo.set(job.id, despuesDe(op, job))
          tocados = true
        }
      }
      if (tocados) empujarPronto()
    } finally {
      escribiendo -= 1
    }
    // Un inicio o un fin nuevo (que quedó en los datos del teléfono) sale enseguida.
    void sincronizarPuntos()
  }

  async function subirBitacora(valor: unknown): Promise<void> {
    if (!Array.isArray(valor)) return
    const c = await o.cliente()
    if (!c) throw new Error('El servidor no está disponible.')
    const s = (await c.sesion()) ?? null
    if (!s) throw new Error('No hay una sesión abierta.')
    version += 1
    escribiendo += 1
    try {
      for (const e of valor as LiveEvent[]) {
        if (!e || typeof e.id !== 'string' || bitacoraEnBase.has(e.id)) continue
        // Solo de paseos que ya están en la base (los de la demostración nunca llegan aquí).
        if (!e.jobId || !ultimo.has(e.jobId)) continue
        const fila = filaDeBitacora(e)
        if (!fila) continue
        try {
          await c.crearBitacora(fila)
        } catch (err) {
          const rechazo = rechazoDe(err, 'cambiar')
          ponerRed(rechazo === null)
          throw rechazo ?? err
        }
        ponerRed(false)
        bitacoraEnBase.add(e.id)
      }
    } finally {
      escribiendo -= 1
    }
  }

  /**
   * El chat: lo que esta persona escribió y todavía no está en la base. Cada mensaje lleva un `id` propio (lo pone quien lo
   * escribe), así que un reintento no lo duplica: si ya llegó, la base lo reconoce y no pasa nada. Solo manda lo suyo
   * (la familia como «owner», el paseador como «walker») y solo de paseos que ya están en la base; el resto de la lista
   * (lo que escribió la otra persona) no se toca.
   */
  async function subirChat(valor: unknown): Promise<void> {
    if (!Array.isArray(valor)) return
    const c = await o.cliente()
    if (!c) throw new Error('El servidor no está disponible.')
    const s = (await c.sesion()) ?? null
    if (!s) throw new Error('No hay una sesión abierta.')
    version += 1
    escribiendo += 1
    let tocados = false
    try {
      for (const m of valor as ChatMsg[]) {
        if (!m || typeof m.id !== 'string' || mensajesEnBase.has(m.id)) continue
        if (!m.jobId || !ultimo.has(m.jobId)) continue
        const fila = filaDeMensaje(m, s.rol)
        if (!fila) continue
        try {
          await c.crearMensaje(fila)
        } catch (err) {
          const rechazo = rechazoDe(err, 'mensaje')
          ponerRed(rechazo === null)
          throw rechazo ?? err
        }
        ponerRed(false)
        mensajesEnBase.add(m.id)
        tocados = true
      }
    } finally {
      escribiendo -= 1
    }
    // Se vuelve a leer enseguida: trae la hora que anotó la base y lo que haya escrito la otra persona.
    if (tocados) empujarPronto()
  }

  /* ---- casos y disputas ---- */
  /**
   * Los casos que esta persona abrió, reportó o resolvió y todavía no están así en la base. Cada caso lleva siempre el mismo
   * `id` (`<tipo>-<paseo>`), así que un reintento no lo duplica: si ya llegó, la base lo reconoce. A un caso que ya está
   * solo se le suma lo que falta (el reporte) o, si lo resuelve el equipo, su resolución; lo que ya dice la base no se pisa.
   * Solo de paseos que ya están en la base (los de la demostración nunca llegan aquí).
   */
  async function subirCasos(valor: unknown): Promise<void> {
    if (!Array.isArray(valor)) return
    const c = await o.cliente()
    if (!c) throw new Error('El servidor no está disponible.')
    const s = (await c.sesion()) ?? null
    if (!s) throw new Error('No hay una sesión abierta.')
    version += 1
    escribiendo += 1
    let tocados = false
    try {
      for (const caso of valor as Caso[]) {
        if (!caso || typeof caso.id !== 'string' || !caso.jobId || !ultimo.has(caso.jobId)) continue
        const enBase = casosEnBase.get(caso.id)
        try {
          if (!enBase) {
            // Nace abierto (la base no deja que lo abra resuelto quien no es del equipo): la resolución llega después.
            const { resolucion, ...abierto } = caso
            await c.crearCaso(filaDeCaso(abierto))
            casosEnBase.set(caso.id, abierto)
            tocados = true
            if (resolucion && s.rol === 'equipo') {
              const cambio = cambioParaLaBase({ ...abierto, resolucion }, abierto)
              if (cambio) await c.cambiarCaso(caso.id, cambio)
              casosEnBase.set(caso.id, { ...abierto, resolucion })
            }
          } else {
            const cambio = cambioParaLaBase(caso, enBase)
            if (!cambio) continue
            if ('resolucion' in cambio && s.rol !== 'equipo') continue
            const filas = await c.cambiarCaso(caso.id, cambio)
            if (filas === 0) continue
            casosEnBase.set(caso.id, 'resolucion' in cambio ? { ...enBase, resolucion: cambio.resolucion } : { ...enBase, ...(caso.reporte ? { reporte: caso.reporte } : {}) })
            tocados = true
          }
        } catch (err) {
          const rechazo = rechazoDe(err, 'caso')
          ponerRed(rechazo === null)
          throw rechazo ?? err
        }
        ponerRed(false)
      }
    } finally {
      escribiendo -= 1
    }
    // Se vuelve a leer enseguida: trae lo que la base dejó (por ejemplo, la hora real).
    if (tocados) empujarPronto()
  }

  /* ---- reseñas ---- */
  /**
   * Las reseñas que escribió esta familia y todavía no están en la base. Es una por paseo (el paseo es la llave), así que un
   * reintento no la duplica. La base solo la acepta de un paseo CERRADO y de SU paseador: si el paseo todavía no se cerró allá
   * (la subida del cierre y la de la reseña salen una detrás de otra), el rechazo vuelve la lista a lo que dice la base y la
   * pantalla deja escribirla otra vez. Solo de paseos que ya están en la base (los de la demostración nunca llegan aquí).
   */
  async function subirResenas(valor: unknown): Promise<void> {
    if (!Array.isArray(valor)) return
    const c = await o.cliente()
    if (!c) throw new Error('El servidor no está disponible.')
    const s = (await c.sesion()) ?? null
    if (!s) throw new Error('No hay una sesión abierta.')
    if (s.rol !== 'familia') return
    version += 1
    escribiendo += 1
    let tocados = false
    try {
      for (const r of valor as Review[]) {
        const fila = r && typeof r === 'object' ? filaDeResena(r, s.id) : null
        if (!fila || resenasEnBase.has(fila.paseo_id) || !ultimo.has(fila.paseo_id)) continue
        try {
          await c.crearResena(fila)
        } catch (err) {
          const rechazo = rechazoDe(err, 'resena')
          ponerRed(rechazo === null)
          throw rechazo ?? err
        }
        ponerRed(false)
        resenasEnBase.add(fila.paseo_id)
        tocados = true
      }
    } finally {
      escribiendo -= 1
    }
    // Se vuelve a leer enseguida: trae el nombre y la hora que puso la base.
    if (tocados) empujarPronto()
  }

  /* ---- cobro del paseador ---- */
  /**
   * Dónde cobra esta persona (si es paseador): solo se sube SU fila, y solo si cambió. Lo ve él y el equipo; la base no se
   * lo entrega nunca a la familia. El equipo y la familia no escriben aquí.
   */
  async function subirCobros(valor: unknown): Promise<void> {
    if (!valor || typeof valor !== 'object') return
    const c = await o.cliente()
    if (!c) throw new Error('El servidor no está disponible.')
    const s = (await c.sesion()) ?? null
    if (!s) throw new Error('No hay una sesión abierta.')
    if (s.rol !== 'paseador') return
    const cobro = (valor as Record<string, CobroPaseador | undefined>)[s.id]
    const fila = filaDeCobro(cobro, s.id)
    // Incompleto o igual a lo que ya hay en la base: no se sube nada.
    if (!fila || !cobro || mismoCobro(cobrosEnBase[s.id], cobro)) return
    version += 1
    escribiendo += 1
    try {
      await c.guardarCobro(fila)
    } catch (e) {
      const rechazo = rechazoDe(e, 'cobro')
      ponerRed(rechazo === null)
      throw rechazo ?? e
    } finally {
      escribiendo -= 1
    }
    ponerRed(false)
    cobrosEnBase = { ...cobrosEnBase, [s.id]: cobro }
    empujarPronto()
  }

  /* ---- pagos: cada acción pasa por `mover_pago`, la base decide ---- */
  const avisarCola = () => oyentesDeCola.forEach((f) => f())

  /** Muestra lo que dice la base de los pagos (solo si cambió). */
  function emitirPagos() {
    const json = JSON.stringify(pagosEnBase)
    if (emitido.get(CLAVES.pagos) === json) return
    emitido.set(CLAVES.pagos, json)
    aviso?.(CLAVES.pagos, pagosEnBase)
  }

  function guardarPagoNuevo(pago: Pago) {
    pagosEnBase = pagosEnBase.some((p) => p.id === pago.id) ? pagosEnBase.map((p) => (p.id === pago.id ? pago : p)) : [pago, ...pagosEnBase]
    emitirPagos()
  }

  /** Espera `ms`, o menos si alguien despierta la cola (volvió internet, «Reintentar»). */
  const dormirCola = (ms: number) =>
    new Promise<void>((resolver) => {
      const fin = () => {
        clearTimeout(t)
        despertares.delete(fin)
        resolver()
      }
      const t = setTimeout(fin, ms)
      despertares.add(fin)
    })

  function cancelarCola(motivo: string) {
    for (const e of [...colaDePagos.values()]) e.cancelar(motivo)
  }

  /**
   * Una vez que la base rechazó la acción: ¿ya estaba hecha? (Se perdió la respuesta de un intento anterior y este es el
   * reintento.) Se pregunta cómo está el pago: si ya llegó al estado de la acción, es que SE HIZO y no hay que repetirla.
   */
  async function yaEstabaHecha(c: ClientePaseos, id: string, accion: AccionPago): Promise<Pago | null> {
    const destino = TRANSICIONES_PAGO.find((t) => t.accion === accion)?.a
    if (!destino) return null
    try {
      const filas = await c.listarPagos(limite)
      const fila = filas.find((f) => texto(f.paseo_id) === id)
      const pago = fila ? pagoDeFila(fila, filasDePaseos.get(id)) : null
      return pago && pago.estado === destino ? pago : null
    } catch {
      return null
    }
  }

  async function correrAccion(id: string, accion: AccionPago, datos: { nota?: string; hora?: string }, cancelado: () => string | null): Promise<ResultadoMoverPago> {
    for (;;) {
      const motivoDeCancelacion = cancelado()
      if (motivoDeCancelacion !== null) return { ok: false, motivo: motivoDeCancelacion }
      try {
        const c = await o.cliente()
        if (!c) throw new Error('El servidor no está disponible.')
        const s = (await c.sesion()) ?? null
        if (!s) throw new Error('No hay una sesión abierta.')
        sesion = s
        // Mientras la base contesta, un sondeo que ya salió podría traer el pago de antes: se descarta.
        version += 1
        escribiendo += 1
        try {
          const fila = await c.moverPago(id, accion, datos)
          ponerRed(false)
          const pago = pagoDeFila(fila, filasDePaseos.get(id))
          if (!pago) return { ok: false, motivo: TEXTO_PAGO_SERVIDOR.noSePudo }
          guardarPagoNuevo(pago)
          empujarPronto()
          return { ok: true, pago }
        } finally {
          escribiendo -= 1
        }
      } catch (e) {
        const rechazo = rechazoDePago(e)
        if (rechazo === null) {
          // Sin internet (o la base no respondió): la acción espera y NADA queda marcado.
          ponerRed(true)
          await dormirCola(reintentoMs)
          continue
        }
        ponerRed(false)
        const c = await o.cliente().catch(() => null)
        const hecha = c ? await yaEstabaHecha(c, id, accion) : null
        if (hecha) {
          guardarPagoNuevo(hecha)
          return { ok: true, pago: hecha }
        }
        // La base no lo aceptó: se vuelve a lo que ella dice y se explica con una frase clara.
        empujarPronto()
        return { ok: false, motivo: rechazo.mensaje }
      }
    }
  }

  function moverPago(id: string, accion: AccionPago, datos: { nota?: string; hora?: string } = {}): Promise<ResultadoMoverPago> {
    const clave = `${id}|${accion}`
    const yaEsta = colaDePagos.get(clave)
    // Un doble toque (o el mismo toque después de un corte) es UNA sola acción: no se envía dos veces.
    if (yaEsta) return yaEsta.listo
    if (detenido) return Promise.resolve({ ok: false, motivo: TEXTO_PAGO_SERVIDOR.sinSesion })
    if (accion === 'no_encontrado' && (datos.nota ?? '').trim().length < 3) return Promise.resolve({ ok: false, motivo: TEXTO_PAGO_SERVIDOR.notaObligatoria })
    let cancelada: string | null = null
    const listo = correrAccion(id, accion, datos, () => cancelada).finally(() => {
      colaDePagos.delete(clave)
      avisarCola()
    })
    colaDePagos.set(clave, {
      id,
      accion,
      listo,
      cancelar: (motivo) => {
        cancelada = motivo
        despertares.forEach((f) => f())
      },
    })
    avisarCola()
    return listo
  }

  /* ---- fotos: los bytes al almacén privado y sus datos a la tabla `fotos` ---- */
  const avisarSubida = () => oyentesDeSubida.forEach((f) => f())

  /** Las fotos de este teléfono (datos), de la más vieja a la más nueva. */
  const fotosDelTelefono = (): FotoPaseo[] => o.almacenLocal?.leer<FotoPaseo[]>(CLAVES.fotos, []) ?? []

  /** Las que faltan por enviar a la base ahora (solo las de un paseador: la familia y el equipo no suben fotos). */
  function pendientesDeSubir(): FotoPaseo[] {
    if (!sesion || sesion.rol !== 'paseador') return []
    const suyos = new Set([...ultimo.values()].filter((j) => j.walkerId === sesion?.id).map((j) => j.id))
    return fotosPorSubir(fotosDelTelefono(), { enBase: idsDeFotosEnBase, paseosDelPaseador: suyos, paseadorId: sesion.id })
  }

  function emitirFotos() {
    const json = JSON.stringify(fotosEnBase)
    if (emitido.get(CLAVES.fotosServidor) === json) return
    emitido.set(CLAVES.fotosServidor, json)
    aviso?.(CLAVES.fotosServidor, fotosEnBase)
  }

  /** Al tomar otra foto de hoy el mismo día: se quita la anterior (imagen y fila) antes de guardar la nueva. */
  async function quitarFotoDeHoyAnterior(c: ClientePaseos, paseadorId: string, dia: string, idNuevo: string) {
    const clave = claveSelfie(paseadorId, dia)
    for (const vieja of fotosEnBase.filter((f) => f.jobId === clave && f.id !== idNuevo)) {
      if (vieja.ruta) await c.quitarImagenes([vieja.ruta])
      await c.borrarFilaFoto(vieja.id)
      fotosEnBase = fotosEnBase.filter((f) => f.id !== vieja.id)
      idsDeFotosEnBase.delete(vieja.id)
    }
  }

  /** Envía UNA foto. «sin_red»: se queda en el teléfono y se reintenta sola. «rechazada»: la base dijo que no. */
  async function subirUnaFoto(c: ClientePaseos, s: SesionDePaseos, f: FotoPaseo): Promise<'ok' | 'sin_red' | 'rechazada'> {
    const local = await o.almacenFotos?.leer(f.id)
    if (!local) {
      fotosRechazadas.set(f.id, TEXTO_FOTO_SERVIDOR.sinArchivo)
      return 'rechazada'
    }
    // El almacén solo recibe hasta 1 MB: una foto más pesada ni se intenta (el almacén la rechazaría igual).
    if (local.bytes.byteLength > LIMITE_BYTES_ALMACEN) {
      fotosRechazadas.set(f.id, TEXTO_FOTO_SERVIDOR.grande)
      return 'rechazada'
    }
    const fila = filaDeFoto({ ...f, bytes: local.bytes.byteLength }, s.id)
    try {
      // Primero la imagen y después sus datos: la familia nunca ve una foto cuya imagen todavía no llegó.
      await c.subirFoto(fila.ruta, local.bytes, local.tipo)
      if (fila.tipo === 'hoy' && fila.dia) await quitarFotoDeHoyAnterior(c, s.id, fila.dia, fila.id)
      await c.guardarFoto(fila)
    } catch (e) {
      const motivo = rechazoDeFoto(e)
      if (motivo === null) {
        ponerRed(true)
        return 'sin_red'
      }
      ponerRed(false)
      fotosRechazadas.set(f.id, motivo)
      return 'rechazada'
    }
    ponerRed(false)
    const subida = fotoDeFila(fila as unknown as FilaCruda)
    if (subida) {
      fotosEnBase = [...fotosEnBase.filter((x) => x.id !== subida.id), subida]
      idsDeFotosEnBase.add(subida.id)
      emitirFotos()
    }
    return 'ok'
  }

  async function sincronizarFotos(): Promise<void> {
    if (detenido || subiendoFotos || !sesion || sesion.rol !== 'paseador' || !o.almacenFotos) return
    const c = await o.cliente()
    if (!c || detenido) return
    subiendoFotos = true
    try {
      for (;;) {
        const f = pendientesDeSubir().find((x) => !fotosRechazadas.has(x.id))
        if (!f || !sesion || detenido) break
        const r = await subirUnaFoto(c, sesion, f)
        avisarSubida()
        if (r === 'sin_red') break
      }
    } finally {
      subiendoFotos = false
      avisarSubida()
    }
  }

  function fotosSinSubir(): ReadonlyMap<string, string | null> {
    const m = new Map<string, string | null>()
    for (const f of pendientesDeSubir()) m.set(f.id, fotosRechazadas.get(f.id) ?? null)
    return m
  }

  /** Un enlace que vence para ver una foto del almacén privado. Se reutiliza hasta poco antes de que venza. */
  async function enlaceDeFoto(ruta: string): Promise<string> {
    const ahora = Date.now()
    const previo = enlaces.get(ruta)
    if (previo && previo.hasta > ahora) return previo.url
    const c = await o.cliente()
    if (!c) throw new Error('El servidor no está disponible.')
    const url = await c.enlaceDeFoto(ruta, SEGUNDOS_DEL_ENLACE)
    // Se pide otro un poco antes de que venza, para que ninguna pantalla muestre un enlace muerto.
    enlaces.set(ruta, { url, hasta: ahora + (SEGUNDOS_DEL_ENLACE - 30) * 1000 })
    return url
  }

  /* ---- puntos de control: el inicio y el fin con su ubicación ---- */
  /**
   * Envía el inicio y el fin del paseo que la base todavía no tiene (solo de la paseadora y solo de paseos que ya existen en
   * la base). Cada punto lleva siempre el mismo id: un reintento no lo repite. No sube nada más que esos dos puntos.
   */
  async function sincronizarPuntos(): Promise<void> {
    if (detenido || subiendoPuntos || !sesion || sesion.rol !== 'paseador') return
    cargarLocales()
    const hay = [...ultimo.values()].some((j) => j.walkerId === sesion?.id && puntosPorSubir(j.id, locales.get(j.id)?.puntos, idsDePuntosEnBase).some((p) => !puntosRechazados.has(idDePunto(j.id, p.tipo))))
    if (!hay) return
    const c = await o.cliente()
    if (!c || detenido) return
    subiendoPuntos = true
    try {
      for (const j of [...ultimo.values()]) {
        if (j.walkerId !== sesion?.id) continue
        for (const p of puntosPorSubir(j.id, locales.get(j.id)?.puntos, idsDePuntosEnBase)) {
          const fila = filaDePunto(j.id, p)
          if (puntosRechazados.has(fila.id)) continue
          try {
            await c.crearPunto(fila)
          } catch (e) {
            // Sin internet: el punto sigue en el teléfono y se reintenta. Un «no» de la base no se reintenta.
            if (rechazoDeFoto(e) === null) {
              ponerRed(true)
              return
            }
            ponerRed(false)
            puntosRechazados.add(fila.id)
            continue
          }
          ponerRed(false)
          idsDePuntosEnBase.add(fila.id)
          version += 1
        }
      }
    } finally {
      subiendoPuntos = false
    }
  }

  /* ---- preguntar por cambios ---- */
  /** Alguien pidió leer mientras ya se estaba leyendo: al terminar se lee otra vez (lo anterior pudo quedar viejo). */
  let volverALeer = false
  async function refrescar(): Promise<void> {
    if (detenido) return
    if (refrescando) {
      volverALeer = true
      return
    }
    const c = await o.cliente()
    if (!c || detenido) return
    refrescando = true
    const v = version
    try {
      const d = await descargar(c)
      // Si esta persona cambió algo mientras se bajaba, lo bajado puede ser anterior a su cambio: se descarta y el
      // próximo ciclo trae lo nuevo.
      if (v !== version || escribiendo > 0 || detenido) return
      ponerRed(false)
      const salida = aplicar(d)
      for (const [clave, valor] of Object.entries(salida)) {
        const json = JSON.stringify(valor)
        if (emitido.get(clave) === json) continue
        emitido.set(clave, json)
        aviso?.(clave, valor)
      }
      void sincronizarFotos()
      void sincronizarPuntos()
    } catch {
      // Sin red o la base no respondió: se dice «sin conexión» y el próximo ciclo vuelve a intentar.
      if (v === version) ponerRed(true)
    } finally {
      refrescando = false
      if (volverALeer && !detenido) {
        volverALeer = false
        void refrescar()
      }
    }
  }

  /** Después de subir algo, se vuelve a leer enseguida para traer lo que la base anotó (horas, autor del cambio). */
  function empujarPronto() {
    setTimeout(() => void refrescar(), 0)
  }

  const visible = () => typeof document === 'undefined' || document.visibilityState !== 'hidden'

  return {
    async bajar() {
      const c = await o.cliente()
      if (!c) throw new Error('El servidor no está disponible.')
      let salida: Record<string, unknown>
      try {
        salida = aplicar(await descargar(c))
      } catch (e) {
        ponerRed(true)
        throw e
      }
      ponerRed(false)
      for (const [clave, valor] of Object.entries(salida)) emitido.set(clave, JSON.stringify(valor))
      // Lo que quedó en el teléfono sin enviar (por ejemplo, de antes de recargar) sale en cuanto se sabe quién es.
      setTimeout(() => {
        void sincronizarFotos()
        void sincronizarPuntos()
      }, 0)
      return salida
    },

    sinConexion: () => sinRed,
    alCambiarConexion(f) {
      oyentesDeRed.add(f)
      return () => oyentesDeRed.delete(f)
    },

    async subir(clave, valor) {
      if (clave === CLAVES.paseo) return subirPaseos(valor)
      if (clave === CLAVES.eventos) return subirBitacora(valor)
      if (clave === CLAVES.chat) return subirChat(valor)
      if (clave === CLAVES.cobros) return subirCobros(valor)
      if (clave === CLAVES.casos) return subirCasos(valor)
      if (clave === CLAVES.resenas) return subirResenas(valor)
      // Los pagos NO se escriben así: solo cambian por `mover_pago` (ver `moverPago`). Lo demás (fotos, puntos de control…)
      // no viaja a la base en este paso: el enrutado nunca lo manda aquí.
    },

    async quitar() {
      // La base no borra paseos ni bitácora (ninguna regla lo permite): lo descartado se recuerda en el teléfono.
    },

    escuchar(cb) {
      aviso = cb
      const alVolver = () => {
        if (visible()) void refrescar()
      }
      const alConectar = () => {
        alVolver()
        despertares.forEach((f) => f())
      }
      if (typeof window !== 'undefined') {
        window.addEventListener('focus', alVolver)
        window.addEventListener('online', alConectar)
        bajas.push(() => {
          window.removeEventListener('focus', alVolver)
          window.removeEventListener('online', alConectar)
        })
      }
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', alVolver)
        bajas.push(() => document.removeEventListener('visibilitychange', alVolver))
      }
      const id = setInterval(() => {
        if (visible()) void refrescar()
      }, intervaloMs)
      bajas.push(() => clearInterval(id))
      // Entra o sale una sesión (o se renueva): se vuelve a leer con la identidad nueva.
      void o
        .cliente()
        .then((c) => {
          if (c && !detenido) bajas.push(c.alCambiarSesion(() => void refrescar()))
        })
        .catch(() => undefined)
      return () => {
        aviso = null
        bajas.splice(0).forEach((f) => f())
      }
    },

    identidad(): Identidad | null {
      return sesion ? { rol: sesion.rol, id: sesion.id } : null
    },

    refrescar,
    moverPago,
    pagosEnCola: () => [...colaDePagos.values()].map(({ id, accion }) => ({ id, accion })),
    alCambiarColaDePagos(f) {
      oyentesDeCola.add(f)
      return () => oyentesDeCola.delete(f)
    },
    reintentarPagos() {
      despertares.forEach((f) => f())
    },
    sincronizarFotos,
    sincronizarPuntos,
    fotosSinSubir,
    alCambiarSubidaDeFotos(f) {
      oyentesDeSubida.add(f)
      return () => oyentesDeSubida.delete(f)
    },
    enlaceDeFoto,

    detener() {
      detenido = true
      aviso = null
      cancelarCola(TEXTO_PAGO_SERVIDOR.sinSesion)
      bajas.splice(0).forEach((f) => f())
    },
  }
}
