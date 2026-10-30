/**
 * Qué pasa si la ubicación del paseo deja de llegar o se mueve como un auto (pedido de Yahrod, 30 de octubre de 2026).
 *
 * El caso que preocupa: el paseador baja con un perro caro, sube a un taxi y apaga el celular. La web no puede impedirlo,
 * pero sí puede (1) prevenir: perros de alto valor solo con paseadores Pro o Élite, foto de recojo, código y DNI a la vista;
 * (2) darse cuenta rápido: velocidad de vehículo o minutos sin ubicación; y (3) escalar por pasos, con los botones a mano:
 * chat, Patitas, serenazgo del distrito y Policía, más la última ubicación lista para compartir en Google Maps.
 *
 * Todo esto funciona con la app abierta: con la pantalla apagada el celular no manda la ubicación (lo decimos así).
 */
import { CONFIG, type Config } from './config'
import { haversine } from './route'
import { enlaceMapa } from './sos'

export type Escalon = 'normal' | 'debil' | 'perdida' | 'llamada' | 'alerta'

export interface Lectura {
  lat: number
  lng: number
  /** Hora de la lectura (ms). */
  en: number
}

export interface EstadoSenal {
  escalon: Escalon
  /** Minutos desde la última ubicación. */
  minutos: number
  /** La última ubicación iba más rápido que una caminata, como en un auto. */
  enVehiculo: boolean
  titulo: string
  queHacer: string[]
  /** Qué botones mostrar a la familia, en orden. */
  botones: Array<'chat' | 'patitas' | 'serenazgo' | 'policia' | 'mapa'>
}

/** Velocidad (km/h) entre dos lecturas. 0 si no hay tiempo entre ellas. */
export function velocidadKmh(a: Lectura, b: Lectura): number {
  const horas = Math.abs(b.en - a.en) / 3_600_000
  if (horas === 0) return 0
  return haversine([a.lat, a.lng], [b.lat, b.lng]) / 1000 / horas
}

/**
 * ¿Se mueve como un vehículo? Dos tramos SEGUIDOS más rápidos que `velocidadVehiculoKmh` (uno solo puede ser un salto del
 * GPS). Las lecturas van en orden de hora.
 */
export function enVehiculo(lecturas: Lectura[], c: Config = CONFIG): boolean {
  let seguidos = 0
  for (let i = 1; i < lecturas.length; i++) {
    if (velocidadKmh(lecturas[i - 1], lecturas[i]) > c.senal.velocidadVehiculoKmh) {
      seguidos++
      if (seguidos >= 2) return true
    } else seguidos = 0
  }
  return false
}

/** El escalón según los minutos sin ubicación. En vehículo, se salta directo a la alerta. */
export function escalonDe(minutos: number, vehiculo: boolean, c: Config = CONFIG): Escalon {
  if (vehiculo) return 'alerta'
  const s = c.senal
  if (minutos >= s.minutosAlerta) return 'alerta'
  if (minutos >= s.minutosLlamada) return 'llamada'
  if (minutos >= s.minutosPerdida) return 'perdida'
  if (minutos >= s.minutosDebil) return 'debil'
  return 'normal'
}

const TEXTOS: Record<Escalon, { titulo: string; queHacer: string[]; botones: EstadoSenal['botones'] }> = {
  normal: { titulo: 'Ubicación al día', queHacer: [], botones: ['chat', 'mapa'] },
  debil: {
    titulo: 'La ubicación se está demorando',
    queHacer: ['Puede ser la señal o la batería. Le pedimos al paseador que abra la app.'],
    botones: ['chat', 'mapa'],
  },
  perdida: {
    titulo: 'Sin ubicación desde hace unos minutos',
    queHacer: ['Escríbele por el chat.', 'Le pedimos una foto de control ahora.', 'Si no responde, avisa a Patitas.'],
    botones: ['chat', 'patitas', 'mapa'],
  },
  llamada: {
    titulo: 'El equipo está llamando al paseador',
    queHacer: ['Patitas llama al paseador y a su contacto de emergencia.', 'Ten a mano la última ubicación.'],
    botones: ['patitas', 'chat', 'serenazgo', 'mapa'],
  },
  alerta: {
    titulo: 'Alerta: pide ayuda ya',
    queHacer: ['Llama al serenazgo de tu distrito y comparte la última ubicación.', 'Si crees que es un robo, llama a la Policía.', 'Patitas te da los datos del paseador para la denuncia.'],
    botones: ['serenazgo', 'policia', 'patitas', 'mapa'],
  },
}

/**
 * El estado completo para la pantalla del paseo, a partir de las lecturas y la hora actual.
 * `modo`: con la ubicación en vivo (servidor) los minutos cuentan desde la última lectura; con solo puntos de control, se
 * espera una foto cada `minutosPuntoControl`, así que los escalones empiezan a contar después de ese plazo.
 */
