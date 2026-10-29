/**
 * El cliente de la IA de apoyo: llama a la Edge Function `resumen-ia` con la sesión de la persona del equipo. La clave de la IA no
 * pasa por aquí (vive en los secretos de Supabase). Un «no» llega como motivo (no como error de red).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { leerRespuestaDeLaIa, type PedidoDeResumen, type ResumenDeApoyo } from '../../supabase/functions/_shared/resumen'

export type ResultadoIa = { ok: true; resumen: ResumenDeApoyo; aviso: string } | { ok: false; motivo: string }

export interface ClienteIa {
  resumir(pedido: PedidoDeResumen): Promise<ResultadoIa>
}

const MOTIVOS = ['sin_sesion', 'sin_permiso', 'sin_clave', 'pedido', 'registro', 'ia', 'respuesta']

export function envolverClienteIa(c: SupabaseClient): ClienteIa {
  return {
    async resumir(pedido) {
      try {
        const { data, error } = await c.functions.invoke('resumen-ia', { body: pedido })
        if (error) {
          // La función contestó con un «no»: su respuesta trae el motivo.
          const contexto = (error as { context?: unknown }).context
          if (contexto instanceof Response) {
            const cuerpo = (await contexto.json().catch(() => ({}))) as { error?: unknown }
            return { ok: false, motivo: typeof cuerpo.error === 'string' && MOTIVOS.includes(cuerpo.error) ? cuerpo.error : 'ia' }
          }
          return { ok: false, motivo: 'sin_conexion' }
        }
        // Se vuelve a pasar por el filtro: aunque la función ya lo hizo, aquí tampoco entra un veredicto.
        const resumen = leerRespuestaDeLaIa(JSON.stringify(data ?? {}))
        return resumen ? { ok: true, resumen, aviso: typeof (data as { aviso?: unknown })?.aviso === 'string' ? (data as { aviso: string }).aviso : '' } : { ok: false, motivo: 'respuesta' }
      } catch {
        return { ok: false, motivo: 'sin_conexion' }
      }
    },
  }
}
