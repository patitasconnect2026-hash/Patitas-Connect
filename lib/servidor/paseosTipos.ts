/**
 * Los paseos con el servidor (paso 6a): las filas de la base y lo mínimo que la app necesita de ella.
 *
 * `ClientePaseos` es una interfaz propia: las pruebas usan un cliente simulado (sin red) y el resto de la app no depende
 * de la librería de Supabase. Todo se hace con la sesión de la persona; la clave «service_role» no existe aquí.
 */
import type { EstadoPaseo } from '../paseo'
import type { AccionPago } from '../pagos'
import type { CambioDeCaso, FilaCasoNueva } from './casosMapeo'
import type { FilaResenaNueva } from './resenasMapeo'

export type RolServidor = 'familia' | 'paseador' | 'equipo'

/** Quién es la persona según la sesión y la base (`perfiles.rol`). */
export interface SesionDePaseos {
  id: string
  rol: RolServidor
}

/** El error de una respuesta de la base. `status` es el estado HTTP; `code`, el código de Postgres o de PostgREST. */
export class ErrorDeBase extends Error {
  constructor(
    mensaje: string,
    public readonly status?: number,
    public readonly code?: string,
  ) {
    super(mensaje)
    this.name = 'ErrorDeBase'
  }
}

/** La base dijo que NO (una regla de acceso, un estado que no existe…): no se reintenta, se explica. */
export { RechazoDelServidor } from '../datos/adaptador'

/** Las filas llegan de la red: se leen sin fiarse de su forma (ver `paseosMapeo.ts`). */
export type FilaCruda = Record<string, unknown>

export interface FilaPaseoNueva {
  /** Cuándo empieza el paseo (ISO). La base lo usa para saber si un paseador ya tiene otro a esa hora. */
  inicio?: string
  id: string
  familia_id: string
  paseador_id: string
  perro_id: string | null
  perro: Record<string, unknown>
  dueno_nombre: string
  paseador_nombre: string
  horario: string
  duracion_min: number
  entrega: 'door' | 'doorman'
  perros_en_grupo: number
  tamano_grupo: 'small' | 'medium' | 'large' | null
  pago_paseador: number
  monto: number
  comision: number
  neto: number
  reserva: Record<string, unknown> | null
  distrito: 'San Isidro' | 'Jesús María' | null
}

export interface CambiosDePaseo {
  estado?: EstadoPaseo
  reporte?: Record<string, unknown> | null
  cerrado_paseador?: boolean
}

export interface FilaEventoNueva {
  paseo_id: string
  accion: string
  de: EstadoPaseo | null
  a: EstadoPaseo
  quien: 'dueno' | 'paseador' | 'sistema'
  en: string
  nota?: string | null
  demo?: boolean
  aviso?: string | null
}

export interface FilaBitacoraNueva {
  id: string
  paseo_id: string
  tipo: string
  texto: string
  en: string
}

/** Un mensaje del chat del paseo (tabla `mensajes`): `de` es 'owner' (la familia) o 'walker' (el paseador). */
export interface FilaMensajeNueva {
  id: string
  paseo_id: string
  de: 'owner' | 'walker'
  texto: string
}

/** Dónde cobra el paseador (tabla `cobros_paseador`): lo ve él y el equipo, nunca la familia. */
export interface FilaCobroNueva {
  paseador_id: string
  metodo: 'yape' | 'plin'
  celular: string
  titular: string
}

/** Los datos de una foto (tabla `fotos`); los bytes están en el almacén privado, en `ruta`. */
export interface FilaFotoNueva {
  id: string
  tipo: 'paseo' | 'hoy'
  paseo_id: string | null
  paseador_id: string
  dia: string | null
  en: string
  codigo: string
  lat: number | null
  lng: number | null
  /** Metros de error de la lectura (null si no hay). */
  precision_m?: number | null
  sin_ubicacion: string | null
  bytes: number
  ruta: string
}

/**
 * El inicio o el fin de un paseo con su ubicación (tabla `puntos_control`). Las fotos son los demás puntos de control (ya
 * viajan en `fotos`). NO es seguimiento continuo: un paseo tiene a lo sumo un inicio y un fin.
 */
