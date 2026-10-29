/**
 * La zona de servicio: San Isidro y Jesús María, con un margen (CONFIG.zonaBufferMetros).
 * Funciones PURAS: usan los polígonos reales de lib/geo.ts (OpenStreetMap) y nada más. Sin librerías de geometría.
 *
 *  - «dentro»: el punto está dentro de alguno de los dos distritos.
 *  - «borde»: está afuera, pero a no más de `zonaBufferMetros` del borde de la zona.
 *  - «fuera»: más lejos que eso.
 *
 * El «borde de la zona» es el borde EXTERIOR de los dos distritos juntos: la frontera entre San Isidro y
 * Jesús María no cuenta como salir de la zona.
 *
 * Las distancias se calculan en un plano local (proyección equirectangular centrada en el punto): para
 * unos pocos kilómetros el error es de centímetros, de sobra para decidir «a 100 m del borde».
 */
import { CONFIG } from './config'
import { DISTRICTS, SPOTS, type District, type LatLng } from './geo'

export type ClaseZona = 'dentro' | 'borde' | 'fuera'

const RADIO_TIERRA_M = 6_371_000
const RAD = Math.PI / 180
/** Una arista de un distrito que está a menos de esto de la del otro se considera la MISMA (frontera compartida). */
const TOLERANCIA_FRONTERA_M = 3

/** Metros (este, norte) de `p` respecto de `origen`, en un plano local. */
function aPlano(p: LatLng, origen: LatLng): [number, number] {
  return [(p[1] - origen[1]) * RAD * RADIO_TIERRA_M * Math.cos(origen[0] * RAD), (p[0] - origen[0]) * RAD * RADIO_TIERRA_M]
}

/** Cuántos metros hay de `a` a `b`, hacia el este y hacia el norte. */
export function vectorMetros(a: LatLng, b: LatLng): [number, number] {
  return aPlano(b, a)
}

/** Lo contrario de aPlano: de metros (este, norte) desde `origen` a latitud y longitud. */
export function desplazar(origen: LatLng, metrosEste: number, metrosNorte: number): LatLng {
  return [origen[0] + metrosNorte / (RAD * RADIO_TIERRA_M), origen[1] + metrosEste / (RAD * RADIO_TIERRA_M * Math.cos(origen[0] * RAD))]
}

/** Distancia entre dos puntos, en metros (plano local; sirve para distancias de pocos kilómetros). */
export function distanciaMetros(a: LatLng, b: LatLng): number {
  const [x, y] = aPlano(b, a)
  return Math.hypot(x, y)
}

/** Punto más cercano a (0,0) del segmento a-b, en metros (plano local). */
function cercanoEnSegmento(ax: number, ay: number, bx: number, by: number): [number, number] {
  const dx = bx - ax
  const dy = by - ay
  const largo2 = dx * dx + dy * dy
  if (largo2 === 0) return [ax, ay]
  const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / largo2))
  return [ax + t * dx, ay + t * dy]
}

/** ¿El punto está dentro del polígono? (trazado de rayos; el polígono puede traer repetido el primer punto). */
export function puntoEnPoligono(p: LatLng, poligono: readonly LatLng[]): boolean {
  let dentro = false
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [yi, xi] = poligono[i]
    const [yj, xj] = poligono[j]
    if (yi > p[0] !== yj > p[0] && p[1] < ((xj - xi) * (p[0] - yi)) / (yj - yi) + xi) dentro = !dentro
  }
  return dentro
}

interface Arista {
  a: LatLng
  b: LatLng
}

/** Distancia (m) de `p` al borde de UN polígono, esté `p` dentro o fuera. */
export function distanciaAlPoligonoMetros(p: LatLng, poligono: readonly LatLng[]): number {
  let mejor = Infinity
  for (let i = 0; i < poligono.length; i++) {
    const [ax, ay] = aPlano(poligono[i], p)
    const [bx, by] = aPlano(poligono[(i + 1) % poligono.length], p)
    const [cx, cy] = cercanoEnSegmento(ax, ay, bx, by)
    mejor = Math.min(mejor, Math.hypot(cx, cy))
  }
  return mejor
}

let exteriores: Arista[] | null = null

