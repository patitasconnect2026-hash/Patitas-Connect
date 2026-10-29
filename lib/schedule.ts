import type { Dog, Size, Walker } from './types'

/** Hora simulada de "ahora" en la demo (9:00 am), para que los horarios siempre se vean coherentes. */
export const NOW_HOUR = 9

/** Horarios amplios: de 6:00 am a 9:00 pm (último inicio). */
export const HOURS = Array.from({ length: 16 }, (_, i) => 6 + i)
export const DAYS_AHEAD = 7

export const SIZE_INFO: Record<Size, { label: string; range: string; plural: string }> = {
  small: { label: 'Pequeño', range: 'hasta 10 kg', plural: 'pequeños' },
  medium: { label: 'Mediano', range: '10 a 25 kg', plural: 'medianos' },
  large: { label: 'Grande', range: 'más de 25 kg', plural: 'grandes' },
}

export function hourLabel(h: number) {
  if (h === 12) return '12:00 m'
  const suffix = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:00 ${suffix}`
}

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function dayInfo(dayIdx: number) {
  const d = new Date()
  d.setDate(d.getDate() + dayIdx)
  const short = dayIdx === 0 ? 'Hoy' : dayIdx === 1 ? 'Mañana' : WEEKDAYS[d.getDay()]
  return { short, date: d.getDate(), weekday: d.getDay(), label: dayIdx <= 1 ? short : `${WEEKDAYS[d.getDay()]} ${d.getDate()}` }
}

/** Hash determinista: la disponibilidad simulada es estable entre renders. */
function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export type SlotState =
  | 'free' // nadie reservó: se arma un grupo nuevo
  | 'join' // hay un grupo del mismo tamaño con cupo
  | 'full' // grupo completo
  | 'size' // hay un grupo de otro tamaño
  | 'solo' // tu perro va solo y ya hay perros en ese horario
  | 'off' // el paseador no trabaja a esa hora
  | 'past' // ya pasó
  | 'noaccept' // no pasea perros de ese tamaño

export interface SlotInfo {
  state: SlotState
  dogs: number
  size: Size
}

const PEAK = new Set([7, 8, 12, 13, 18, 19])

export function slotInfo(w: Walker, dayIdx: number, hour: number, dog: Dog | null): SlotInfo {
  const inWindow = w.windows.some(([a, b]) => hour >= a && hour < b)
  const h = hash(`${w.id}|${dayIdx}|${hour}`)
  const r = h % 100
  const fullCut = PEAK.has(hour) ? 62 : 80
  let dogs = 0
  if (r >= fullCut) dogs = w.maxDogs
  else if (r >= 34) dogs = 1 + ((h >>> 8) % (w.maxDogs - 1))
  // Un paseador que viene de la base no tiene la ocupación inventada de la demostración: sus horarios declarados se
  // muestran libres (él acepta o rechaza cada solicitud). La agenda real todavía no existe en la base.
  if (w.deServidor) dogs = 0
  const size = w.accepts[(h >>> 4) % w.accepts.length]
  const base = { dogs, size }

  if (!inWindow) return { ...base, state: 'off' }
  if (dayIdx === 0 && hour <= NOW_HOUR) return { ...base, state: 'past' }
  if (dog && !w.accepts.includes(dog.size)) return { ...base, state: 'noaccept' }
  if (dogs >= w.maxDogs) return { ...base, state: 'full' }
  if (dogs === 0) return { ...base, state: 'free' }
  if (dog && !dog.sociable) return { ...base, state: 'solo' }
  if (dog && dog.size !== size) return { ...base, state: 'size' }
  return { ...base, state: 'join' }
}

export function isBookable(s: SlotState) {
  return s === 'free' || s === 'join'
}

/** Primer horario libre o con cupo compatible para el perro. */
export function nextSlot(w: Walker, dog: Dog | null) {
  for (let d = 0; d < DAYS_AHEAD; d++) {
    for (const hour of HOURS) {
      const info = slotInfo(w, d, hour, dog)
      if (isBookable(info.state)) return { dayIdx: d, hour, info }
    }
  }
  return null
}

/** Cuántos horarios compatibles tiene hoy. */
export function openToday(w: Walker, dog: Dog | null) {
  return HOURS.filter((h) => isBookable(slotInfo(w, 0, h, dog).state)).length
}

export function walkerFits(w: Walker, dog: Dog | null) {
  if (!dog) return true
  if (dog.rpp) return false
  return w.accepts.includes(dog.size)
}
