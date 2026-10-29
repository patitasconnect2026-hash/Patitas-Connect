/**
 * Lecturas de ubicación INVENTADAS para probar los avisos sin salir a caminar (demostración).
 * Son funciones puras: dado un escenario y la hora «ahora», devuelven las lecturas (la última es «ahora» y las
 * anteriores quedan en el pasado, cada 45 s o 60 s). Las posiciones salen de los polígonos reales de lib/geo.ts:
 * el borde más cercano a `desde` y la dirección hacia afuera.
 */
import { CONFIG } from './config'
import { HOME_POINT, SPOTS, type LatLng } from './geo'
import { bordeMasCercano, clasificarPunto, desplazar, distanciaMetros, evaluarLecturas, nuevaVigilancia, vectorMetros, type Lectura, type TipoAviso } from './zona'

export const ESCENARIOS = ['borde', 'salida', 'salto', 'quieto', 'imprecisas'] as const
export type EscenarioAviso = (typeof ESCENARIOS)[number]

/** Cuánto sale en el botón y qué cuenta (cortos). */
export const TEXTO_ESCENARIO: Record<EscenarioAviso, { boton: string; que: string }> = {
  borde: { boton: 'Cerca del borde', que: 'Se acerca al límite de la zona.' },
  salida: { boton: 'Salida de zona', que: 'Sale de la zona y vuelve.' },
  salto: { boton: 'Salto imposible', que: 'La ubicación salta kilómetros en segundos.' },
  quieto: { boton: `Quieto ${CONFIG.minutosQuietoParaAviso} min`, que: 'Casi no se mueve durante once minutos.' },
  imprecisas: { boton: 'Poca precisión', que: 'Señales con error de 120 m: se ignoran.' },
}

const PASO_MS = 45_000
const PASO_QUIETO_MS = 60_000
/** Error típico de un buen GPS en la calle. */
const PRECISION_BUENA = 10
const PRECISION_MALA = 120
/** Entre una lectura y otra, a pie, no se avanzan más de ~100 m (8 km/h cada 45 s). */
const PASO_M = 100

/** Dirección (unitaria, este y norte) de `desde` hacia el borde más cercano, y la distancia. */
function haciaElBorde(desde: LatLng): { borde: LatLng; u: [number, number]; metros: number } {
  const borde = bordeMasCercano(desde).punto
  const [e, n] = vectorMetros(desde, borde)
  const metros = Math.hypot(e, n)
  return { borde, u: metros > 0 ? [e / metros, n / metros] : [0, -1], metros }
}

/**
 * De adentro hacia afuera pasando el margen: la dirección (desde el borde más cercano) por la que antes se llega a
 * estar «fuera». En una zona con barrios angostos entre distritos (como Lince) la salida más corta no es recta.
 * Devuelve cuántos metros hay que alejarse del borde para quedar «fuera» (y quedarse ahí al menos 150 m más).
 */
function salidaMasCorta(borde: LatLng, u0: [number, number]): { u: [number, number]; fuera: number } {
  const base = Math.atan2(u0[1], u0[0])
  let mejor: { u: [number, number]; fuera: number } | null = null
  for (let k = 0; k < 24; k++) {
    const ang = base + (k * Math.PI) / 12
    const u: [number, number] = [Math.cos(ang), Math.sin(ang)]
    for (let s = 25; s <= 1500; s += 25) {
      const queda = (m: number) => clasificarPunto(desplazar(borde, u[0] * m, u[1] * m)) === 'fuera'
      if (queda(s) && queda(s + 50) && queda(s + 100) && queda(s + 150)) {
        if (!mejor || s < mejor.fuera) mejor = { u, fuera: s }
        break
      }
    }
  }
  return mejor ?? { u: u0, fuera: 400 }
}

function conHoras(posiciones: Array<{ pos: LatLng; precisionM?: number }>, ahora: number, pasoMs: number): Lectura[] {
  const n = posiciones.length
  return posiciones.map((p, i) => ({ pos: p.pos, precisionM: p.precisionM ?? PRECISION_BUENA, t: ahora - (n - 1 - i) * pasoMs }))
}

/** Pequeños movimientos de quien está parado (no pasan de 7 m). */
const TEMBLOR: Array<[number, number]> = [
  [0, 0],
  [6, -4],
  [-5, 3],
  [4, 5],
  [-6, -2],
  [3, -6],
  [-3, 4],
  [5, 2],
  [-4, -5],
  [2, 6],
  [-6, 1],
  [1, -3],
]

export function lecturasDeEscenario(escenario: EscenarioAviso, ahora: number, desde: LatLng = HOME_POINT): Lectura[] {
  const { borde, u, metros } = haciaElBorde(desde)
  /** Punto a `m` metros del borde, hacia adentro (por la recta que viene de `desde`). */
  const adentro = (m: number): LatLng => {
    const recorrido = metros - Math.min(m, metros)
    return desplazar(desde, u[0] * recorrido, u[1] * recorrido)
  }
  switch (escenario) {
    case 'borde':
      return conHoras([260, 200, 150, 100, 60, 30].map((m) => ({ pos: adentro(m) })), ahora, PASO_MS)
    case 'salida': {
      // Adentro y cerca del borde → afuera pasando el margen (dos lecturas «fuera») → de vuelta.
      const { u: w, fuera } = salidaMasCorta(borde, u)
      const ida: number[] = []
      for (let s = 0; s < fuera + 150; s += PASO_M) ida.push(s)
      ida.push(fuera + 150)
      const afuera = ida.map((s) => desplazar(borde, w[0] * s, w[1] * s))
      const vuelta = [...afuera].reverse().slice(1)
      return conHoras([adentro(120), adentro(20), ...afuera, ...vuelta].map((pos) => ({ pos })), ahora, PASO_MS)
    }
    case 'salto': {
      const lejos = SPOTS.reduce((m, s) => (distanciaMetros(desde, s.pos) > distanciaMetros(desde, m.pos) ? s : m)).pos
      return conHoras([{ pos: desde }, { pos: lejos }, { pos: desplazar(desde, 15, 10) }], ahora, PASO_MS)
    }
    case 'quieto':
      return conHoras(TEMBLOR.map(([e, n]) => ({ pos: desplazar(desde, e, n) })), ahora, PASO_QUIETO_MS)
    case 'imprecisas': {
      const lejos = desplazar(borde, u[0] * 2000, u[1] * 2000)
      return conHoras(
        [
          { pos: lejos, precisionM: PRECISION_MALA },
          { pos: desplazar(lejos, 80, 40), precisionM: PRECISION_MALA },
          { pos: desplazar(lejos, -60, 90), precisionM: PRECISION_MALA },
          { pos: desde },
        ],
        ahora,
        PASO_MS,
      )
    }
  }
}

export interface ResumenEscenario {
  lecturas: number
  ignoradasPorPrecision: number
  saltosDescartados: number
  avisos: TipoAviso[]
}

/** Qué pasaría con ese escenario (sin guardar nada): para mostrar un resumen corto. */
export function resumirEscenario(escenario: EscenarioAviso, desde: LatLng = HOME_POINT): ResumenEscenario {
  const lecturas = lecturasDeEscenario(escenario, 0, desde)
  const r = evaluarLecturas(nuevaVigilancia(), lecturas)
  return {
    lecturas: lecturas.length,
    ignoradasPorPrecision: r.vigilancia.ignoradasPrecision,
    saltosDescartados: r.vigilancia.descartadasSalto,
    avisos: r.avisos.map((a) => a.tipo),
  }
}
