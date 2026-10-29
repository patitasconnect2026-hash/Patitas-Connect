import type { District, Size, Walker } from './types'
import type { CursoResult, QuizResult } from './quiz'
import { CONFIG } from './config'
import { TERMS_VERSION } from './legal'
import { esCelularPeru, normalizarTelefono } from './telefono'
import { casillasMarcadas, COMPROBACIONES, type Comprobacion, type Marcas } from './verificacion'

export type AppStatus = 'borrador' | 'enviada' | 'supervisado' | 'activo' | 'rechazada'

/**
 * Dónde cobra el paseador: el equipo le paga ahí (Yape o Plin) cuando termina el paseo. Lo ve ÉL y el equipo en /admin:
 * NUNCA el dueño (no está en `Walker`, que es lo que ve el dueño). Sin esto no puede recibir solicitudes.
 */
export interface CobroPaseador {
  metodo: 'yape' | 'plin' | ''
  /** Celular de su Yape o Plin (se acepta como lo escribe la gente: «987 654 321»). */
  telefono: string
  /** El nombre como sale en Yape o Plin (para que el equipo compruebe que le paga a la persona correcta). */
  titular: string
}

export const COBRO_VACIO: CobroPaseador = { metodo: '', telefono: '', titular: '' }

export interface ErroresCobro {
  metodo?: string
  telefono?: string
  titular?: string
}

/** Qué falta o está mal en el cobro, en lenguaje simple. `{}` = vale. */
export function erroresCobro(c: CobroPaseador | undefined): ErroresCobro {
  const x = c ?? COBRO_VACIO
  const e: ErroresCobro = {}
  if (x.metodo !== 'yape' && x.metodo !== 'plin') e.metodo = 'Elige Yape o Plin.'
  if (!esCelularPeru(x.telefono)) e.telefono = 'Escribe un celular válido, por ejemplo 987 654 321.'
  if (x.titular.trim().length < 3) e.titular = 'Escribe el nombre como sale en Yape o Plin.'
  return e
}

/** ¿Ya registró dónde cobrar (y es válido)? */
export const cobroRegistrado = (c: CobroPaseador | undefined): boolean => Object.keys(erroresCobro(c)).length === 0

/** El celular en formato con +51 (para que el equipo lo copie). Vacío si no sirve. */
export const celularDeCobro = (c: CobroPaseador | undefined): string => normalizarTelefono(c?.telefono ?? '') ?? ''

export interface WalkerApplication {
  phone: string
  consent: Record<string, boolean>
  consentAt: string
  consentVersion: string
  person: {
    firstName: string
    lastName: string
    dni: string
    birth: string
    district: District
    university: string
    career: string
    cycle: string
  }
  photo?: string
  profile: {
    bio: string
    includes: string[]
    style: string[]
    sizes: Size[]
    days: string[]
    times: string[]
    spots: string[]
    rate: number
    experience: string
    /** «Disponible ahora»: si es false no sale como disponible en la lista de las familias. Sin dato = disponible. */
    disponible?: boolean
  }
  quiz?: QuizResult
  quizAttempts: number
  /** Mini curso (lib/quiz.ts): el resultado del test y cuántos intentos lleva. Solo lo ven el paseador y el equipo. */
  curso?: CursoResult
  cursoAttempts?: number
  /** Dónde cobra (lib/walkerStore.ts `CobroPaseador`). Lo ve él y el equipo; nunca el dueño. */
  cobro: CobroPaseador
  /** Autorización para que el equipo haga las consultas oficiales en vivo, en la videollamada. */
  consults: { consent: boolean }
  /** La hora que eligió para la videollamada. Solo ella y el equipo: nadie más se suma (decisión de la usuaria). */
  videoSlot: string
  status: AppStatus
  /**
   * `comprobaciones`: las cinco que marca el equipo (la 6 se deduce de `supervisedWalks`).
   * `paseosHechos`: todos los paseos que lleva (los acompañados son solo los primeros). Solo lo trae un paseador de
   * ejemplo con historia; si falta, los paseos son los acompañados.
   */
  review: { comprobaciones: Marcas; notes: string; supervisedWalks: number; paseosHechos?: number }
  code: string
  createdAt: string
}

