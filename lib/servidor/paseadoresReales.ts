/**
 * Los paseadores que vienen de la base (paso 6a). Funciones PURAS.
 *
 *   - La familia los lee de la vista `paseadores_publicos`: solo aprobados (las cinco casillas del equipo y su cobro
 *     registrado), con los últimos dígitos del DNI y sin la palabra «verificado»: lo único que se afirma es la lista de
 *     casillas marcadas (lib/verificacion.ts).
 *   - El paseador, con su propia sesión, se ve a sí mismo en esa misma vista cuando está aprobado: de ahí sale que
 *     su app muestre «Hoy» y reciba solicitudes, aunque su postulación todavía no esté en el servidor.
 *
 * Lo que la base no sabe no se inventa: la calificación sale de las reseñas de verdad (sin ninguna, no hay calificación), y no hay
 * tiempo de respuesta ni ocupación de horarios.
 */
import { CONFIG } from '../config'
import { casillasMarcadas, type ComprobacionId, type Marcas } from '../verificacion'
import { EMPTY_APP, type CobroPaseador, type WalkerApplication } from '../walkerStore'
import type { District, Portrait, Size, Walker } from '../types'
import { resenasDeFilas } from './resenasMapeo'
import { esUuid } from './paseosMapeo'
import type { FilaCruda } from './paseosTipos'

const esObjeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const texto = (v: unknown): string => (typeof v === 'string' ? v : '')
const lista = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : [])
const numero = (v: unknown): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  return Number.isFinite(n) ? n : NaN
}

const TAMANOS: readonly Size[] = ['small', 'medium', 'large']
const DISTRITOS: readonly District[] = ['San Isidro', 'Jesús María']
const CASILLAS_DEL_EQUIPO: readonly ComprobacionId[] = ['dni', 'distrito', 'celular', 'consultas', 'examen']

/** El mismo retrato sencillo que usa la app para un paseador nuevo sin foto (la foto va en el paso 8). */
const RETRATO: Portrait = { skin: '#d9a074', hair: '#1c1917', style: 'short', shirt: '#ea580c', bg: ['#fed7aa', '#fdba74'] }

/** Ventanas de horario [inicio, fin) que corresponden a las franjas que eligió el paseador. */
function ventanas(franjas: string[]): Array<[number, number]> {
  const v: Array<[number, number]> = []
  if (franjas.some((t) => t.startsWith('Mañana'))) v.push([6, 12])
  if (franjas.some((t) => t.startsWith('Tarde'))) v.push([12, 18])
  if (franjas.some((t) => t.startsWith('Noche'))) v.push([18, 21])
  return v
}

/**
 * Lo que el paseador contó de sí mismo (`postulaciones.perfil`, jsonb). Acepta los nombres que usa la app
 * (`rate`, `sizes`, `times`, `spots`, `includes`, `style`, `experience`, `bio`) y los que escribe el comentario del SQL
 * (`tarifa`, `tamaños`, `horarios`, `parques`, `incluye`, `estilo`, `experiencia`).
 */
export interface PerfilLeido {
  tarifa: number
  tamanos: Size[]
  franjas: string[]
  parques: string[]
  incluye: string[]
  estilo: string[]
  experiencia: string
  bio: string
  dias: string[]
  disponible: boolean
}

export function perfilDe(crudo: unknown): PerfilLeido {
  const p = esObjeto(crudo) ? crudo : {}
  const pick = (...claves: string[]): unknown => claves.map((k) => p[k]).find((v) => v !== undefined && v !== null)
  const tamanos = lista(pick('sizes', 'tamanos', 'tamaños')).filter((t): t is Size => (TAMANOS as readonly string[]).includes(t))
  return {
    tarifa: numero(pick('rate', 'tarifa')),
    tamanos,
    franjas: lista(pick('times', 'horarios')),
    parques: lista(pick('spots', 'parques')),
    incluye: lista(pick('includes', 'incluye')),
    estilo: lista(pick('style', 'estilo')),
    experiencia: texto(pick('experience', 'experiencia')),
    bio: texto(pick('bio')),
    dias: lista(pick('days', 'dias', 'días')),
    disponible: pick('disponible') !== false,
  }
}

/** Las casillas que trae la vista (las cinco del equipo); cualquier otra cosa se ignora. */
function marcasDeVista(v: unknown): Marcas {
  const marcas: Marcas = {}
  for (const id of lista(v)) if ((CASILLAS_DEL_EQUIPO as readonly string[]).includes(id)) marcas[id as ComprobacionId] = true
  return marcas
}

/**
 * Un paseador de la vista pública como lo ve la familia. null si no se puede mostrar sin inventar algo: sin nombre o
 * sin una tarifa dentro del rango del equipo (el precio del paseo sale de ahí).
 */
