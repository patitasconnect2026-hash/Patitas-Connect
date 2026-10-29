/**
 * La ubicación del paseo con el servidor (Bloque 6): el paseador publica su lectura cada `segundosEnVivo` segundos y la familia
 * la mira, SOLO con la app abierta y SOLO mientras el paseo está «en_paseo» (después la base la borra). El equipo lee además
 * las marcas de «sospechosa» de las fotos. Todo con la sesión de la persona; las reglas las pone la base.
 *
 * Es una SEÑAL: el teléfono dice dónde está y se puede falsificar (apps de ubicación simulada). Nunca se promete lo contrario.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { datos, filas, type Respuesta } from './clientePaseos'
import type { FilaCruda } from './paseosTipos'

export interface UbicacionEnVivo {
  pos: [number, number]
  precisionM: number | null
  /** La hora del SERVIDOR (ms) en que llegó la lectura. */
  en: number
}

export interface ClienteUbicacion {
  /** El paseador publica su lectura. Un «no» de las reglas llega con motivo (no es un error de red). */
  publicar(paseo: string, lectura: { pos: [number, number]; precisionM: number | null }): Promise<{ publicado: true } | { publicado: false; motivo: string }>
  /** La última lectura de este paseo, o null si no hay (todavía no salió, ya terminó o nadie la publicó). */
  actual(paseo: string): Promise<UbicacionEnVivo | null>
  /** El equipo: las fotos marcadas «sospechosas» con sus motivos. */
  sospechas(): Promise<FilaCruda[]>
}

const numero = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const objeto = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

export function envolverClienteUbicacion(c: SupabaseClient): ClienteUbicacion {
  return {
    async publicar(paseo, lectura) {
      const r = objeto(datos((await c.rpc('publicar_ubicacion', { p_paseo: paseo, p_lat: lectura.pos[0], p_lng: lectura.pos[1], p_precision: lectura.precisionM })) as Respuesta))
      return r.publicado === true ? { publicado: true } : { publicado: false, motivo: String(r.motivo ?? 'otro') }
    },
    async actual(paseo) {
      const f = filas((await c.from('ubicacion_en_vivo').select('*').eq('paseo_id', paseo).retry(false)) as Respuesta)[0]
      if (!f) return null
      const lat = numero(f.lat)
      const lng = numero(f.lng)
      const en = Date.parse(String(f.en ?? ''))
      return lat === null || lng === null || !Number.isFinite(en) ? null : { pos: [lat, lng], precisionM: numero(f.precision_m), en }
    },
    async sospechas() {
      return filas((await c.from('fotos_sospechas').select('*').order('calculada_en', { ascending: false }).limit(200).retry(false)) as Respuesta)
    },
  }
}
