/**
 * «Pedir paseo» con el servidor (Bloque 2): `ClientePedidos` armado sobre el cliente de Supabase. Todo con la sesión de la persona;
 * las reglas (quién ve qué, topes, un pedido por familia, un paseador sin paseo a esa hora) las pone la base. Un «no» de las reglas
 * llega como respuesta con `motivo` (no como error de red).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { datos, filas, type Respuesta } from './clientePaseos'
import type { FilaCruda } from './paseosTipos'

export interface ArgsCrearPedido {
  id: string
  perroId: string | null
  perro: Record<string, unknown>
  dueno: string
  horario: string
  inicio: string
  duracion: number
  tamano: string
  lat: number
  lng: number
  parques: string[]
  monto: number
  vidaMin: number
}

export type RespuestaDeRegla<K extends string> = ({ [P in K]: true } & { repetido?: boolean; motivo?: undefined }) | ({ [P in K]: false } & { motivo: string })

export interface ClientePedidos {
  crear(a: ArgsCrearPedido): Promise<RespuestaDeRegla<'creado'>>
  cancelar(id: string): Promise<void>
  /** Mi pedido más reciente (si hay), sus ofertas y los números. */
  miPedido(): Promise<{ pedido: FilaCruda | null; ofertas: FilaCruda[]; vistos: number; disponibles: number }>
  /** Pedidos abiertos de MI zona (paseador): solo lo que la base le deja ver. */
  abiertos(): Promise<FilaCruda[]>
  ofertar(pedido: string, monto: number): Promise<RespuestaDeRegla<'ofertado'>>
  elegir(oferta: string, paseo: string): Promise<RespuestaDeRegla<'elegido'>>
  /** Mis ofertas (paseador) que ya no valen porque la familia eligió a otra persona o venció. */
  misOfertasCerradas(): Promise<FilaCruda[]>
}

const objeto = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const numero = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

export function envolverClientePedidos(c: SupabaseClient): ClientePedidos {
  return {
    async crear(a) {
      const r = objeto(
        datos(
          (await c.rpc('crear_pedido', {
            p_id: a.id,
            p_perro_id: a.perroId,
            p_perro: a.perro,
            p_dueno: a.dueno,
            p_horario: a.horario,
            p_inicio: a.inicio,
            p_duracion: a.duracion,
            p_tamano: a.tamano,
            p_lat: a.lat,
            p_lng: a.lng,
            p_parques: a.parques,
            p_monto: a.monto,
            p_vida_min: a.vidaMin,
          })) as Respuesta,
        ),
      )
      return r.creado === true ? { creado: true, ...(r.repetido === true ? { repetido: true } : {}) } : { creado: false, motivo: String(r.motivo ?? 'otro') }
    },
    async cancelar(id) {
      datos((await c.rpc('cancelar_pedido', { p_pedido: id })) as Respuesta)
    },
    async miPedido() {
      const ps = filas((await c.from('pedidos').select('*').order('creado_en', { ascending: false }).limit(1).retry(false)) as Respuesta)
      const pedido = ps[0] ?? null
      if (!pedido) return { pedido: null, ofertas: [], vistos: 0, disponibles: 0 }
      const id = String(pedido.id)
      const [ofertas, cont] = await Promise.all([
        (async () => filas((await c.from('ofertas').select('*').eq('pedido_id', id).order('creado_en', { ascending: true }).retry(false)) as Respuesta))(),
        (async () => objeto(datos((await c.rpc('contadores_pedido', { p_pedido: id })) as Respuesta)))(),
      ])
      return { pedido, ofertas, vistos: numero(cont.vistos), disponibles: numero(cont.disponibles) }
    },
    async abiertos() {
      const d = datos((await c.rpc('pedidos_abiertos')) as Respuesta)
      return Array.isArray(d) ? (d as FilaCruda[]) : []
    },
    async ofertar(pedido, monto) {
      const r = objeto(datos((await c.rpc('ofertar', { p_pedido: pedido, p_monto: monto })) as Respuesta))
      return r.ofertado === true ? { ofertado: true } : { ofertado: false, motivo: String(r.motivo ?? 'otro') }
    },
    async elegir(oferta, paseo) {
      const r = objeto(datos((await c.rpc('elegir_oferta', { p_oferta: oferta, p_paseo: paseo })) as Respuesta))
      return r.elegido === true ? { elegido: true, ...(r.repetido === true ? { repetido: true } : {}) } : { elegido: false, motivo: String(r.motivo ?? 'otro') }
    },
    async misOfertasCerradas() {
      return filas((await c.from('ofertas').select('*').eq('estado', 'descartada').order('creado_en', { ascending: false }).limit(10).retry(false)) as Respuesta)
    },
  }
}