export function walkerDeVista(f: FilaCruda): Walker | null {
  const id = texto(f.paseador_id)
  const nombre = texto(f.nombre_pila).trim()
  if (!esUuid(id) || !nombre) return null
  const perfil = perfilDe(f.perfil)
  if (!(perfil.tarifa >= CONFIG.tarifaMinima && perfil.tarifa <= CONFIG.tarifaMaxima)) return null
  const distrito = DISTRITOS.find((d) => d === f.distrito) ?? 'San Isidro'
  const franjas = ventanas(perfil.franjas)
  const inicial = texto(f.apellido_inicial).trim().charAt(0).toUpperCase()
  const paseosAcompanados = Math.max(0, numero(f.paseos_acompanados) || 0)
  const resenasN = Math.max(0, Math.round(numero(f.resenas_n) || 0))
  const calificacion = numero(f.calificacion)
  const paseosHechos = Math.max(0, Math.round(numero(f.paseos_hechos) || 0))
  const carrera = [texto(f.carrera), texto(f.ciclo)].map((t) => t.trim()).filter(Boolean).join(' · ')
  return {
    id,
    name: inicial ? `${nombre} ${inicial}.` : nombre,
    firstName: nombre,
    district: distrito,
    neighbor: `Estudia o vive en ${distrito}`,
    pricePerHour: perfil.tarifa,
    // La calificación es el promedio de sus reseñas (una decimal) y solo existe si ya tiene alguna; los paseos son los que
    // terminó de verdad. Sin reseñas la tarjeta dice «Aún sin reseñas».
    rating: resenasN > 0 && Number.isFinite(calificacion) ? calificacion : 0,
    walks: paseosHechos,
    resenasN,
    maxDogs: 2,
    accepts: perfil.tamanos.length > 0 ? perfil.tamanos : ['small', 'medium'],
    windows: franjas.length > 0 ? franjas : [[9, 18]],
    spots: perfil.parques.length > 0 ? perfil.parques : [distrito === 'San Isidro' ? 'olivar' : 'campo-de-marte'],
    tagline: carrera || 'Estudiante',
    bio: perfil.bio || 'Paseador nuevo del barrio.',
    experience: perfil.experiencia,
    responds: '',
    extras: [],
    includes: perfil.incluye,
    style: perfil.estilo,
    reviews: [],
    portrait: RETRATO,
    dni: texto(f.dni_ultimos3),
    code: texto(f.codigo),
    verifiedAt: '',
    probation: true,
    comprobaciones: casillasMarcadas(marcasDeVista(f.comprobaciones), paseosAcompanados),
    disponible: perfil.disponible,
    deServidor: true,
  }
}

/** La lista que ve la familia: todos los que se pueden mostrar, en el orden en que llegaron. */
export function paseadoresDeVista(filas: readonly FilaCruda[]): Walker[] {
  return filas.map(walkerDeVista).filter((w): w is Walker => w !== null)
}

/**
 * Les suma a los paseadores las reseñas que escribieron OTRAS familias (la de esta persona va aparte, en «Tu reseña»). Las más
 * nuevas primero. Si la base no entregó reseñas (sin internet), los paseadores quedan como estaban.
 */
export function conResenas(paseadores: readonly Walker[], filas: readonly FilaCruda[], miId: string | null, ahora: number): Walker[] {
  const reseñas = resenasDeFilas(filas, miId, ahora).filter((r) => !r.mine)
  return paseadores.map((w) => ({ ...w, reviews: reseñas.filter((r) => r.walkerId === w.id) }))
}

/** Dónde cobra el paseador, como lo guarda la base (`cobros_paseador`). null si no hay una fila válida. */
export function cobroDeFila(f: FilaCruda | null | undefined): CobroPaseador | null {
  if (!f) return null
  const metodo = f.metodo === 'yape' || f.metodo === 'plin' ? f.metodo : ''
  const telefono = texto(f.celular)
  const titular = texto(f.titular)
  return metodo && telefono && titular ? { metodo, telefono, titular } : null
}

/**
 * La app del paseador cuando el servidor dice que está aprobado. Lo que ya escribió en este teléfono (perfil, foto,
 * celular) se respeta; del servidor salen la aprobación, sus casillas, su código y dónde cobra.
 */
export function appAprobadaPorServidor(local: WalkerApplication | null, vista: FilaCruda, cobro: FilaCruda | null): WalkerApplication {
  const base: WalkerApplication = local ?? { ...EMPTY_APP, createdAt: new Date().toISOString() }
  const perfil = perfilDe(vista.perfil)
  const distrito = DISTRITOS.find((d) => d === vista.distrito) ?? base.person.district
  const marcas = marcasDeVista(vista.comprobaciones)
  const sinPerfilLocal = !base.profile.bio && base.profile.includes.length === 0 && base.profile.spots.length === 0
  return {
    ...base,
    person: {
      ...base.person,
      firstName: base.person.firstName || texto(vista.nombre_pila),
      lastName: base.person.lastName || texto(vista.apellido_inicial),
      district: distrito,
      university: base.person.university || texto(vista.universidad),
      career: base.person.career || texto(vista.carrera),
      cycle: base.person.cycle || texto(vista.ciclo),
    },
    profile: sinPerfilLocal
      ? {
          ...base.profile,
          bio: perfil.bio,
          includes: perfil.incluye,
          style: perfil.estilo,
          sizes: perfil.tamanos.length > 0 ? perfil.tamanos : base.profile.sizes,
          days: perfil.dias,
          times: perfil.franjas,
          spots: perfil.parques,
          rate: perfil.tarifa >= CONFIG.tarifaMinima && perfil.tarifa <= CONFIG.tarifaMaxima ? perfil.tarifa : base.profile.rate,
          experience: perfil.experiencia,
          disponible: perfil.disponible,
        }
      : base.profile,
    cobro: cobroDeFila(cobro) ?? base.cobro,
    status: 'activo',
    review: { ...base.review, comprobaciones: marcas, supervisedWalks: Math.max(0, numero(vista.paseos_acompanados) || 0) },
    code: texto(vista.codigo) || base.code,
  }
}
