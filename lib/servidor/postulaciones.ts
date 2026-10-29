/**
 * Postulaciones con el servidor (paso 7b): lo que hace cada persona con SU sesión. Funciones que reciben el cliente
 * (las pruebas le pasan uno de verdad contra la base de prueba). Nada espera en una cola: el que llama decide cuándo
 * reintentar, y NADA se marca como hecho hasta que la base responde que sí.
 */
import type { ComprobacionId } from '../verificacion'
import { makeCode, type WalkerApplication } from '../walkerStore'
import { cobrosDeFilas, filaDeCobro, mismoCobro } from './pagosMapeo'
import { ErrorDeBase, type FilaCruda } from './paseosTipos'
import { TEXTO_REVISION_SERVIDOR } from './paseosTextos'
import type { ClientePostulaciones } from './clientePostulaciones'
import { cambiosDelEquipo, dniValido, filaDePostulacion, huellaDeRespuestas, huellaDePostulacion, listaDelEquipo, respuestasParaEnviar, type PostulacionDelEquipo } from './postulacionesMapeo'

/** Un error que se arregla esperando (sin internet, sesión vencida, base caída). */
export function seArreglaEsperando(e: unknown): boolean {
  if (!(e instanceof ErrorDeBase)) return true
  const s = e.status
  return s === undefined || s === 0 || s === 401 || s === 408 || s === 425 || s === 429 || s >= 500
}

export type ResultadoEnvio = { ok: true; huella: string; dni: string; codigo: string; respuestas: string } | { ok: false; sinRed: boolean; motivo: string }

/** Cuántas veces se prueba un código nuevo si el que salió ya lo tiene otra persona (son 4 letras o números al azar). */
const INTENTOS_DE_CODIGO = 4

/**
 * El paseador manda SU postulación, dónde cobra y su DNI (también cuando lo corrige). No manda nada si no cambió desde el último
 * envío (`anterior`). El estado «enviada» solo viaja si la base todavía se lo deja cambiar; si el equipo ya la aprobó o la
 * rechazó, solo se actualizan sus datos.
 *   - Si la base ya tiene su postulación, se queda con ESE código (la base no deja cambiarlo): así quien abre la app en otro
 *     teléfono, donde se armó un código nuevo, no choca consigo mismo.
 *   - Dónde cobra sale junto con la postulación (y no recién cuando ya lo aprobaron): el equipo lo necesita para revisar, y la
 *     familia solo ve a un paseador aprobado que ya tiene dónde cobrar.
 */
export async function enviarMiPostulacion(c: ClientePostulaciones, app: WalkerApplication, id: string, anterior: { huella: string; dni: string; respuestas?: string } | null = null): Promise<ResultadoEnvio> {
  try {
    const { post, cobro: cobroFila } = await c.miPostulacion(id)
    const estado = post ? String(post.estado) : null
    let codigo = post ? String(post.codigo) : app.code
    const cobroEnBase = cobroFila ? cobrosDeFilas([cobroFila])[id] : undefined
    const filaCobro = filaDeCobro(app.cobro, id)
    const sinCambios = () => huellaDePostulacion({ ...filaDePostulacion(app, id, estado), codigo }) + JSON.stringify(filaCobro ?? null)
    const huella = sinCambios()
    if (huella !== anterior?.huella) {
      for (let intento = 1; ; intento++) {
        try {
          await c.guardarPostulacion({ ...filaDePostulacion(app, id, estado), codigo })
          break
        } catch (e) {
          // Solo se cambia el código si es la primera vez (sin fila) y la base dijo que ese código ya es de otra persona.
          if (post || intento >= INTENTOS_DE_CODIGO || !(e instanceof ErrorDeBase) || e.code !== '23505') throw e
          codigo = makeCode()
        }
      }
    }
    if (filaCobro && !mismoCobro(cobroEnBase, app.cobro) && huella !== anterior?.huella) await c.guardarCobro(filaCobro)
    const dni = dniValido(app.person.dni) ? app.person.dni : ''
    // El DNI no se puede volver a leer: se recuerda cuál se mandó. `guardar_dni` es idempotente: el mismo número no cambia nada,
    // y uno corregido reemplaza al anterior (y deja sin marcar la casilla del equipo).
    if (dni && dni !== anterior?.dni) await c.guardarDni(dni)
    // Lo que escribió en el examen va aparte y solo lo lee el equipo. `guardar_respuestas_examen` es idempotente.
    const respuestas = huellaDeRespuestas(app)
    if (respuestas && respuestas !== anterior?.respuestas) await c.guardarRespuestas(respuestasParaEnviar(app))
    return { ok: true, huella: sinCambios(), dni: dni || (anterior?.dni ?? ''), codigo, respuestas: respuestas || (anterior?.respuestas ?? '') }
  } catch (e) {
    if (seArreglaEsperando(e)) return { ok: false, sinRed: true, motivo: TEXTO_REVISION_SERVIDOR.paseadorSinConexion }
    return { ok: false, sinRed: false, motivo: TEXTO_REVISION_SERVIDOR.paseadorRechazo }
  }
}

