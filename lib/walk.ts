import { GROUP_NAMES } from './data'
import { SIZE_INFO } from './schedule'
import type { Booking, ChatMessage, EventKind, TimelineEntry, Walk } from './types'

/** Una "vuelta" de reloj de la simulación (el paseo completo dura ~90 s en la demo). */
export const TICK_MS = 1400
export const TICKS = 64
export const STEP = 1 / TICKS

export function fmtClock(totalMin: number) {
  const t = Math.round(totalMin)
  const h24 = Math.floor(t / 60) % 24
  const m = t % 60
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${String(m).padStart(2, '0')} ${h24 >= 12 ? 'pm' : 'am'}`
}

export function clockAt(b: Booking, at: number) {
  return fmtClock(b.startMin + at * b.durationMin)
}

export function newWalk(booking: Booking): Walk {
  return {
    booking,
    progress: 0,
    phase: 'active',
    sos: 'off',
    typing: false,
    rating: 0,
    extraMessages: [],
    extraEvents: [],
  }
}

/** Nombres de los perros del grupo (el tuyo + los que ya estaban). */
export function groupNames(b: Booking) {
  return [b.dog.name, ...GROUP_NAMES[b.groupSize].slice(0, b.groupDogs)]
}

interface ScriptEvent {
  f: number
  kind: EventKind
  text: string
}

/** Guion del paseo. `f` es la fracción del paseo (0–1) en que ocurre cada evento. */
function eventScript(b: Booking): ScriptEvent[] {
  const d = b.dog.name
  const w = b.walker.firstName
  const names = groupNames(b)
  const group =
    names.length === 1
      ? `${d} va solo en su paseo individual`
      : `grupo de ${names.length} perros ${SIZE_INFO[b.groupSize].plural}: ${names.join(', ')}`
  const pickup = b.handoff === 'doorman' ? 'con portería' : 'en la puerta'
  return [
    { f: 0, kind: 'start', text: `${w} recogió a ${d} ${pickup}. Código de recojo correcto · ${group}` },
    { f: 0.05, kind: 'route', text: 'Salieron por Calle Lizardo Alzamora rumbo al Bosque El Olivar 📍' },
    { f: 0.14, kind: 'cross', text: 'Cruzando Av. Víctor Andrés Belaúnde con correa corta 🚦' },
    { f: 0.25, kind: 'pee', text: `${d} hizo pipí 💦` },
    { f: 0.5, kind: 'water', text: 'Pausa para tomar agua en el Bosque El Olivar 💧' },
    { f: 0.63, kind: 'photo', text: `${d} jugando con su pelota 🎾` },
    { f: 0.76, kind: 'poop', text: `${w} recogió todo y dejó el parque impecable ✅` },
    { f: 0.88, kind: 'return', text: 'Iniciando el regreso por el bosque 🏠' },
    { f: 1, kind: 'arrived', text: `Llegamos a casa. ${d} está sano y salvo ✅` },
  ]
}

interface ScriptMessage {
  f: number
  text?: string
}

function chatScript(b: Booking, owner: string): ScriptMessage[] {
  const d = b.dog.name
  return [
    { f: 0, text: `¡Hola ${owner}! Ya recogí a ${d}, está listo para su paseo 🐶` },
    { f: 0.5, text: 'Pausa para tomar agua en el Bosque El Olivar 💧' },
    { f: 0.63, text: `¡Qué sonrisa! ${d} jugando con su pelota 🎾` },
    { f: 0.88, text: 'Ya vamos de regreso, llegamos en unos minutos 🏠' },
    { f: 1, text: `Llegamos a casa. ${d} está sano y salvo 🏡 Cuando quieras, confirma la llegada.` },
  ]
}

const EPS = 1e-9

/**
 * Eventos ya ocurridos, del más nuevo al más antiguo.
 * `conGuion = false`: el paseo todavía no empezó (solicitud, aceptado o en camino): no hay nada que contar.
 */
export function visibleTimeline(walk: Walk, conGuion = true): TimelineEntry[] {
  const { booking: b, progress } = walk
  const scripted: TimelineEntry[] = walk.live || !conGuion
    ? []
    : eventScript(b)
    .filter((e) => e.f <= progress + EPS)
    .map((e, i) => ({ id: `s${i}`, at: e.f, time: clockAt(b, e.f), kind: e.kind, text: e.text }))
  return [...scripted, ...walk.extraEvents].sort((a, c) => a.at - c.at).reverse()
}

/** Mensajes del chat, del más antiguo al más nuevo. `conGuion = false`: sin los mensajes de ejemplo del paseador. */
export function visibleChat(walk: Walk, owner: string, conGuion = true): ChatMessage[] {
  const { booking: b, progress } = walk
  const scripted: ChatMessage[] = walk.live || !conGuion
    ? []
    : chatScript(b, owner)
    .filter((m) => m.f <= progress + EPS)
    .map((m, i) => ({ id: `c${i}`, from: 'walker', at: m.f, time: clockAt(b, m.f), text: m.text }))
  return [...scripted, ...walk.extraMessages].sort((a, c) => a.at - c.at)
}

export function autoReply(text: string, b: Booking, owner: string) {
  const t = text.toLowerCase()
  if (t.includes('gracias')) return `¡A ti, ${owner}! Es un placer cuidar a ${b.dog.name} 🧡`
  if (t.includes('agua')) return `${b.dog.name} ya tomó agua hace un momento, tranquila 💧`
  if (t.includes('foto')) return '¡Claro! Te mando otra apenas se detenga un segundo 📸'
  if (t.includes('?') || t.includes('bien') || t.includes('cómo') || t.includes('como'))
    return `Todo en orden 🙌 ${b.dog.name} va tranquilo y con muy buena energía.`
  return `¡Anotado, ${owner}! 🐾`
}