export const EMPTY_APP: WalkerApplication = {
  phone: '',
  consent: {},
  consentAt: '',
  consentVersion: TERMS_VERSION,
  person: { firstName: '', lastName: '', dni: '', birth: '', district: 'San Isidro', university: '', career: '', cycle: '' },
  profile: { bio: '', includes: [], style: [], sizes: ['small', 'medium'], days: [], times: [], spots: [], rate: CONFIG.tarifaSugerida, experience: '' },
  quizAttempts: 0,
  cursoAttempts: 0,
  cobro: COBRO_VACIO,
  consults: { consent: false },
  videoSlot: '',
  status: 'borrador',
  review: { comprobaciones: {}, notes: '', supervisedWalks: 0 },
  code: '',
  createdAt: '',
}

export const INCLUDES = [
  'Agua y bolsas',
  'Fotos durante el paseo',
  'Juego con pelota',
  'Limpieza de patas',
  'Botiquín de primeros auxilios',
  'Refuerzo positivo (premios con permiso)',
  'Reporte detallado al final',
]
export const STYLES = ['Tranquilo', 'Con mucha energía', 'Paciente', 'Puntual', 'Cariñoso', 'Educador', 'Observador', 'Juguetón']
export const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
export const TIMES = ['Mañana (6–12)', 'Tarde (12–18)', 'Noche (18–21)']
export const EXPERIENCE = ['Primera vez', 'Tengo perro', 'He paseado perros', 'Estudio algo con animales']
/** Lo que el equipo consulta EN VIVO en la videollamada (el postulante no sube capturas). Lista provisional. */
export const CONSULT_ITEMS: Array<{ id: string; title: string; url: string }> = [
  { id: 'redam', title: 'REDAM: deudores alimentarios', url: 'https://redam.pj.gob.pe' },
  { id: 'requisitoria', title: 'Requisitorias de la Policía Nacional', url: 'https://www.gob.pe/pnp' },
  { id: 'denuncias', title: 'Seguimiento de denuncias (Ministerio Público)', url: 'https://www.gob.pe/mpfn' },
]

export const VIDEO_SLOTS = ['Lun 7:00 pm', 'Mar 7:00 pm', 'Mié 7:00 pm', 'Jue 7:00 pm', 'Sáb 10:00 am', 'Sáb 11:00 am', 'Dom 6:00 pm']

export function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return 'PAT-' + Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function maskDni(dni: string) {
  return dni ? `••••${dni.slice(-4)}` : '—'
}

export function ageFrom(birth: string) {
  if (!birth) return 0
  const b = new Date(birth)
  if (Number.isNaN(b.getTime())) return 0
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age
}

/**
 * Lo que se leyó del almacenamiento → una postulación con la forma actual (o null).
 * Las postulaciones viejas (casillas «docs», «refs», «videocall») no se interpretan: se parte de cero. Las referencias que
 * llevaban se descartan.
 */
export function migrarPostulacion(crudo: unknown): WalkerApplication | null {
  if (!crudo || typeof crudo !== 'object') return null
  // `refs` (las dos referencias) ya no existen: se quitaron de la postulación (decisión de la usuaria, 15 de octubre de 2026).
  const { refs: _refsViejas, ...guardada } = crudo as WalkerApplication & { refs?: unknown; review?: { comprobaciones?: Marcas; notes?: string; supervisedWalks?: number } }
  void _refsViejas
  const r = guardada.review ?? {}
  return {
    ...EMPTY_APP,
    ...guardada,
    // Las postulaciones anteriores no tienen dónde cobrar: lo registran para recibir solicitudes.
    cobro: { ...COBRO_VACIO, ...(guardada.cobro ?? {}) },
    review: { comprobaciones: r.comprobaciones ?? {}, notes: r.notes ?? '', supervisedWalks: r.supervisedWalks ?? 0 },
  }
}

/** Las cinco casillas que marca el equipo y todavía no están marcadas. (La sexta, «primer paseo», se deduce de los paseos.) */
export function casillasQueFaltan(a: WalkerApplication): Comprobacion[] {
  const marcadas = casillasMarcadas(a.review.comprobaciones, a.review.supervisedWalks)
  return COMPROBACIONES.filter((c) => c.id !== 'primerPaseo' && !marcadas.includes(c.id))
}

/** ¿El equipo marcó las cinco casillas que le tocan? */
export function cincoCasillasMarcadas(a: WalkerApplication): boolean {
  return casillasQueFaltan(a).length === 0
}

/**
 * El estado con el que se MUESTRA una postulación. Una postulación solo figura como aprobada («supervisado» o «activo»)
 * si el equipo marcó las casillas: si falta alguna, se muestra «en revisión» aunque el estado guardado diga otra cosa.
 * Es la única regla: la app del cliente, la del paseador y /admin leen de aquí.
 */