/* ------------------------------------------------------------------ */
/* El equipo                                                            */
/* ------------------------------------------------------------------ */

/** Todas las postulaciones enviadas, con las casillas, el DNI completo, el celular, dónde cobra y las notas del equipo. */
export async function leerPostulacionesDelEquipo(c: ClientePostulaciones): Promise<PostulacionDelEquipo[]> {
  const posts = await c.listarPostulaciones()
  const ids = [...new Set(posts.map((p) => String(p.paseador_id ?? '')).filter((x) => x !== ''))]
  const [comps, dnis, celulares, cobros, notas, respuestas] = await Promise.all([c.listarComprobaciones(), c.listarDnis(), c.listarCelulares(ids), c.listarCobrosDe(ids), c.listarNotas(), c.listarRespuestas()])
  return listaDelEquipo(posts, comps, dnis, celulares, cobrosDeFilas(cobros), notas, respuestas)
}

export type ResultadoDecision = { ok: true } | { ok: false; sinRed: boolean; motivo: string }

/**
 * El equipo guarda lo que cambió en una postulación. Primero las casillas, después el estado y los paseos, al final la
 * nota: así, si falla a la mitad, nunca queda «aprobada» sin sus casillas. Sin cambios no llama a la base.
 */
export async function guardarDecision(c: ClientePostulaciones, id: string, antes: WalkerApplication, despues: WalkerApplication): Promise<ResultadoDecision> {
  const cambios = cambiosDelEquipo(antes, despues)
  if (!cambios) return { ok: true }
  try {
    const equipoId = await c.miId()
    if (!equipoId) return { ok: false, sinRed: false, motivo: TEXTO_REVISION_SERVIDOR.equipoSinPermiso }
    if (cambios.casillas) await c.marcarCasillas(id, cambios.casillas as Record<ComprobacionId, boolean>, equipoId)
    if (cambios.estado !== undefined || cambios.paseos !== undefined) {
      await c.decidir(id, { ...(cambios.estado !== undefined ? { estado: cambios.estado } : {}), ...(cambios.paseos !== undefined ? { paseos_acompanados: cambios.paseos } : {}) })
    }
    if (cambios.nota !== undefined) await c.guardarNota(id, cambios.nota, equipoId)
    return { ok: true }
  } catch (e) {
    if (seArreglaEsperando(e)) return { ok: false, sinRed: true, motivo: TEXTO_REVISION_SERVIDOR.equipoSinConexion }
    const sinPermiso = e instanceof ErrorDeBase && (e.code === '42501' || e.status === 403)
    return { ok: false, sinRed: false, motivo: sinPermiso ? TEXTO_REVISION_SERVIDOR.equipoSinPermiso : TEXTO_REVISION_SERVIDOR.equipoNoSePudo }
  }
}

export type { FilaCruda, PostulacionDelEquipo }
