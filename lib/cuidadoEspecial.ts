/**
 * Perros frágiles y quién paga la veterinaria (pedido de Yahrod, 30 de octubre de 2026).
 *
 * Problema: un golden se enferma durante el paseo y la consulta cuesta cientos de soles. Si nadie sabe de antemano quién
 * responde, todo cae sobre Patitas. Aquí se deja escrito, ANTES del paseo:
 *  1. Qué perros necesitan cuidado especial y con qué reglas se pasean.
 *  2. Quién paga en cada caso (familia, paseador o el fondo de cuidado de Patitas, con tope).
 *  3. Hasta cuánto autoriza la familia a gastar en una emergencia si no contesta.
 *
 * El fondo de cuidado NO es una póliza: es dinero que Patitas aparta de su comisión, con tope por caso. Cuando haya
 * empresa conviene contratar una póliza de responsabilidad civil (docs/LEGAL-RESPONSABILIDAD.md). BORRADOR sin revisión legal.
 */
import { CONFIG, type Config } from './config'
import type { NivelId } from './planes'

export type Condicion = 'senior' | 'braquicefalo' | 'cardiaco' | 'respiratorio' | 'postoperatorio' | 'cachorro' | 'reactivo' | 'alto_valor'

export const CONDICIONES: Array<{ id: Condicion; nombre: string; ayuda: string }> = [
  { id: 'senior', nombre: 'Mayor', ayuda: '8 años o más' },
  { id: 'braquicefalo', nombre: 'Hocico chato', ayuda: 'Pug, bulldog, shih tzu…' },
  { id: 'cardiaco', nombre: 'Corazón', ayuda: 'Soplo o enfermedad cardíaca' },
  { id: 'respiratorio', nombre: 'Respira con dificultad', ayuda: 'Tos, colapso de tráquea…' },
  { id: 'postoperatorio', nombre: 'Recién operado', ayuda: 'Menos de 30 días' },
  { id: 'cachorro', nombre: 'Cachorro', ayuda: 'Menos de 6 meses' },
  { id: 'reactivo', nombre: 'Reactivo', ayuda: 'Ladra o se lanza a otros' },
  { id: 'alto_valor', nombre: 'Alto valor', ayuda: 'Raza o precio alto' },
]

const BRAQUICEFALOS = /pug|bulldog|shih ?tzu|boxer|boston|carlino|pekin|b[oó]xer|lhasa/i

/** Condiciones que se deducen solas de la ficha (raza y edad). La familia puede sumar otras. */
export function condicionesDeducidas(perro: { breed: string; ageYears: number }): Condicion[] {
  const salida: Condicion[] = []
  if (perro.ageYears >= 8) salida.push('senior')
  if (perro.ageYears < 0.5) salida.push('cachorro')
  if (BRAQUICEFALOS.test(perro.breed)) salida.push('braquicefalo')
  return salida
}

export interface ReglasCuidado {
  especial: boolean
  soloIndividual: boolean
  maxMinutos: number
  /** Horas del día que se evitan (de 11 a 16) cuando hace calor. */
  evitarMediodia: boolean
  nivelMinimo: NivelId
  notas: string[]
}

/** Las reglas del paseo según las condiciones del perro. Sin condiciones: el paseo de siempre. */
export function reglasCuidado(condiciones: Condicion[]): ReglasCuidado {
  const set = new Set(condiciones)
  const notas: string[] = []
  let maxMinutos = 90
  let soloIndividual = false
  let evitarMediodia = false
  let nivelMinimo: NivelId = 'nuevo'
  if (set.has('braquicefalo') || set.has('respiratorio') || set.has('cardiaco')) {
    maxMinutos = Math.min(maxMinutos, 30)
    evitarMediodia = true
    nivelMinimo = 'pro'
    notas.push('Paseo corto, a la sombra y con agua. Parar ante cualquier jadeo fuerte.')
  }
  if (set.has('senior')) {
    maxMinutos = Math.min(maxMinutos, 60)
    evitarMediodia = true
    notas.push('Ritmo suave y descansos.')
  }
  if (set.has('postoperatorio')) {
    maxMinutos = Math.min(maxMinutos, 30)
    soloIndividual = true
    nivelMinimo = 'pro'
    notas.push('Sin saltos ni juegos con otros perros. Sigue la indicación de su veterinario.')
  }
  if (set.has('cachorro')) {
    maxMinutos = Math.min(maxMinutos, 30)
    soloIndividual = true
    notas.push('Sin contacto con otros perros hasta completar sus vacunas.')
  }
  if (set.has('reactivo')) {
    soloIndividual = true
    nivelMinimo = 'pro'
    notas.push('Paseo individual, lejos de otros perros.')
  }
  if (set.has('alto_valor')) {
    nivelMinimo = 'pro'
    notas.push('Recojo con foto en la puerta y la app abierta todo el paseo.')
  }
  return { especial: set.size > 0, soloIndividual, maxMinutos, evitarMediodia, nivelMinimo, notas }
}

