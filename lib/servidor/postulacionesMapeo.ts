/**
 * Las postulaciones con el servidor (paso 7b): de la postulación del teléfono a las filas de `postulaciones`,
 * `comprobaciones`, `datos_dni` y `notas_revision`, y al revés. Funciones puras: no hablan con la base.
 *
 *   - El PASEADOR escribe lo suyo (datos, perfil, consentimientos, curso, examen y la hora de la videollamada) y su DNI. NUNCA el estado
 *     (salvo borrador ↔ enviada), las casillas, los paseos acompañados ni las notas: eso lo decide el equipo.
 *   - El EQUIPO marca las cinco casillas (`comprobaciones`), cambia el estado y deja sus notas internas (`notas_revision`,
 *     una tabla que el postulante no puede leer).
 *   - «Aprobado» sigue saliendo SOLO con las casillas marcadas: la app aplica `estadoVisible` (lib/walkerStore.ts) a lo que
 *     trae la base, y la vista pública (`paseadores_publicos`) exige las cinco casillas y el cobro registrado.
 *   - La foto del postulante se queda en su teléfono (hoy no sube al almacén).
 */
import type { District } from '../types'
import type { CursoResult, QuizResult } from '../quiz'
import { COMPROBACIONES, type ComprobacionId, type Marcas } from '../verificacion'
import { EMPTY_APP, type AppStatus, type CobroPaseador, type WalkerApplication } from '../walkerStore'
import { TERMS_VERSION } from '../legal'
import type { FilaCruda } from './paseosTipos'

const esObjeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const texto = (v: unknown): string => (typeof v === 'string' ? v : '')
const entero = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.trunc(v)) : 0)

const ESTADOS: readonly AppStatus[] = ['borrador', 'enviada', 'supervisado', 'activo', 'rechazada']
const DISTRITOS: readonly District[] = ['San Isidro', 'Jesús María']
/** Las cinco casillas que marca el equipo (la sexta, «primer paseo», se deduce de los paseos acompañados). */
export const CASILLAS_DEL_EQUIPO: readonly ComprobacionId[] = COMPROBACIONES.map((c) => c.id).filter((id): id is ComprobacionId => id !== 'primerPaseo')

/** Los estados en los que el paseador todavía puede cambiar su propia postulación (los demás los pone el equipo). */
export const ESTADOS_DEL_PASEADOR: readonly string[] = ['borrador', 'enviada']

const estadoDe = (v: unknown): AppStatus | null => ESTADOS.find((e) => e === v) ?? null

/* ------------------------------------------------------------------ */
/* El paseador escribe su postulación                                  */
/* ------------------------------------------------------------------ */

/** La fila de `postulaciones` que escribe el paseador. `estado` solo viaja cuando la base todavía se lo deja cambiar. */
export interface FilaPostulacionNueva {
  paseador_id: string
  codigo: string
  estado?: 'enviada'
  nombre: string
  apellido: string
  nacimiento: string | null
  distrito: District
  universidad: string
  carrera: string
  ciclo: string
  consentimientos: Record<string, boolean>
  consentimiento_en: string | null
  version_terminos: string
  perfil: Record<string, unknown>
  curso: CursoResult | null
  curso_intentos: number
  examen: QuizResult | null
  examen_intentos: number
  consulta_autorizada: boolean
  cita_videollamada: string
}

const fechaIso = (v: string): string | null => (v && Number.isFinite(Date.parse(v)) ? new Date(v).toISOString() : null)
const soloFecha = (v: string): string | null => (/^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) ? v : null)

/**
 * La fila para `postulaciones`. `estadoEnBase`: lo que la base dice hoy de esta persona (`null` = todavía no tiene fila).
 * El estado «enviada» solo se manda si la base aún lo permite (sin fila, «borrador» o «enviada»): si el equipo ya la
 * aprobó o rechazó, esas filas no se tocan (la base lo rechazaría con «El estado lo cambia el equipo»).
 */