export function estadoVisible(a: WalkerApplication): AppStatus {
  const aprobada = a.status === 'supervisado' || a.status === 'activo'
  return aprobada && !cincoCasillasMarcadas(a) ? 'enviada' : a.status
}

/**
 * Una postulación aprobada, como paseador nuevo en la app del cliente. Null si no está aprobada (con sus casillas) o si
 * todavía no registró dónde cobrar: sin eso no puede recibir solicitudes. Lo que se devuelve es lo que ve el dueño:
 * el cobro del paseador NO va aquí.
 */
export function walkerDesdePostulacion(a: WalkerApplication): Walker | null {
  const estado = estadoVisible(a)
  if (estado !== 'supervisado' && estado !== 'activo') return null
  if (!cobroRegistrado(a.cobro)) return null
  const name = a.person.firstName.trim()
  if (!name) return null
  const windows: Array<[number, number]> = []
  if (a.profile.times.some((t) => t.startsWith('Mañana'))) windows.push([6, 12])
  if (a.profile.times.some((t) => t.startsWith('Tarde'))) windows.push([12, 18])
  if (a.profile.times.some((t) => t.startsWith('Noche'))) windows.push([18, 21])
  return {
    id: 'nuevo-' + a.code,
    name: `${name} ${a.person.lastName.trim().charAt(0).toUpperCase()}.`,
    firstName: name,
    district: a.person.district,
    neighbor: `Estudia o vive en ${a.person.district}`,
    pricePerHour: a.profile.rate,
    rating: 5,
    walks: a.review.supervisedWalks,
    comprobaciones: casillasMarcadas(a.review.comprobaciones, a.review.supervisedWalks),
    maxDogs: 2,
    accepts: a.profile.sizes.length ? a.profile.sizes : ['small', 'medium'],
    windows: windows.length ? windows : [[9, 18]],
    spots: a.profile.spots.length ? a.profile.spots : [a.person.district === 'San Isidro' ? 'olivar' : 'campo-de-marte'],
    tagline: [a.person.career, a.person.cycle].filter(Boolean).join(' · ') || 'Estudiante',
    bio: a.profile.bio || 'Paseador nuevo del barrio.',
    experience: a.profile.experience || 'Nuevo',
    responds: '~5 min',
    extras: [],
    includes: a.profile.includes,
    style: a.profile.style,
    reviews: [],
    portrait: { skin: '#d9a074', hair: '#1c1917', style: 'short', shirt: '#ea580c', bg: ['#fed7aa', '#fdba74'] },
    photo: a.photo,
    dni: a.person.dni,
    code: a.code,
    verifiedAt: (a.consentAt || a.createdAt).slice(0, 10),
    probation: true,
    disponible: a.profile.disponible !== false,
  }
}

/** Postulación "de mentira" para la demo: convierte a un paseador de ejemplo en una cuenta aprobada. */
export function appFromWalker(w: Walker): WalkerApplication {
  const [career = '', cycle = ''] = w.tagline.split('·').map((s) => s.trim())
  return {
    ...EMPTY_APP,
    phone: '987 654 321',
    consent: Object.fromEntries(['edad', 'dni', 'registros', 'reglas', 'independiente', 'cobro', 'incidentes', 'supervision'].map((k) => [k, true])),
    consentAt: `${w.verifiedAt}T10:00:00.000Z`,
    person: {
      firstName: w.firstName,
      lastName: w.name.split(' ').slice(1).join(' ').replace('.', ''),
      dni: w.dni,
      birth: '2002-05-14',
      district: w.district,
      university: 'Universidad del Pacífico (Jesús María)',
      career,
      cycle,
    },
    photo: w.photo,
    profile: {
      bio: w.bio,
      includes: w.includes,
      style: w.style,
      sizes: w.accepts,
      days: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'],
      times: ['Mañana (6–12)', 'Tarde (12–18)'],
      spots: w.spots,
      rate: w.pricePerHour,
      experience: EXPERIENCE[2],
    },
    consults: { consent: true },
    videoSlot: 'Lun 7:00 pm',
    status: 'activo',
    review: {
      comprobaciones: Object.fromEntries((w.comprobaciones ?? []).map((id) => [id, true])),
      notes: '',
      supervisedWalks: Math.min(w.walks, 10),
      paseosHechos: w.walks,
    },
    code: w.code,
    createdAt: `${w.verifiedAt}T10:00:00.000Z`,
  }
}