export interface FilaPuntoNueva {
  id: string
  paseo_id: string
  tipo: 'inicio' | 'fin'
  en: string
  lat: number | null
  lng: number | null
  precision_m: number | null
  sin_ubicacion: string | null
}

export interface FilaCasaNueva {
  familia_id: string
  calle: string
  unidad: string
  distrito: 'San Isidro' | 'Jesús María' | null
  lat: number | null
  lng: number | null
  hay_portero: boolean
  nombre_portero: string
  emergencia_nombre: string
  emergencia_telefono: string
}

export interface FilaPerroNueva {
  id: string
  familia_id: string
  nombre: string
  raza: string
  edad_anios: number | null
  sexo: 'M' | 'F' | null
  tamano: 'small' | 'medium' | 'large'
  peso_kg: number | null
  pelaje: string | null
  forma: string | null
  temperamento: string[]
  sociable: boolean
  vacunado: boolean
  esterilizado: boolean
  rpp: boolean
  notas: string
  medico: string
  veterinario: string
}

/**
 * Lo que la app le pide a la base para los paseos. Cada método usa la sesión de la persona (las reglas de acceso de la
 * base deciden qué ve y qué cambia) y lanza `ErrorDeBase` si la base respondió con un error, u otro `Error` si no hubo
 * red. No hay ningún método que use la clave de servicio.
 */
export interface ClientePaseos {
  /** La sesión de ahora y su rol leído de la base. null = sin sesión. */
  sesion(): Promise<SesionDePaseos | null>
  /** Avisa cuando entra o sale una sesión (o se renueva). Devuelve cómo dejar de escuchar. */
  alCambiarSesion(aviso: () => void): () => void

  listarPaseos(limite: number): Promise<FilaCruda[]>
  listarEventos(paseos: readonly string[]): Promise<FilaCruda[]>
  listarBitacora(paseos: readonly string[]): Promise<FilaCruda[]>
  listarCodigos(paseos: readonly string[]): Promise<FilaCruda[]>
  /** El chat de esos paseos, del más viejo al más nuevo (la base solo entrega los de los paseos de la persona). */
  listarMensajes(paseos: readonly string[], limite?: number): Promise<FilaCruda[]>
  listarCasas(familias: readonly string[]): Promise<FilaCruda[]>
  listarPerros(ids: readonly string[]): Promise<FilaCruda[]>
  /** La lista pública de paseadores aprobados (`paseadores_publicos`); con `paseadorId`, solo esa fila. */
  paseadoresPublicos(paseadorId?: string): Promise<FilaCruda[]>
  /** Dónde cobra la propia persona (solo ella y el equipo lo ven). */
  miCobro(id: string): Promise<FilaCruda | null>

  guardarCasa(fila: FilaCasaNueva): Promise<void>
  guardarPerro(fila: FilaPerroNueva): Promise<void>
  crearPaseo(fila: FilaPaseoNueva): Promise<void>
  /** El código de recojo del paseo (4 dígitos). Si ya estaba, no lo cambia. */
  crearCodigo(paseo: string, codigo: string): Promise<void>
  /** Cambia un paseo. Con `esperado`, solo si todavía está en ese estado. Devuelve cuántas filas cambió. */
  cambiarPaseo(id: string, cambios: CambiosDePaseo, esperado?: EstadoPaseo): Promise<number>
  crearEvento(fila: FilaEventoNueva): Promise<void>
  crearBitacora(fila: FilaBitacoraNueva): Promise<void>
  /** Manda un mensaje. Si ya estaba (mismo `id`, por un reintento), no hace nada: no se duplica. */
  crearMensaje(fila: FilaMensajeNueva): Promise<void>
  /** `verificar_codigo_recojo`: la base compara el código; el paseador nunca lo lee. */
  verificarCodigo(paseo: string, codigo: string): Promise<boolean>