export function filaDePostulacion(app: WalkerApplication, paseadorId: string, estadoEnBase: string | null): FilaPostulacionNueva {
  const puedeCambiarEstado = estadoEnBase === null || ESTADOS_DEL_PASEADOR.includes(estadoEnBase)
  return {
    paseador_id: paseadorId,
    codigo: app.code,
    ...(puedeCambiarEstado && app.status === 'enviada' ? { estado: 'enviada' as const } : {}),
    nombre: app.person.firstName.trim(),
    apellido: app.person.lastName.trim(),
    nacimiento: soloFecha(app.person.birth),
    distrito: DISTRITOS.find((d) => d === app.person.district) ?? 'San Isidro',
    universidad: app.person.university,
    carrera: app.person.career,
    ciclo: app.person.cycle,
    consentimientos: { ...app.consent },
    consentimiento_en: fechaIso(app.consentAt),
    version_terminos: app.consentVersion || TERMS_VERSION,
    perfil: {
      bio: app.profile.bio,
      includes: app.profile.includes,
      style: app.profile.style,
      sizes: app.profile.sizes,
      days: app.profile.days,
      times: app.profile.times,
      spots: app.profile.spots,
      rate: app.profile.rate,
      experience: app.profile.experience,
      disponible: app.profile.disponible !== false,
    },
    curso: app.curso ?? null,
    curso_intentos: entero(app.cursoAttempts),
    // Los textos del examen NO viajan aquí: van aparte (`guardar_respuestas_examen`) y solo los lee el equipo.
    examen: app.quiz ? { ...app.quiz, open: {} } : null,
    examen_intentos: entero(app.quizAttempts),
    consulta_autorizada: app.consults.consent,
    cita_videollamada: app.videoSlot,
  }
}

/** Lo que se manda de la postulación sin el momento en que se guardó (para saber si algo cambió desde el último envío). */
export const huellaDePostulacion = (f: FilaPostulacionNueva): string => JSON.stringify(f)

/** ¿Es un DNI que la base acepta (8 números)? */
export const dniValido = (dni: string): boolean => /^[0-9]{8}$/.test(dni)

/* ------------------------------------------------------------------ */
/* De las filas a la postulación de la app                              */
/* ------------------------------------------------------------------ */

export interface FilasDePostulacion {
  post: FilaCruda
  comp?: FilaCruda | null
  /** Solo lo trae el equipo (el paseador no puede volver a leer su DNI). */
  dni?: string | null
  /** El celular de su cuenta (`datos_personales`): solo lo trae el equipo. */
  celular?: string | null
  cobro?: CobroPaseador | null
  /** Las notas internas: solo las trae el equipo. */
  nota?: string | null
  /** Lo que escribió en el examen ({pregunta: texto}): solo lo trae el equipo. */
  respuestas?: Readonly<Record<string, string>> | null
}

/** Las casillas de `comprobaciones` como las marcas de la app. */
export function marcasDeComprobaciones(comp: FilaCruda | null | undefined): Marcas {
  const marcas: Marcas = {}
  for (const id of CASILLAS_DEL_EQUIPO) marcas[id] = comp?.[id] === true
  return marcas
}

function perfilDeFila(v: unknown): WalkerApplication['profile'] {
  const p = esObjeto(v) ? v : {}
  const lista = (x: unknown): string[] => (Array.isArray(x) ? x.filter((y): y is string => typeof y === 'string') : [])
  const tarifa = typeof p.rate === 'number' && Number.isFinite(p.rate) ? p.rate : EMPTY_APP.profile.rate
  const sizes = lista(p.sizes).filter((s): s is 'small' | 'medium' | 'large' => s === 'small' || s === 'medium' || s === 'large')
  return {
    bio: texto(p.bio),
    includes: lista(p.includes),
    style: lista(p.style),
    sizes: sizes.length ? sizes : EMPTY_APP.profile.sizes,
    days: lista(p.days),
    times: lista(p.times),
    spots: lista(p.spots),
    rate: tarifa,
    experience: texto(p.experience),
  }
}

