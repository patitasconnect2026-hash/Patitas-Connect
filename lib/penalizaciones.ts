/**
 * Faltas, pausas y reemplazo cuando alguien no cumple (pedido de Yahrod, 30 de octubre de 2026).
 *
 * Idea: que nadie se aproveche. Si el paseador cancela a última hora, la familia no se queda sin paseo (se relanza el
 * pedido «tipo InDrive» con un bono que paga Patitas de su comisión) y el paseador suma faltas. Una emergencia real, con
 * prueba, no cuenta. Si la familia cancela tarde o acusa sin pruebas, también suma. Las decisiones finales las toma una
 * persona del equipo; esto solo ordena los casos.
 */
import { CONFIG, type Config } from './config'
import { planFamilia, type PlanFamiliaId } from './planes'

/* ------------------------------------------------------------------ */
/* Paseador                                                             */
/* ------------------------------------------------------------------ */

export type MotivoCancelacion = 'emergencia' | 'personal' | 'no_se_presento'

export interface Falta {
  puntos: 0 | 1 | 2 | 3
  tipo: 'ninguna' | 'leve' | 'grave'
  explicacion: string
  /** El equipo debe mirar la prueba (emergencias). */
  revisarPrueba: boolean
}

/**
 * La falta de un paseador que cancela. `horasAntes` = cuánto faltaba para el paseo. Una emergencia con prueba (foto,
 * constancia, mensaje) no suma puntos, pero el equipo la revisa. No presentarse es siempre grave.
 */
export function faltaPorCancelar(p: { horasAntes: number; motivo: MotivoCancelacion; conPrueba: boolean }): Falta {
  if (p.motivo === 'no_se_presento') return { puntos: 3, tipo: 'grave', explicacion: 'No llegó al paseo ni avisó.', revisarPrueba: false }
  if (p.motivo === 'emergencia' && p.conPrueba) return { puntos: 0, tipo: 'ninguna', explicacion: 'Emergencia con constancia: no suma falta si el equipo la confirma.', revisarPrueba: true }
  if (p.horasAntes >= 12) return { puntos: 0, tipo: 'ninguna', explicacion: 'Canceló con tiempo.', revisarPrueba: false }
  if (p.horasAntes >= 2) return { puntos: 1, tipo: 'leve', explicacion: 'Canceló con menos de 12 horas.', revisarPrueba: false }
  return { puntos: 2, tipo: 'grave', explicacion: 'Canceló con menos de 2 horas.', revisarPrueba: p.motivo === 'emergencia' }
}

export type EstadoCuenta = 'al_dia' | 'aviso' | 'pausa' | 'revision'

/** Qué pasa con la cuenta según los puntos de los últimos 30 días. */
export function estadoPorFaltas(puntos30d: number): { estado: EstadoCuenta; texto: string; diasPausa: number } {
  if (puntos30d >= 8) return { estado: 'revision', texto: 'Cuenta en revisión: el equipo te llama antes de que vuelvas a pasear.', diasPausa: 30 }
  if (puntos30d >= 5) return { estado: 'pausa', texto: 'Pausa de 7 días sin pedidos nuevos.', diasPausa: 7 }
  if (puntos30d >= 3) return { estado: 'aviso', texto: 'Aviso: bajas en la lista y no subes de nivel este mes.', diasPausa: 0 }
  return { estado: 'al_dia', texto: 'Al día.', diasPausa: 0 }
}

/* ------------------------------------------------------------------ */
/* Reemplazo «tipo InDrive»                                             */
/* ------------------------------------------------------------------ */

export interface PlanRescate {
  /** El pedido se relanza a los paseadores cercanos con el mismo precio más este bono. */
  bono: number
  /** «urgente» si falta menos de una hora: se avisa también al paseador de respaldo. */
  urgencia: 'normal' | 'urgente'
  /** La familia entra antes en la fila (Plus y Club). */
  prioritario: boolean
  /** Minutos que se espera una respuesta antes de ofrecerle a la familia reprogramar. */
  minutosEspera: number
  pasos: string[]
}

/**
 * Qué se hace cuando un paseador cancela. El bono sale de la comisión de Patitas y nunca la pasa (hay una prueba): el
 * paseador que rescata gana más, la familia no paga más.
 */