/**
 * Las aristas del borde EXTERIOR de la zona: las de cada distrito que no son frontera con el otro.
 * Se calculan una sola vez, con los polígonos reales.
 */
export function aristasExteriores(): readonly Arista[] {
  if (exteriores) return exteriores
  const salida: Arista[] = []
  DISTRICTS.forEach((d, i) => {
    const otros = DISTRICTS.filter((_, k) => k !== i)
    for (let k = 0; k < d.polygon.length; k++) {
      const a = d.polygon[k]
      const b = d.polygon[(k + 1) % d.polygon.length]
      if (a[0] === b[0] && a[1] === b[1]) continue
      const medio: LatLng = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
      const esFrontera = otros.some((o) => puntoEnPoligono(medio, o.polygon) || distanciaAlPoligonoMetros(medio, o.polygon) < TOLERANCIA_FRONTERA_M)
      if (!esFrontera) salida.push({ a, b })
    }
  })
  exteriores = salida
  return salida
}

/** El punto de la zona más cercano a `p` sobre el borde exterior, y a qué distancia (m) queda. */
export function bordeMasCercano(p: LatLng): { punto: LatLng; metros: number } {
  let mejor = { punto: p, metros: Infinity }
  for (const e of aristasExteriores()) {
    const [ax, ay] = aPlano(e.a, p)
    const [bx, by] = aPlano(e.b, p)
    const [cx, cy] = cercanoEnSegmento(ax, ay, bx, by)
    const d = Math.hypot(cx, cy)
    if (d < mejor.metros) mejor = { punto: desplazar(p, cx, cy), metros: d }
  }
  return mejor
}

/** Distancia (m) de `p` al borde exterior de la zona, esté adentro o afuera. */
export function distanciaAlBordeMetros(p: LatLng): number {
  return bordeMasCercano(p).metros
}

/** ¿El punto está dentro de San Isidro o de Jesús María? */
export function enZona(p: LatLng): boolean {
  return DISTRICTS.some((d) => puntoEnPoligono(p, d.polygon))
}

/** «dentro», «borde» (hasta `bufferMetros` afuera) o «fuera». */
export function clasificarPunto(p: LatLng, bufferMetros: number = CONFIG.zonaBufferMetros): ClaseZona {
  if (enZona(p)) return 'dentro'
  return distanciaAlBordeMetros(p) <= bufferMetros ? 'borde' : 'fuera'
}

/** ¿Se puede atender en este punto? (dentro o en el borde) */
export function sePuedeAtender(p: LatLng, bufferMetros: number = CONFIG.zonaBufferMetros): boolean {
  return clasificarPunto(p, bufferMetros) !== 'fuera'
}

/** El distrito de un punto: donde cae; si cae en el borde (afuera), el distrito más cercano; `null` si está fuera. */
export function distritoDe(p: LatLng, bufferMetros: number = CONFIG.zonaBufferMetros): District['name'] | null {
  const dentro = DISTRICTS.find((d) => puntoEnPoligono(p, d.polygon))
  if (dentro) return dentro.name
  if (clasificarPunto(p, bufferMetros) === 'fuera') return null
  let mejor = DISTRICTS[0]
  for (const d of DISTRICTS) if (distanciaAlPoligonoMetros(p, d.polygon) < distanciaAlPoligonoMetros(p, mejor.polygon)) mejor = d
  return mejor.name
}

/** Por qué una reserva no puede salir de la casa del dueño: `casa` = aún no la marcó; `zona` = queda fuera. */
export type BloqueoZona = 'casa' | 'zona'

/** `null` = se puede reservar desde esa casa (dentro de la zona o en el borde). */
export function bloqueoPorZona(casa: LatLng | null | undefined, bufferMetros: number = CONFIG.zonaBufferMetros): BloqueoZona | null {
  if (!casa) return 'casa'
  return clasificarPunto(casa, bufferMetros) === 'fuera' ? 'zona' : null
}

/** ¿Todos esos parques (por id) existen y se pueden atender? Un paseador no ofrece puntos fuera de la zona. */
export function parquesEnZona(ids: readonly string[], bufferMetros: number = CONFIG.zonaBufferMetros): boolean {
  return ids.every((id) => {
    const parque = SPOTS.find((s) => s.id === id)
    return !!parque && sePuedeAtender(parque.pos, bufferMetros)
  })
}