/** Una postulación de la app armada con lo que dice la base. La foto no viene (se queda en el teléfono de quien la subió). */
export function appDeFilas(f: FilasDePostulacion): WalkerApplication {
  const p = f.post
  const dist = DISTRITOS.find((d) => d === p.distrito) ?? EMPTY_APP.person.district
  const consent = esObjeto(p.consentimientos) ? Object.fromEntries(Object.entries(p.consentimientos).filter(([, v]) => typeof v === 'boolean')) : {}
  const curso = esObjeto(p.curso) ? (p.curso as unknown as CursoResult) : undefined
  const examen = esObjeto(p.examen) ? (p.examen as unknown as QuizResult) : undefined
  // Los textos del examen viven en su propia tabla: se juntan aquí (solo los trae el equipo).
  const quiz = examen ? { ...examen, open: { ...(examen.open ?? {}), ...(f.respuestas ?? {}) } } : undefined
  return {
    ...EMPTY_APP,
    phone: f.celular ?? '',
    consent: consent as Record<string, boolean>,
    consentAt: texto(p.consentimiento_en),
    consentVersion: texto(p.version_terminos) || EMPTY_APP.consentVersion,
    person: {
      firstName: texto(p.nombre),
      lastName: texto(p.apellido),
      dni: f.dni ?? '',
      birth: texto(p.nacimiento),
      district: dist,
      university: texto(p.universidad),
      career: texto(p.carrera),
      cycle: texto(p.ciclo),
    },
    profile: perfilDeFila(p.perfil),
    ...(quiz ? { quiz } : {}),
    quizAttempts: entero(p.examen_intentos),
    ...(curso ? { curso } : {}),
    cursoAttempts: entero(p.curso_intentos),
    cobro: f.cobro ?? EMPTY_APP.cobro,
    consults: { consent: p.consulta_autorizada === true },
    videoSlot: texto(p.cita_videollamada),
    status: estadoDe(p.estado) ?? 'borrador',
    review: { comprobaciones: marcasDeComprobaciones(f.comp), notes: f.nota ?? '', supervisedWalks: entero(p.paseos_acompanados) },
    code: texto(p.codigo),
    createdAt: texto(p.creado_en),
  }
}

/**
 * La postulación de ESTE paseador con lo que dice la base de su estado real. Sin fila en la base, queda tal cual está en
 * su teléfono. Con fila: manda la base en el estado (enviada, aprobada, rechazada), las casillas y los paseos acompañados;
 * lo que escribió él se queda como está. Las notas internas nunca llegan al paseador. Si en este teléfono no hay nada
 * (otro teléfono, o se borró), se arma con lo que guardó en la base (menos el DNI, que ya no se puede volver a leer).
 */
export function appConEstadoPropio(local: WalkerApplication | null, post: FilaCruda | null, comp: FilaCruda | null): WalkerApplication | null {
  if (!post) return local
  const base = local ?? appDeFilas({ post, comp, celular: null })
  const delServidor = estadoDe(post.estado)
  return {
    ...base,
    // «borrador» en la base: nunca se mandó nada, así que manda lo local.
    status: delServidor && delServidor !== 'borrador' ? delServidor : base.status,
    review: { ...base.review, comprobaciones: marcasDeComprobaciones(comp), supervisedWalks: entero(post.paseos_acompanados), notes: '' },
    code: texto(post.codigo) || base.code,
  }
}

/** ¿La base ya recibió la postulación de esta persona (la envió, o el equipo ya la aprobó o la rechazó)? Un borrador no cuenta. */
export const yaEnviadaALaBase = (post: FilaCruda | null | undefined): boolean => !!post && estadoDe(post.estado) !== null && post.estado !== 'borrador'

/**
 * ¿Esta postulación del teléfono es solo un cascarón? Es lo que arma la app al entrar con una cuenta nueva en un teléfono: el
 * nombre, el apellido y el celular de la cuenta, sin nada de lo que se llena en los pasos (perfil, curso, examen).
 */
export const esCascaron = (a: WalkerApplication | null | undefined): boolean => !a || (a.profile.bio.trim().length < 30 && !a.curso && !a.quiz)

/**
 * La postulación de una persona que ya la envió, armada en un teléfono donde todavía no la tiene (o solo tiene un cascarón): sale
 * de lo que guardó en la base (datos, perfil, curso, examen, hora de la videollamada, dónde cobra). Del teléfono se conserva lo que
 * la base no devuelve o no tiene: el celular, la foto y, si lo hay, el DNI (la base no se lo deja volver a leer).
 */
export function appDesdeLaBase(local: WalkerApplication | null, post: FilaCruda, comp: FilaCruda | null, cobro: CobroPaseador | null): WalkerApplication {
  const base = appDeFilas({ post, comp, cobro, celular: local?.phone ?? '' })
  return {
    ...base,
    ...(local?.photo ? { photo: local.photo } : {}),
    person: { ...base.person, dni: local?.person.dni ?? '' },
    cobro: cobro ?? (local && local.cobro.metodo ? local.cobro : base.cobro),
  }
}

/* ------------------------------------------------------------------ */
/* El equipo decide                                                     */
/* ------------------------------------------------------------------ */

export interface CambiosDelEquipo {
  estado?: AppStatus
  paseos?: number
  /** Las cinco casillas completas (la fila de `comprobaciones` se escribe entera). */
  casillas?: Record<ComprobacionId, boolean>
  nota?: string
}

