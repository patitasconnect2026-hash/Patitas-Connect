/**
 * Servicios, academia del paseador y veterinarias aliadas (pedido de Yahrod, 30 de octubre de 2026, con ideas de Gudog,
 * Wakypet, DIMU y Mimo).
 *
 * Solo «activo» se puede pedir hoy. Lo demás se muestra como «Pronto» y no se cobra. No hay ninguna veterinaria aliada
 * todavía: la lista está vacía a propósito y la web invita a sumarse (no se inventan nombres).
 */

export type EstadoServicio = 'activo' | 'pronto'

export interface Servicio {
  id: string
  nombre: string
  detalle: string
  estado: EstadoServicio
}

export const SERVICIOS: Servicio[] = [
  { id: 'paseo', nombre: 'Paseo', detalle: '30, 60 o 90 minutos, en grupo del mismo tamaño o solo.', estado: 'activo' },
  { id: 'cuidado', nombre: 'Paseo de cuidado especial', detalle: 'Perros mayores, operados o de hocico chato, con paseador Pro.', estado: 'activo' },
  { id: 'entrenamiento', nombre: 'Entrenamiento en el paseo', detalle: 'Correa suelta, llamada y calma, en paquetes de 4 sesiones.', estado: 'pronto' },
  { id: 'visita', nombre: 'Visita a casa', detalle: 'Comida, agua y compañía cuando viajas.', estado: 'pronto' },
  { id: 'veterinaria', nombre: 'Veterinaria aliada', detalle: 'Atención con descuento para familias de la comunidad.', estado: 'pronto' },
]

export interface Curso {
  id: string
  nombre: string
  minutos: number
  /** Necesario para pasear perros de cuidado especial. */
  paraCuidadoEspecial: boolean
}

/** La academia: cursos cortos que suben de nivel al paseador (lib/planes.ts: `minCursos`). Contenido por revisar. */
export const ACADEMIA: Curso[] = [
  { id: 'primeros-auxilios', nombre: 'Primeros auxilios caninos', minutos: 20, paraCuidadoEspecial: true },
  { id: 'lenguaje', nombre: 'Leer el lenguaje del perro', minutos: 15, paraCuidadoEspecial: false },
  { id: 'reactivos', nombre: 'Perros reactivos y peleas', minutos: 15, paraCuidadoEspecial: true },
  { id: 'fragiles', nombre: 'Perros mayores y de hocico chato', minutos: 15, paraCuidadoEspecial: true },
  { id: 'antirrobo', nombre: 'Recojo, entrega y prevención de robos', minutos: 10, paraCuidadoEspecial: false },
  { id: 'atencion', nombre: 'Trato con las familias', minutos: 10, paraCuidadoEspecial: false },
  { id: 'entrenamiento', nombre: 'Bases de entrenamiento', minutos: 25, paraCuidadoEspecial: false },
]

/** Veterinarias aliadas: vacío hasta que el equipo firme con alguna. */
export const VETERINARIAS_ALIADAS: Array<{ nombre: string; distrito: string; beneficio: string }> = []

/** Lo que gana una veterinaria aliada (para la invitación). */
export const BENEFICIOS_ALIADO = [
  'Familias con perro de tu distrito te conocen en la web.',
  'Te llamamos primero cuando un perro necesita atención en un paseo.',
  'Tu nombre en la ficha de cuidado especial.',
] as const
