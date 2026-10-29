/**
 * Los pagos del servidor (paso 7): de la fila de la base a lo que la app ya entiende (`Pago`, `CobroPaseador`) y al revés.
 * Funciones puras: no hablan con la base. Lo que llega de la red no se da por bueno: se lee con `normalizarPago`
 * (lib/pagos.ts), que descarta lo que no entiende.
 *
 * La tabla `pagos` guarda solo el REGISTRO (montos, estado y horas). Los nombres, el perro y el horario que muestra la
 * pantalla salen del paseo (`paseos`), que la app ya bajó: aquí se unen. La app no mueve dinero.
 */
import { normalizarPago, type Pago } from '../pagos'
import { celularDeCobro, cobroRegistrado, type CobroPaseador } from '../walkerStore'
import { cobroDeFila } from './paseadoresReales'
import type { FilaCobroNueva, FilaCruda } from './paseosTipos'

const texto = (v: unknown): string => (typeof v === 'string' ? v : '')
/** Una hora de la base («2026-10-14T…») en milisegundos; undefined si no hay o no se entiende. */
const ms = (v: unknown): number | undefined => {
  if (typeof v !== 'string' || v === '') return undefined
  const t = Date.parse(v)
  return Number.isFinite(t) ? t : undefined
}
/** Los montos son `numeric` en la base: según el camino llegan como número o como texto. */
const monto = (v: unknown): number | undefined => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  return Number.isFinite(n) ? n : undefined
}

function nombreDelPerro(paseo: FilaCruda | null | undefined): string {
  const p = paseo?.perro
  return p && typeof p === 'object' ? texto((p as Record<string, unknown>).name) : ''
}

/** El pago de una fila de `pagos`, con los nombres del paseo (si se conoce). null si la fila no se entiende. */
export function pagoDeFila(f: FilaCruda, paseo?: FilaCruda | null): Pago | null {
  return normalizarPago({
    id: texto(f.paseo_id),
    walkerId: texto(f.paseador_id),
    paseador: texto(paseo?.paseador_nombre),
    dueno: texto(paseo?.dueno_nombre),
    perro: nombreDelPerro(paseo),
    cuando: texto(paseo?.horario),
    monto: monto(f.monto),
    comision: monto(f.comision),
    neto: monto(f.neto),
    creado: ms(f.creado_en),
    estado: texto(f.estado),
    paseo: texto(f.paseo_estado),
    hechoAt: ms(f.hecho_en),
    vistoAt: ms(f.visto_en),
    horaPago: texto(f.hora_pago) || undefined,
    noEncontradoAt: ms(f.no_encontrado_en),
    pagadoPaseadorAt: ms(f.pagado_paseador_en),
    nota: texto(f.nota) || undefined,
    demo: f.demo === true,
  })
}

/** Los pagos que bajó la base, unidos a sus paseos. Una fila que no se entiende se descarta. */
export function pagosDeFilas(filas: readonly FilaCruda[], paseos: readonly FilaCruda[]): Pago[] {
  const porId = new Map(paseos.map((p) => [texto(p.id), p]))
  const lista: Pago[] = []
  for (const f of filas) {
    const p = pagoDeFila(f, porId.get(texto(f.paseo_id)))
    if (p) lista.push(p)
  }
  return lista
}

/** Dónde cobra cada paseador (por id), tal como lo entrega la base. Una fila incompleta no cuenta. */
export function cobrosDeFilas(filas: readonly FilaCruda[]): Record<string, CobroPaseador> {
  const mapa: Record<string, CobroPaseador> = {}
  for (const f of filas) {
    const id = texto(f.paseador_id)
    const c = cobroDeFila(f)
    if (id && c) mapa[id] = c
  }
  return mapa
}

/** La fila que se guarda en `cobros_paseador`. null si lo escrito no está completo (se pide y se valida antes). */
export function filaDeCobro(cobro: CobroPaseador | undefined, paseadorId: string): FilaCobroNueva | null {
  if (!cobro || !cobroRegistrado(cobro) || (cobro.metodo !== 'yape' && cobro.metodo !== 'plin')) return null
  return { paseador_id: paseadorId, metodo: cobro.metodo, celular: celularDeCobro(cobro), titular: cobro.titular.trim() }
}

/** ¿Es lo mismo? (para no volver a guardar lo que la base ya tiene) */
export function mismoCobro(a: CobroPaseador | undefined, b: CobroPaseador | undefined): boolean {
  return !!a && !!b && a.metodo === b.metodo && celularDeCobro(a) === celularDeCobro(b) && a.titular.trim() === b.titular.trim()
}
