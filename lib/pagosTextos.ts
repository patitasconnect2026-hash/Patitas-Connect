/**
 * Los textos del pago al final del paseo, escritos una sola vez (lib/pagos.ts tiene la lógica). Los leen el dueño, el
 * paseador y /admin. Reglas: título hasta 5 palabras, apoyo hasta 12, el detalle detrás de «Ver más».
 * Honestidad: la familia paga al terminar el paseo; el paseador mira el pago; Patitas le paga al paseador DESPUÉS de
 * confirmar el pago en su cuenta, a mano. No hay tarjeta. Ningún texto dice que se paga antes ni que el paseo espera.
 */
import { CONFIG, NOMBRE_CORTO, textoComision } from './config'
import type { EstadoPago } from './pagos'
import { soles } from './utils'

export const TEXTO_PAGO = {
  titulo: 'Paga a Patitas',
  /** Lo primero que se lee en la reserva y durante el paseo. */
  lema: 'Pagas al terminar el paseo.',
  titular: 'Cuenta a nombre de',
  faltaCobro: 'Falta configurar el medio de cobro.',
  faltaTitular: 'Falta configurar el nombre de la cuenta.',
  /** Le habla a la familia (no al equipo): todavía no puede pagar. */
  faltaCobroApoyo: 'Aún no puedes pagar. Avisa al equipo.',
  /** Demostración: nada de lo que se paga aquí es plata real. */
  demoNoEsReal: 'Demostración: no es plata real.',
  reportar: 'Reportar problema',
  masAbrir: 'Cómo funciona el pago',
  /** Recordatorio suave cuando pasó el plazo (`horasParaPagar`). */
  plazo: `Pasó el plazo de ${CONFIG.horasParaPagar} horas. Paga cuando puedas.`,
  /** Mientras haya un pago pendiente no se puede reservar otro paseo. */
  sinReservar: 'No puedes reservar otro paseo hasta pagar este.',
} as const

/** «Paga a Patitas y muéstrale el pago a Carlos.» */
export function textoPagaYMuestra(paseador: string): string {
  return `Paga a ${NOMBRE_CORTO} y muéstrale el pago a ${paseador}.`
}

/** «Simular que Carlos vio el pago · demostración» (solo con la cuenta de demostración o el paseador de ejemplo). */
export function textoSimularVisto(paseador: string): string {
  return `Simular que ${paseador} vio el pago · demostración`
}

/** Lo que dice la pantalla del PASEADOR cuando cobra el paseo (components/walker/CobroDelPaseo.tsx). */
export const TEXTO_COBRO = {
  titulo: 'Cobro del paseo',
  monto: 'Monto',
  debeAparecer: 'Debe aparecer a nombre de',
  comparar: 'Compara el monto y el nombre antes de tocar.',
  faltaTitular: 'Falta configurar el nombre de la cuenta de Patitas. Avisa al equipo.',
  viElPago: 'Vi el pago',
  hora: 'Hora del pago (opcional)',
  listo: 'Listo. Ya puedes irte.',
  noMuestran: 'No me muestran el pago',
  simulado: 'Demostración: no es plata real.',
} as const

/** «Ver más» del dueño: el camino completo del pago. */
export function masPagoDueno(): string {
  return `Pagas al terminar el paseo, no antes. Cuando tocas «Recibí a tu perro» te mostramos a dónde pagar (Yape, Plin o transferencia) y el nombre de la cuenta de ${NOMBRE_CORTO}. Le muestras el pago al paseador y él toca «Vi el pago». Después ${NOMBRE_CORTO} le paga al paseador, pero solo cuando confirma el pago en su cuenta. ${textoComisionDueno() || textoComision()} Todo lo hace el equipo a mano: la app no mueve dinero. Mientras tengas un pago pendiente no puedes reservar otro paseo. Si algo no cuadra, usa «Reportar problema».`
}

/** «Ver más» del paseador. */
export function masPagoPaseador(): string {
  return `El paseo no espera ningún pago. Al entregar al perro, la familia paga a ${NOMBRE_CORTO} y te muestra el pago: compara el monto y el nombre de la cuenta, y toca «Vi el pago». Después ${NOMBRE_CORTO} confirma el pago en su cuenta y recién ahí te paga al Yape o Plin que registraste, descontando su comisión. ${textoComision()} Solo tú y el equipo ven tu número: el dueño nunca lo ve. Si algo no cuadra, usa «Reportar problema».`
}

