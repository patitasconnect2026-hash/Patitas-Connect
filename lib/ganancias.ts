/**
 * Modelo de ganancias de Patitas: escenarios mínimo, medio y máximo (pedido de Yahrod, 30 de octubre de 2026).
 *
 * SUPUESTOS, no datos de mercado: el equipo los cambia cuando tenga sus encuestas y sus primeros meses de paseos.
 * Todo sale de lib/config.ts (comisiones por nivel, membresías, fondo de cuidado, bonos) más los supuestos de cada
 * escenario. No incluye impuestos (IGV, renta): con RUC, eso lo calcula un contador.
 */
import { CONFIG, type Config } from './config'
import { descuentoClubMes } from './planes'

export interface Supuestos {
  nombre: string
  paseadores: number
  familias: number
  /** Paseos al mes de una familia promedio. */
  paseosPorFamilia: number
  /** Lo que paga en promedio la familia por paseo (soles). */
  ticket: number
  /** Qué parte de los paseos hace cada nivel (suman 1). */
  mezclaNiveles: { nuevo: number; pro: number; elite: number }
  /** Parte de las familias con Plus y con Club. */
  partePlus: number
  parteClub: number
  /** Paseadores que pagan «Destacado». */
  destacados: number
  /** Paseos cancelados por el paseador que se relanzan con bono (parte de los paseos). */
  parteRescates: number
  /** Comisión de la pasarela de pagos sobre lo cobrado (0 = Yape o transferencia a mano). */
  partePasarela: number
  /** Gastos fijos del mes (hosting, dominio, póliza, contador, publicidad). */
  gastosFijos: number
}

export interface Resultado {
  paseos: number
  /** Todo lo que pagan las familias por paseos. */
  cobradoPaseos: number
  comisionPromedioPct: number
  ingresoComision: number
  ingresoMembresias: number
  ingresoDestacados: number
  ingresoTotal: number
  costoFondo: number
  costoBonos: number
  costoPasarela: number
  gastosFijos: number
  gananciaMes: number
  gananciaAnio: number
  paseosPorPaseador: number
  recibePaseadorMes: number
}

const r2 = (n: number) => Math.round(n * 100) / 100

export function calcular(s: Supuestos, c: Config = CONFIG): Resultado {
  const paseos = Math.round(s.familias * s.paseosPorFamilia)
  const cobradoPaseos = r2(paseos * s.ticket)
  const m = s.mezclaNiveles
  const comisionPromedioPct = r2(m.nuevo * c.comisionPorNivel.nuevo + m.pro * c.comisionPorNivel.pro + m.elite * c.comisionPorNivel.elite)
  const ingresoComision = r2(cobradoPaseos * (comisionPromedioPct / 100))
  const gastoFamiliaMes = s.paseosPorFamilia * s.ticket
  const plus = Math.round(s.familias * s.partePlus)
  const club = Math.round(s.familias * s.parteClub)
  const ingresoMembresias = r2(plus * c.precioPlanFamilia.plus + club * (c.precioPlanFamilia.club - descuentoClubMes(gastoFamiliaMes, c)))
  const ingresoDestacados = r2(s.destacados * c.precioDestacadoMes)
  const ingresoTotal = r2(ingresoComision + ingresoMembresias + ingresoDestacados)
  const costoFondo = r2(paseos * c.fondoCuidado.aportePorPaseo)
  const costoBonos = r2(Math.round(paseos * s.parteRescates) * c.bonoRescate)
  const costoPasarela = r2(cobradoPaseos * s.partePasarela)
  const gananciaMes = r2(ingresoTotal - costoFondo - costoBonos - costoPasarela - s.gastosFijos)
  const paseosPorPaseador = s.paseadores > 0 ? Math.round(paseos / s.paseadores) : 0
  const recibePaseadorMes = s.paseadores > 0 ? r2(((cobradoPaseos - ingresoComision) / s.paseadores)) : 0
  return {
    paseos,
    cobradoPaseos,
    comisionPromedioPct,
    ingresoComision,
    ingresoMembresias,
    ingresoDestacados,
    ingresoTotal,
    costoFondo,
    costoBonos,
    costoPasarela,
    gastosFijos: s.gastosFijos,
    gananciaMes,
    gananciaAnio: r2(gananciaMes * 12),
    paseosPorPaseador,
    recibePaseadorMes,
  }
}

/** Los tres escenarios. Supuestos del equipo para conversar, no promesas. */
export const ESCENARIOS: Supuestos[] = [
  {
    nombre: 'Mínimo',
    paseadores: 10,
    familias: 40,
    paseosPorFamilia: 6,
    ticket: 22,
    mezclaNiveles: { nuevo: 0.9, pro: 0.1, elite: 0 },
    partePlus: 0.1,
    parteClub: 0,
    destacados: 0,
    parteRescates: 0.03,
    partePasarela: 0,
    gastosFijos: 120,
  },
  {
    nombre: 'Medio',
    paseadores: 40,
    familias: 250,
    paseosPorFamilia: 8,
    ticket: 23,
    mezclaNiveles: { nuevo: 0.5, pro: 0.4, elite: 0.1 },
    partePlus: 0.2,
    parteClub: 0.06,
    destacados: 4,
    parteRescates: 0.02,
    partePasarela: 0.02,
    gastosFijos: 1500,
  },
  {
    nombre: 'Máximo',
    paseadores: 150,
    familias: 1200,
    paseosPorFamilia: 10,
    ticket: 24,
    mezclaNiveles: { nuevo: 0.3, pro: 0.5, elite: 0.2 },
    partePlus: 0.25,
    parteClub: 0.1,
    destacados: 20,
    parteRescates: 0.02,
    partePasarela: 0.035,
    gastosFijos: 8000,
  },
]