export function planDeRescate(p: { precio: number; comisionPct: number; plan: PlanFamiliaId; minutosParaPaseo: number }, c: Config = CONFIG): PlanRescate {
  const prioritario = planFamilia(p.plan, c).limites.reemplazoPrioritario
  const bonoPedido = prioritario ? c.bonoRescatePlan : c.bonoRescate
  const comision = p.precio * (p.comisionPct / 100)
  const bono = Math.floor(Math.min(bonoPedido, comision) * 100) / 100
  const urgencia = p.minutosParaPaseo < 60 ? 'urgente' : 'normal'
  const minutosEspera = urgencia === 'urgente' ? 10 : 30
  const pasos = [
    'Te avisamos al instante que el paseador canceló.',
    'Relanzamos tu pedido a paseadores cercanos, con un bono para quien lo tome.',
    urgencia === 'urgente' ? 'Como es pronto, también avisamos al paseador de respaldo.' : 'Eliges entre los que respondan.',
    `Si en ${minutosEspera} minutos nadie responde, puedes reprogramar sin costo.`,
  ]
  return { bono, urgencia, prioritario, minutosEspera, pasos }
}

/* ------------------------------------------------------------------ */
/* Familia                                                              */
/* ------------------------------------------------------------------ */

export interface CancelacionFamilia {
  tardia: boolean
  /** Lo que le corresponde al paseador cuando se cobre de verdad (porcentaje del paseo). 0 si no aplica. */
  pagoAlPaseadorPct: number
  texto: string
}

/** Cancelar tarde o no estar en casa: la ventana gratis depende del plan; no estar es como cancelar tarde. */
export function cancelacionFamilia(p: { horasAntes: number; plan: PlanFamiliaId; noEstaba?: boolean }, c: Config = CONFIG): CancelacionFamilia {
  const ventana = planFamilia(p.plan, c).limites.horasCancelacionGratis
  if (!p.noEstaba && p.horasAntes >= ventana) return { tardia: false, pagoAlPaseadorPct: 0, texto: 'Cancelación gratis.' }
  return {
    tardia: true,
    pagoAlPaseadorPct: c.cancelacionTardiaPct,
    texto: p.noEstaba ? 'El paseador llegó y no había nadie: cuenta como cancelación tardía.' : 'Cancelación tardía: queda anotada.',
  }
}

/* ------------------------------------------------------------------ */
/* Reportes: que nadie acuse sin pruebas                                */
/* ------------------------------------------------------------------ */

export interface Evidencia {
  /** Foto de recojo con el perro, hora y lugar. */
  fotoRecojo: boolean
  /** Foto de entrega con el perro, hora y lugar. */
  fotoEntrega: boolean
  /** La familia marcó «Llegó bien» (o el estado del perro) al recibirlo. */
  entregaConfirmada: boolean
  /** Puntos de control con foto durante el paseo. */
  puntosControl: number
  /** Lo que trae quien reporta: fotos, video, constancia veterinaria. */
  pruebasDelReporte: number
}

export type Lectura = 'a_favor_del_reporte' | 'a_favor_del_paseador' | 'revisar'

/**
 * Lectura preliminar de un reporte de la familia contra el paseador. Un reporte sin pruebas frente a un paseo bien
 * documentado (fotos, puntos de control y entrega confirmada) queda a favor del paseador, salvo que el equipo vea algo más.
 * Nunca decide sola: es el orden en que el equipo mira el caso.
 */
export function leerReporte(e: Evidencia, horasDesdeEntrega: number, c: Config = CONFIG): { lectura: Lectura; motivo: string } {
  const documentado = e.fotoRecojo && e.fotoEntrega && e.puntosControl >= 2
  if (e.pruebasDelReporte > 0 && horasDesdeEntrega <= c.fondoCuidado.horasParaReportar) {
    return { lectura: e.entregaConfirmada ? 'revisar' : 'a_favor_del_reporte', motivo: 'Hay fotos y señales, y se reportó a tiempo.' }
  }
  if (documentado && e.entregaConfirmada && e.pruebasDelReporte === 0) {
    return { lectura: 'a_favor_del_paseador', motivo: 'El paseo tiene fotos, puntos de control y la entrega fue confirmada sin observaciones.' }
  }
  if (horasDesdeEntrega > c.fondoCuidado.horasParaReportar) return { lectura: 'revisar', motivo: 'Se reportó fuera del plazo: el equipo lo mira con más cuidado.' }
  return { lectura: 'revisar', motivo: 'Faltan fotos o señales de una o de las dos partes.' }
}

/** Dos reportes sin sustento en 90 días ponen la cuenta de la familia en pausa (las acusaciones falsas también cuestan). */
export function pausaPorReportesSinSustento(reportesSinSustento90d: number): boolean {
  return reportesSinSustento90d >= 2
}