  /** Los pagos (solo el registro) que le tocan a esta persona: la familia, los de sus paseos; el paseador, los suyos; el equipo, todos. */
  listarPagos(limite: number): Promise<FilaCruda[]>
  /**
   * `mover_pago`: la base valida quién lo hace, en qué estado está el pago y el paseo, y que haya nota si hace falta. Devuelve la
   * fila nueva. Un pago que no se puede mover lanza `ErrorDeBase` (código 42501 o 22023). Nadie escribe `pagos` directo.
   */
  moverPago(paseo: string, accion: AccionPago, datos?: { nota?: string; hora?: string }): Promise<FilaCruda>
  /** Dónde cobran esos paseadores: la base solo entrega el propio (y todos al equipo); a la familia no le entrega nada. */
  listarCobros(paseadores: readonly string[]): Promise<FilaCruda[]>
  /** Guarda dónde cobra la propia persona (si ya había, lo cambia). */
  guardarCobro(fila: FilaCobroNueva): Promise<void>

  /**
   * Los datos de las fotos que le tocan a esta persona: las de esos paseos y las fotos de hoy (de ese día) de los paseadores
   * que puede ver. La base solo entrega lo suyo: la familia, las de sus paseos; el paseador, las que tomó; el equipo, todas.
   */
  listarFotos(paseos: readonly string[], diaHoy: string): Promise<FilaCruda[]>
  /**
   * Sube los bytes al almacén PRIVADO. Si ese archivo ya estaba (un reintento), no hace nada: no se duplica. Lanza `ErrorDeBase`
   * si no (sin permiso 403, más de 1 MB 413, un tipo que no es imagen 415, sin red status 0).
   */
  subirFoto(ruta: string, bytes: ArrayBuffer, tipo: string): Promise<void>
  /** Guarda los datos de la foto. Si esa foto ya estaba (mismo `id`), no hace nada. */
  guardarFoto(fila: FilaFotoNueva): Promise<void>
  /** Borra la fila de una foto de hoy propia (para cambiarla el mismo día). */
  borrarFilaFoto(id: string): Promise<void>
  /** Borra imágenes del almacén (solo la foto de hoy propia; las demás nadie las borra desde la app). */
  quitarImagenes(rutas: readonly string[]): Promise<void>
  /** Un enlace que VENCE para ver una foto. Lanza si esta persona no la puede ver (o no hay sesión). Nunca es una dirección pública. */
  enlaceDeFoto(ruta: string, segundos: number): Promise<string>

  /** El inicio y el fin (con su ubicación) de esos paseos: la base solo entrega los de los paseos de esta persona (y todos al equipo). */
  listarPuntos(paseos: readonly string[]): Promise<FilaCruda[]>
  /** Guarda el inicio o el fin de un paseo (solo su paseador). Si ya estaba (mismo `id`), no hace nada: un reintento no lo repite. */
  crearPunto(fila: FilaPuntoNueva): Promise<void>

  /* ---- casos y disputas (paso 7b) ---- */
  /** Los casos que la base le entrega a esta persona (los de su paseo; el equipo, todos). */
  listarCasos(): Promise<FilaCruda[]>
  /** Abre un caso. Si ya estaba (mismo `id`), no hace nada: un reintento no lo repite. */
  crearCaso(fila: FilaCasoNueva): Promise<void>
  /** Suma el reporte a un caso abierto o (solo el equipo) lo resuelve. Devuelve cuántas filas cambió la base. */
  cambiarCaso(id: string, cambios: CambioDeCaso): Promise<number>

  /* ---- reseñas (parte 3b) ---- */
  /** Las reseñas que escribió esta familia (de cualquier paseador, esté o no aprobado hoy). */
  listarMisResenas(familiaId: string): Promise<FilaCruda[]>
  /** Las últimas reseñas de esos paseadores (la base entrega las de los aprobados, las suyas y, si es el paseador, las que le hicieron). */
  resenasDePaseadores(paseadores: readonly string[], limite?: number): Promise<FilaCruda[]>
  /** Crea la reseña de un paseo cerrado (una por paseo). Si ya estaba, no hace nada: un reintento no la repite. */
  crearResena(fila: FilaResenaNueva): Promise<void>
}