export interface TextoPago {
  titulo: string
  apoyo: string
}

/**
 * Lo que dice el estado del pago para la FAMILIA. `hecho`: el paseo ya terminó (ahí toca pagar). `noOcurrio`: el paseo
 * no se hizo (rechazado, vencido o cancelado): no hay nada que pagar.
 */
export function textoPagoDueno(estado: EstadoPago | 'sin_registro', paseador: string, hecho = false, noOcurrio = false): TextoPago {
  if (noOcurrio) return { titulo: 'No hace falta pagar', apoyo: 'El paseo no se hizo.' }
  switch (estado) {
    case 'sin_registro':
    case 'sin_pagar':
      return hecho
        ? { titulo: TEXTO_PAGO.titulo, apoyo: textoPagaYMuestra(paseador) }
        : { titulo: TEXTO_PAGO.lema, apoyo: 'Cuando termine, aquí te decimos cómo.' }
    case 'visto':
      return { titulo: `${paseador} vio tu pago`, apoyo: `${NOMBRE_CORTO} le paga después de confirmarlo en su cuenta.` }
    case 'no_encontrado':
      return { titulo: 'No encontramos tu pago', apoyo: 'Revisa el monto. Si ya pagaste, repórtalo.' }
    case 'pagado_paseador':
      return { titulo: 'Paseador pagado', apoyo: `${NOMBRE_CORTO} ya le pagó a ${paseador}.` }
  }
}

/** Lo que dice el estado del pago para el PASEADOR. `neto` = lo que recibe. */
export function textoPagoPaseador(estado: EstadoPago | 'sin_registro', neto: number, paseoHecho: boolean): TextoPago {
  switch (estado) {
    case 'sin_registro':
    case 'sin_pagar':
      return paseoHecho
        ? { titulo: TEXTO_COBRO.titulo, apoyo: 'Pídele a la familia que te muestre el pago.' }
        : { titulo: 'El pago es al terminar', apoyo: 'La familia paga al final. No esperes nada para salir.' }
    case 'visto':
      return { titulo: 'Viste el pago', apoyo: `${NOMBRE_CORTO} te paga ${soles(neto)} después de confirmarlo en su cuenta.` }
    case 'no_encontrado':
      return { titulo: 'El equipo no lo encontró', apoyo: 'El equipo lo revisa. Si pasa algo, usa «Reportar problema».' }
    case 'pagado_paseador':
      return { titulo: 'Te pagaron', apoyo: `${NOMBRE_CORTO} te pagó ${soles(neto)}.` }
  }
}

/** «Recibes S/ 20» (lo que el paseador cobra de este paseo). */
export function textoRecibes(neto: number): string {
  return `Recibes ${soles(neto)}`
}

/** «S/ 25 − comisión S/ 5 = S/ 20»: el desglose que ve el paseador y el equipo. */
export function textoDesglose(d: { monto: number; comision: number; neto: number }): string {
  return `Paga la familia ${soles(d.monto)} · ${NOMBRE_CORTO} se queda ${soles(d.comision)} · el paseador recibe ${soles(d.neto)}`
}

/** El texto de qué porcentaje es la comisión (lee CONFIG; nunca se escribe a mano). */
export function textoPorcentajeComision(): string {
  return String(CONFIG.comision).replace('.', ',') + ' %'
}

/**
 * Qué es la comisión, dicho para la FAMILIA (para que no la lea como un cobro extra). Sale de CONFIG.
 * Por defecto la familia paga el precio y la comisión sale de lo que recibe el paseador.
 */
export function textoComisionDueno(): string {
  if (CONFIG.comision <= 0) return ''
  const pct = String(CONFIG.comision).replace('.', ',')
  return CONFIG.comisionModo === 'sobre_el_precio'
    ? `Incluye la comisión de ${NOMBRE_CORTO} (${pct} %).`
    : `Pagas el precio del paseo. La comisión de ${NOMBRE_CORTO} (${pct} %) sale de lo que recibe el paseador.`
}