export function estadoSenal(lecturas: Lectura[], ahora: number, c: Config = CONFIG, modo: 'en_vivo' | 'puntos' = 'en_vivo'): EstadoSenal {
  const ultima = lecturas[lecturas.length - 1]
  const minutos = ultima ? Math.max(0, (ahora - ultima.en) / 60_000) : 0
  const vehiculo = enVehiculo(lecturas.slice(-4), c)
  const escalon = escalonDe(modo === 'puntos' ? Math.max(0, minutos - c.minutosPuntoControl) : minutos, vehiculo, c)
  const t = TEXTOS[escalon]
  const titulo = vehiculo ? 'Se mueve como un auto' : t.titulo
  return { escalon, minutos: Math.floor(minutos), enVehiculo: vehiculo, titulo, queHacer: t.queHacer, botones: t.botones }
}

/** Enlace de Google Maps a la última ubicación conocida (null si no hay ninguna). */
export function enlaceUltimaUbicacion(lecturas: Lectura[]): string | null {
  const u = lecturas[lecturas.length - 1]
  return u ? enlaceMapa(u.lat, u.lng) : null
}

/** El texto para compartir la última ubicación por WhatsApp o con el serenazgo. */
export function mensajeUltimaUbicacion(p: { perro: string; paseador: string; lecturas: Lectura[]; ahora: number }): string {
  const enlace = enlaceUltimaUbicacion(p.lecturas)
  if (!enlace) return `${p.perro} está de paseo con ${p.paseador}. Todavía no hay ubicación.`
  const min = Math.floor((p.ahora - p.lecturas[p.lecturas.length - 1].en) / 60_000)
  const hace = min <= 0 ? 'ahora' : `hace ${min} min`
  return `${p.perro} está de paseo con ${p.paseador}. Última ubicación (${hace}): ${enlace}`
}

/* ------------------------------------------------------------------ */
/* Antes de salir: batería y recomendaciones                            */
/* ------------------------------------------------------------------ */

export interface ChequeoSalida {
  id: 'bateria' | 'ubicacion' | 'datos' | 'codigo' | 'foto'
  texto: string
  ok: boolean | null
}

/**
 * Lo que revisa el paseador antes de recoger al perro. `bateria` viene de navigator.getBattery() (0 a 1) cuando el
 * navegador lo permite; null = no se puede saber (Safari) y el paseador lo confirma a mano.
 */
export function chequeoSalida(p: { bateria: number | null; cargando: boolean; ubicacionPermitida: boolean | null; enLinea: boolean }, c: Config = CONFIG): ChequeoSalida[] {
  const pct = p.bateria === null ? null : Math.round(p.bateria * 100)
  return [
    {
      id: 'bateria',
      texto: pct === null ? `Batería de ${c.senal.bateriaMinimaPct} % o más (revísala tú)` : `Batería: ${pct} %${p.cargando ? ' (cargando)' : ''}`,
      ok: pct === null ? null : pct >= c.senal.bateriaMinimaPct || p.cargando,
    },
    { id: 'ubicacion', texto: 'Ubicación permitida en el navegador', ok: p.ubicacionPermitida },
    { id: 'datos', texto: 'Datos o wifi encendidos', ok: p.enLinea },
    { id: 'codigo', texto: 'Pide el código de recojo a la familia', ok: null },
    { id: 'foto', texto: 'Toma la foto de recojo con el perro', ok: null },
  ]
}

/** ¿Puede salir? Solo bloquea lo que se sabe que está mal (batería baja sin cargar, sin ubicación o sin conexión). */
export function puedeSalir(chequeo: ChequeoSalida[]): boolean {
  return chequeo.every((x) => x.ok !== false)
}

/** Recomendaciones fijas, para la familia y para el paseador. */
export const RECOMENDACIONES_SENAL = {
  paseador: [
    'Sal con batería suficiente o con un cargador portátil.',
    'Si el celular se apaga, al prenderlo manda una foto de control de inmediato.',
    'Si te quedas sin batería, pide un celular prestado y llama a Patitas: avisar a tiempo no es falta.',
    'Nunca subas a un vehículo con un perro del paseo.',
  ],
  familia: [
    'Unos minutos sin ubicación suelen ser señal o batería: primero escribe por el chat.',
    'La web te avisa por pasos y te muestra a quién llamar en cada uno.',
    'Ten a mano la foto y los datos del paseador: salen en la ficha del paseo.',
  ],
} as const

/* ------------------------------------------------------------------ */
/* Perros de alto valor: prevención                                     */
/* ------------------------------------------------------------------ */

export const REGLAS_ALTO_VALOR = [
  'Solo paseadores de nivel Pro o Élite, con DNI visto por el equipo.',
  'Recojo con foto en la puerta o en portería, y el código de recojo.',
  'Paseo solo en los parques de la zona: salir de la zona dispara un aviso.',
  'La app del paseador debe quedar abierta durante todo el paseo.',
] as const