/* ------------------------------------------------------------------ */
/* Avisos durante el paseo (reglas puras; los umbrales están en CONFIG) */
/* ------------------------------------------------------------------ */

/** Una lectura de ubicación: dónde, con qué error (m) y a qué hora (ms). */
export interface Lectura {
  pos: LatLng
  precisionM: number
  t: number
}

/**
 * Qué se avisa:
 *  - `borde`: el paseo está a menos de `avisoBordeMetros` del borde de la zona (aviso suave).
 *  - `salida`: `lecturasFueraParaAlerta` lecturas seguidas «fuera» (alerta; se da una sola vez).
 *  - `regreso`: volvió a la zona después de una salida.
 *  - `salto`: se movió más rápido que una caminata (`velocidadMaximaKmh`): esa lectura se descarta.
 *  - `quieto`: `minutosQuietoParaAviso` minutos sin salir de un radio de `radioQuietoMetros`.
 */
export type TipoAviso = 'borde' | 'salida' | 'regreso' | 'salto' | 'quieto' | 'sin_ubicacion'
export type NivelAviso = 'alerta' | 'suave' | 'info'

/**
 * Qué tan fuerte se muestra cada aviso. Ninguno bloquea al paseador: solo avisan.
 * `sin_ubicacion` no sale del motor: lo anota la app cuando el paseador no comparte la ubicación (permiso negado,
 * «Ahora no» o un navegador que no la permite).
 */
export const NIVEL_AVISO: Record<TipoAviso, NivelAviso> = {
  salida: 'alerta',
  quieto: 'alerta',
  borde: 'suave',
  salto: 'suave',
  sin_ubicacion: 'suave',
  regreso: 'info',
}

export interface Aviso {
  tipo: TipoAviso
  /** Hora de la lectura que lo causó (ms). */
  t: number
}

/** Lo que el motor recuerda entre lectura y lectura. Es JSON: se guarda dentro del encargo. */
export interface Vigilancia {
  /** Última lectura que se aceptó (buena y sin salto). */
  ultima: Lectura | null
  seguidasFuera: number
  salidaAvisada: boolean
  bordeAvisado: boolean
  saltoAvisado: boolean
  /** Dónde y desde cuándo está dentro del mismo radio (con el error de esa lectura). */
  ancla: { pos: LatLng; desde: number; precisionM: number } | null
  quietoAvisado: boolean
  /** Para contar lo que se ignoró (no son avisos). */
  ignoradasPrecision: number
  descartadasSalto: number
  /** Las últimas lecturas vinieron de una prueba de la demostración (no del teléfono). */
  demo?: boolean
}

export function nuevaVigilancia(): Vigilancia {
  return {
    ultima: null,
    seguidasFuera: 0,
    salidaAvisada: false,
    bordeAvisado: false,
    saltoAvisado: false,
    ancla: null,
    quietoAvisado: false,
    ignoradasPrecision: 0,
    descartadasSalto: 0,
  }
}

export interface ResultadoLectura {
  vigilancia: Vigilancia
  avisos: Aviso[]
  /** Por qué no se tomó en cuenta la lectura (si no se tomó). */
  ignorada?: 'precision' | 'salto'
}

const MS_MIN = 60_000
const MS_HORA = 3_600_000
/** El aviso suave de «borde» se vuelve a armar cuando el paseo se aleja a más de esta proporción del umbral. */
const HISTERESIS_BORDE = 1.5

/**
 * Procesa UNA lectura. Las reglas, en orden:
 *  1. Precisión peor que `precisionMaximaMetros`: se ignora (no cuenta para nada).
 *  2. Velocidad imposible para una caminata: se descarta el salto (y se avisa una vez). Si la distancia cabe en el
 *     error de las dos lecturas no es un salto, es ruido.
 *  3. Zona: `lecturasFueraParaAlerta` «fuera» seguidas → alerta de salida (una vez); volver → «regreso».
 *  4. A menos de `avisoBordeMetros` del borde → aviso suave (una vez hasta que se aleje).
 *  5. Dentro de un radio de `radioQuietoMetros` durante `minutosQuietoParaAviso` minutos → aviso de quieto (una vez).
 */
