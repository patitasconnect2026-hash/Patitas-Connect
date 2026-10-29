/**
 * El cliente de las postulaciones sobre el cliente de Supabase. Todo va con la sesión de la persona (clave pública): las
 * reglas de acceso de la base deciden qué ve y qué cambia cada una. Nada usa la clave de servicio. Este archivo solo
 * traduce: lo que vale como negocio está en `postulacionesMapeo.ts` y en las reglas de `supabase/migrations/`.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ComprobacionId } from '../verificacion'
import { datos, filas, type Respuesta } from './clientePaseos'
import { filaDeComprobaciones, type FilaPostulacionNueva } from './postulacionesMapeo'
import { ErrorDeBase, type FilaCobroNueva, type FilaCruda } from './paseosTipos'

export interface ClientePostulaciones {
  /** El id de la cuenta con sesión (null si no hay). No pregunta a la red. */
  miId(): Promise<string | null>

  /* ---- el paseador (lo suyo) ---- */
  /** Lo que la base tiene de esta persona: su postulación, sus casillas y dónde cobra (cada una puede no existir todavía). */
  miPostulacion(id: string): Promise<{ post: FilaCruda | null; comp: FilaCruda | null; cobro: FilaCruda | null }>
  /** Crea la postulación o actualiza la suya. El estado solo viaja si la base aún se lo deja cambiar (ver `filaDePostulacion`). */
  guardarPostulacion(fila: FilaPostulacionNueva): Promise<void>
  /**
   * Guarda o corrige SU DNI por `guardar_dni` (la base lo guarda a nombre de quien llama y la persona no lo puede volver a leer).
   * Si cambió un número que el equipo ya había comprobado, la base deja esa casilla sin marcar.
   */
  guardarDni(dni: string): Promise<'nuevo' | 'igual' | 'corregido'>
  /** Guarda dónde cobra (Yape o Plin): lo ve él y el equipo, nunca la familia. */
  guardarCobro(fila: FilaCobroNueva): Promise<void>
  /**
   * Guarda lo que escribió en el examen ({pregunta: texto}) por `guardar_respuestas_examen`: solo el equipo lo puede leer (el
   * paseador tampoco lo vuelve a leer). Lanza si la base dice que no (respuesta corta, larga o rol equivocado).
   */
  guardarRespuestas(respuestas: Record<string, string>): Promise<void>

  /* ---- el equipo (todas) ---- */
  listarPostulaciones(): Promise<FilaCruda[]>
  listarComprobaciones(): Promise<FilaCruda[]>
  listarDnis(): Promise<FilaCruda[]>
  listarCelulares(ids: readonly string[]): Promise<FilaCruda[]>
  listarNotas(): Promise<FilaCruda[]>
  listarRespuestas(): Promise<FilaCruda[]>
  listarCobrosDe(ids: readonly string[]): Promise<FilaCruda[]>
  marcarCasillas(paseadorId: string, casillas: Record<ComprobacionId, boolean>, equipoId: string): Promise<void>
  /** Cambia el estado y/o los paseos acompañados. Lanza si la base no cambió ninguna fila. */
  decidir(paseadorId: string, cambios: { estado?: string; paseos_acompanados?: number }): Promise<void>
  guardarNota(paseadorId: string, nota: string, equipoId: string): Promise<void>
}

export function envolverClientePostulaciones(c: SupabaseClient): ClientePostulaciones {
  return {
    async miId() {
      const s = await c.auth.getSession()
      if (s.error) throw new ErrorDeBase(s.error.message, s.error.status, s.error.code)
      return s.data.session?.user?.id ?? null
    },

    async miPostulacion(id) {
      const [post, comp, cobro] = await Promise.all([
        c.from('postulaciones').select('*').eq('paseador_id', id).retry(false).maybeSingle(),
        c.from('comprobaciones').select('*').eq('paseador_id', id).retry(false).maybeSingle(),
        c.from('cobros_paseador').select('*').eq('paseador_id', id).retry(false).maybeSingle(),
      ])
      const fila = (r: Respuesta) => {
        const d = datos(r)
        return d && typeof d === 'object' ? (d as FilaCruda) : null
      }
      return { post: fila(post as Respuesta), comp: fila(comp as Respuesta), cobro: fila(cobro as Respuesta) }
    },
    async guardarPostulacion(fila) {
      datos((await c.from('postulaciones').upsert(fila, { onConflict: 'paseador_id' })) as Respuesta)
    },
    async guardarDni(dni) {
      const d = datos((await c.rpc('guardar_dni', { p_dni: dni })) as Respuesta)
      if (d !== 'nuevo' && d !== 'igual' && d !== 'corregido') throw new ErrorDeBase('La base no confirmó el DNI.', 502)
      return d
    },

    async guardarCobro(fila) {
      datos((await c.from('cobros_paseador').upsert(fila, { onConflict: 'paseador_id' })) as Respuesta)
    },

    async guardarRespuestas(respuestas) {
      const d = datos((await c.rpc('guardar_respuestas_examen', { p_respuestas: respuestas })) as Respuesta)
      const r = d && typeof d === 'object' ? (d as Record<string, unknown>) : {}
      if (r.guardado !== true) throw new ErrorDeBase(`La base no guardó las respuestas (${String(r.motivo ?? 'otro')}).`, 422, 'respuestas')
    },

    async listarPostulaciones() {
      return filas((await c.from('postulaciones').select('*').order('creado_en', { ascending: false }).retry(false)) as Respuesta)
    },
    async listarComprobaciones() {
      return filas((await c.from('comprobaciones').select('*').retry(false)) as Respuesta)
    },
    async listarDnis() {
      return filas((await c.from('datos_dni').select('*').retry(false)) as Respuesta)
    },
    async listarCelulares(ids) {
      if (ids.length === 0) return []
      return filas((await c.from('datos_personales').select('id, celular').in('id', [...ids]).retry(false)) as Respuesta)
    },
    async listarRespuestas() {
      return filas((await c.from('respuestas_escritas').select('*').retry(false)) as Respuesta)
    },
    async listarNotas() {
      return filas((await c.from('notas_revision').select('*').retry(false)) as Respuesta)
    },
    async listarCobrosDe(ids) {
      if (ids.length === 0) return []
      return filas((await c.from('cobros_paseador').select('*').in('paseador_id', [...ids]).retry(false)) as Respuesta)
    },
    async marcarCasillas(paseadorId, casillas, equipoId) {
      datos((await c.from('comprobaciones').upsert(filaDeComprobaciones(paseadorId, casillas, equipoId), { onConflict: 'paseador_id' })) as Respuesta)
    },
    async decidir(paseadorId, cambios) {
      const r = await c.from('postulaciones').update(cambios).eq('paseador_id', paseadorId).select('paseador_id')
      if (filas(r as Respuesta).length === 0) throw new ErrorDeBase('La base no cambió ninguna postulación.', 403, '42501')
    },
    async guardarNota(paseadorId, nota, equipoId) {
      datos((await c.from('notas_revision').upsert({ paseador_id: paseadorId, nota, marcado_por: equipoId, actualizado_en: new Date().toISOString() }, { onConflict: 'paseador_id' })) as Respuesta)
    },
  }
}