/** Qué cambió el equipo entre lo que ve la base y lo que dejó en pantalla. null = nada. */
export function cambiosDelEquipo(antes: WalkerApplication, despues: WalkerApplication): CambiosDelEquipo | null {
  const cambios: CambiosDelEquipo = {}
  if (despues.status !== antes.status) cambios.estado = despues.status
  if (despues.review.supervisedWalks !== antes.review.supervisedWalks) cambios.paseos = despues.review.supervisedWalks
  const marcaAntes = marcasDeComprobaciones({ ...Object.fromEntries(CASILLAS_DEL_EQUIPO.map((id) => [id, antes.review.comprobaciones[id] === true])) })
  const marcaDespues = marcasDeComprobaciones({ ...Object.fromEntries(CASILLAS_DEL_EQUIPO.map((id) => [id, despues.review.comprobaciones[id] === true])) })
  if (CASILLAS_DEL_EQUIPO.some((id) => marcaAntes[id] !== marcaDespues[id])) cambios.casillas = marcaDespues as Record<ComprobacionId, boolean>
  if (despues.review.notes !== antes.review.notes) cambios.nota = despues.review.notes
  return Object.keys(cambios).length === 0 ? null : cambios
}

/** La fila de `comprobaciones`: las cinco casillas y quién del equipo las marcó. */
export function filaDeComprobaciones(paseadorId: string, casillas: Record<ComprobacionId, boolean>, equipoId: string) {
  return {
    paseador_id: paseadorId,
    dni: casillas.dni === true,
    distrito: casillas.distrito === true,
    celular: casillas.celular === true,
    consultas: casillas.consultas === true,
    examen: casillas.examen === true,
    marcado_por: equipoId,
  }
}

/** Una postulación que el equipo ve en su lista: quién es (id de su cuenta) y su postulación. */
export interface PostulacionDelEquipo {
  id: string
  app: WalkerApplication
}

/** La lista del equipo: las que ya se enviaron (los borradores no se muestran), las más nuevas primero. */
export function listaDelEquipo(posts: readonly FilaCruda[], comps: readonly FilaCruda[], dnis: readonly FilaCruda[], celulares: readonly FilaCruda[], cobros: Readonly<Record<string, CobroPaseador>>, notas: readonly FilaCruda[], respuestas: readonly FilaCruda[] = []): PostulacionDelEquipo[] {
  const por = (filas: readonly FilaCruda[], clave: string) => new Map(filas.map((f) => [texto(f[clave]), f]))
  const compDe = por(comps, 'paseador_id')
  const dniDe = por(dnis, 'paseador_id')
  const celDe = por(celulares, 'id')
  const notaDe = por(notas, 'paseador_id')
  const respuestasDe = new Map<string, Record<string, string>>()
  for (const r of respuestas) {
    const quien = texto(r.paseador_id)
    respuestasDe.set(quien, { ...(respuestasDe.get(quien) ?? {}), [texto(r.pregunta_id)]: texto(r.texto) })
  }
  return posts
    .filter((p) => texto(p.paseador_id) !== '' && estadoDe(p.estado) !== null && p.estado !== 'borrador')
    .sort((a, b) => Date.parse(texto(b.creado_en)) - Date.parse(texto(a.creado_en)))
    .map((p) => {
      const id = texto(p.paseador_id)
      return {
        id,
        app: appDeFilas({
          post: p,
          comp: compDe.get(id) ?? null,
          dni: texto(dniDe.get(id)?.dni) || null,
          celular: texto(celDe.get(id)?.celular) || null,
          cobro: cobros[id] ?? null,
          nota: texto(notaDe.get(id)?.nota) || null,
          respuestas: respuestasDe.get(id) ?? null,
        }),
      }
    })
}

/** Una huella de lo escrito en el examen (para mandarlo solo cuando cambió). Vacía si no hay textos. */
export const huellaDeRespuestas = (app: WalkerApplication): string => {
  const open = app.quiz?.open ?? {}
  const claves = Object.keys(open).filter((k) => (open[k] ?? '').trim() !== '').sort()
  return claves.length === 0 ? '' : JSON.stringify(claves.map((k) => [k, open[k].trim()]))
}

/** Lo que se manda a `guardar_respuestas_examen`: las respuestas escritas, ya limpias. */
export const respuestasParaEnviar = (app: WalkerApplication): Record<string, string> =>
  Object.fromEntries(Object.entries(app.quiz?.open ?? {}).filter(([, t]) => t.trim() !== '').map(([k, t]) => [k, t.trim()]))