export function evaluarLectura(v: Vigilancia, l: Lectura, cfg: typeof CONFIG = CONFIG): ResultadoLectura {
  if (l.precisionM > cfg.precisionMaximaMetros) {
    return { vigilancia: { ...v, ignoradasPrecision: v.ignoradasPrecision + 1 }, avisos: [], ignorada: 'precision' }
  }

  if (v.ultima) {
    const dt = l.t - v.ultima.t
    const d = distanciaMetros(v.ultima.pos, l.pos)
    const ruido = v.ultima.precisionM + l.precisionM
    const imposible = d > ruido && (dt <= 0 || d / 1000 / (dt / MS_HORA) > cfg.velocidadMaximaKmh)
    if (imposible) {
      return {
        vigilancia: { ...v, saltoAvisado: true, descartadasSalto: v.descartadasSalto + 1 },
        avisos: v.saltoAvisado ? [] : [{ tipo: 'salto', t: l.t }],
        ignorada: 'salto',
      }
    }
  }

  const nv: Vigilancia = { ...v, ultima: l, saltoAvisado: false }
  const avisos: Aviso[] = []
  const clase = clasificarPunto(l.pos, cfg.zonaBufferMetros)

  // Zona: la alerta pide lecturas seguidas «fuera» (una sola no alcanza)
  if (clase === 'fuera') {
    nv.seguidasFuera = v.seguidasFuera + 1
    if (nv.seguidasFuera >= cfg.lecturasFueraParaAlerta && !v.salidaAvisada) {
      avisos.push({ tipo: 'salida', t: l.t })
      nv.salidaAvisada = true
    }
  } else {
    if (v.salidaAvisada) avisos.push({ tipo: 'regreso', t: l.t })
    nv.seguidasFuera = 0
    nv.salidaAvisada = false
  }

  // Aviso suave cerca del borde (de cualquier lado del borde de los distritos)
  const alBorde = distanciaAlBordeMetros(l.pos)
  if (alBorde < cfg.avisoBordeMetros) {
    if (!v.bordeAvisado && clase !== 'fuera') {
      avisos.push({ tipo: 'borde', t: l.t })
      nv.bordeAvisado = true
    }
  } else if (alBorde >= cfg.avisoBordeMetros * HISTERESIS_BORDE) {
    nv.bordeAvisado = false
  }

  // Quieto: el error del GPS no cuenta como movimiento (el radio crece con el error de las dos lecturas)
  const radio = v.ancla ? Math.max(cfg.radioQuietoMetros, v.ancla.precisionM + l.precisionM) : cfg.radioQuietoMetros
  if (!v.ancla || distanciaMetros(v.ancla.pos, l.pos) > radio) {
    nv.ancla = { pos: l.pos, desde: l.t, precisionM: l.precisionM }
    nv.quietoAvisado = false
  } else if (!v.quietoAvisado && l.t - v.ancla.desde >= cfg.minutosQuietoParaAviso * MS_MIN) {
    avisos.push({ tipo: 'quieto', t: l.t })
    nv.quietoAvisado = true
  }

  return { vigilancia: nv, avisos }
}

/** Procesa varias lecturas en orden y junta los avisos. */
export function evaluarLecturas(v: Vigilancia, lecturas: readonly Lectura[], cfg: typeof CONFIG = CONFIG): { vigilancia: Vigilancia; avisos: Aviso[] } {
  let actual = v
  const avisos: Aviso[] = []
  for (const l of lecturas) {
    const r = evaluarLectura(actual, l, cfg)
    actual = r.vigilancia
    avisos.push(...r.avisos)
  }
  return { vigilancia: actual, avisos }
}

/** El tamaño de la cuadrícula (grados) con la que la base redondea la casa antes de que la familia elija a alguien: ≈ 330 m. Es el mismo 0.003 de `crear_pedido` (migración de pedidos). */
export const GRADOS_ZONA_APROXIMADA = 0.003

/** El punto de la cuadrícula más cercano a la casa: lo único que ve un paseador antes de ser elegido (el redondeo de la base). */
export function redondearZona(p: LatLng): LatLng {
  const r = (x: number) => Math.round((Math.round(x / GRADOS_ZONA_APROXIMADA) * GRADOS_ZONA_APROXIMADA) * 1e6) / 1e6
  return [r(p[0]), r(p[1])]
}
