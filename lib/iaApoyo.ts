/**
 * La IA de apoyo en /admin (Bloque 7), del lado de la app: arma el pedido (SIN nombre, DNI, teléfono ni correo) y decide qué
 * mensaje mostrar. La llamada a la IA se hace en la Edge Function `resumen-ia` (supabase/functions/), con la clave en los secretos de
 * Supabase. Funciones puras. La clave NO existe en este archivo ni en ninguna otra parte de la app.
 */
import { CONFIG } from './config'
import type { QuizResult } from './quiz'
import { PREGUNTAS_EXAMEN } from './respuestasEscritas'
import { TEXTO_IA } from './iaTextos'
import { anonimizar, type PedidoDeResumen } from '../supabase/functions/_shared/resumen'

export type EstadoDeLaIa = 'encendida' | 'apagada' | 'aviso_pendiente'

/** ¿Se puede usar? Solo si el equipo la encendió Y la abogada ya revisó el aviso de privacidad. */
export function estadoDeLaIa(c: Pick<typeof CONFIG, 'iaApoyoActivada' | 'iaAvisoRevisado'> = CONFIG): EstadoDeLaIa {
  if (!c.iaApoyoActivada) return 'apagada'
  return c.iaAvisoRevisado ? 'encendida' : 'aviso_pendiente'
}

/** El pedido para la función: solo respuestas escritas, ya sin datos personales. null si no hay nada que resumir. */
export function pedidoParaLaIa(paseadorId: string, quiz: QuizResult | undefined, persona: { nombres: readonly string[]; dni?: string; telefono?: string }): PedidoDeResumen | null {
  if (!quiz) return null
  const quitar = [...persona.nombres, persona.dni ?? '', persona.telefono ?? ''].map((x) => x.trim()).filter((x) => x.length >= 2)
  const respuestas: Record<string, string> = {}
  const preguntas: Record<string, string> = {}
  for (const p of PREGUNTAS_EXAMEN) {
    const t = (quiz.open[p.id] ?? '').trim()
    if (!t) continue
    respuestas[p.id] = anonimizar(t, quitar)
    preguntas[p.id] = p.texto
  }
  return Object.keys(respuestas).length === 0 ? null : { paseadorId, respuestas, preguntas, quitar: [] }
}

/** La frase para un «no» de la función. */
export function textoDeMotivoIa(motivo: string): string {
  switch (motivo) {
    case 'sin_clave':
      return TEXTO_IA.sinClave
    case 'sin_permiso':
      return TEXTO_IA.sinPermiso
    case 'sin_sesion':
      return TEXTO_IA.sinSesion
    case 'sin_conexion':
      return TEXTO_IA.sinConexion
    default:
      return TEXTO_IA.fallo
  }
}