const ORDEN_NIVEL: NivelId[] = ['nuevo', 'pro', 'elite']

/** ¿Este paseador puede llevar a este perro? */
export function puedePasear(nivelPaseador: NivelId, reglas: ReglasCuidado): boolean {
  return ORDEN_NIVEL.indexOf(nivelPaseador) >= ORDEN_NIVEL.indexOf(reglas.nivelMinimo)
}

/* ------------------------------------------------------------------ */
/* Quién paga la veterinaria                                            */
/* ------------------------------------------------------------------ */

export type CausaIncidente =
  /** Enfermedad o condición que el perro ya tenía (declarada o no). */
  | 'condicion_previa'
  /** El paseador incumplió una regla: soltó la correa, mezcló tamaños, lo dejó solo, más perros de los permitidos. */
  | 'falta_del_paseador'
  /** La familia ocultó algo de la ficha (agresividad, enfermedad) y eso causó el problema. */
  | 'ficha_falsa'
  /** Accidente sin culpa de nadie: otro perro lo ataca, se lastima jugando. */
  | 'accidente'

export interface Reparto {
  paga: 'familia' | 'paseador' | 'fondo_y_familia' | 'familia_y_paseador'
  /** Lo que cubre el fondo de cuidado (soles). */
  fondo: number
  /** Lo que queda para la familia (soles). */
  familia: number
  /** Lo que se le pide al paseador (soles). */
  paseador: number
  texto: string
}

/**
 * Quién paga una cuenta veterinaria de `monto` soles, según la causa que confirme el equipo con las pruebas (fotos,
 * puntos de control, chat y la boleta). Reportado fuera de plazo, el fondo no cubre.
 */
export function quienPaga(p: { causa: CausaIncidente; monto: number; reportadoATiempo: boolean }, c: Config = CONFIG): Reparto {
  const monto = Math.max(0, Math.round(p.monto * 100) / 100)
  switch (p.causa) {
    case 'condicion_previa':
    case 'ficha_falsa':
      return { paga: 'familia', fondo: 0, familia: monto, paseador: 0, texto: 'Lo paga la familia: es una condición del perro o algo que no se dijo en la ficha.' }
    case 'falta_del_paseador':
      return { paga: 'paseador', fondo: 0, familia: 0, paseador: monto, texto: 'Lo paga el paseador: incumplió una regla del paseo. Puede hacerlo en partes.' }
    case 'accidente': {
      const fondo = p.reportadoATiempo ? Math.min(monto, c.fondoCuidado.topePorCaso) : 0
      return {
        paga: 'fondo_y_familia',
        fondo,
        familia: Math.round((monto - fondo) * 100) / 100,
        paseador: 0,
        texto: p.reportadoATiempo ? 'Accidente sin culpa: el fondo de cuidado ayuda hasta su tope y la familia paga el resto.' : 'Se reportó fuera de plazo: el fondo no cubre.',
      }
    }
  }
}

/**
 * La autorización de la familia para una emergencia: si no contesta, el paseador puede llevar al perro a la veterinaria y
 * gastar hasta `tope` soles. Sin tope (0), solo se lleva si la familia contesta o es grave.
 */
export function textoAutorizacion(tope: number, vet: string): string {
  const donde = vet.trim() ? `a ${vet.trim()} o a la veterinaria más cercana` : 'a la veterinaria más cercana'
  if (tope <= 0) return `En una emergencia el paseador te llama primero. Si es grave, lo lleva ${donde}.`
  return `Si no contestas en una emergencia, el paseador puede llevarlo ${donde} y autorizas gastar hasta ${new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(tope)}.`
}
