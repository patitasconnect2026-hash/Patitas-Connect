import { describe, expect, it } from 'vitest'
import {
  actualizarPago,
  agregarPago,
  debeLaFamilia,
  intentarPago,
  noEncontrados,
  normalizarPago,
  normalizarPagos,
  nuevoPago,
  pagoDe,
  pagoPendiente,
  plazoDePagoVencido,
  porPagarAlPaseador,
  resumenDelPaseador,
  sincronizarPaseo,
  sinPagar,
  type Pago,
} from './pagos'
import type { EstadoPaseo } from './paseo'

const T0 = Date.UTC(2026, 9, 10, 15, 0, 0)
const MIN = 60_000
const HORA = 60 * MIN

const crear = (id = 'job-1', paseo: EstadoPaseo = 'cerrado', walkerId = 'nuevo-PAT-AB12'): Pago =>
  nuevoPago({
    jobId: id,
    walkerId,
    paseador: 'Lucía',
    dueno: 'Valeria',
    perro: 'Max',
    cuando: 'Hoy · 10:00 am',
    reserva: { walkPrice: 25, discount: 0, total: 25, comision: 5, neto: 20 },
    at: T0,
    paseo,
  })

const ok = (p: Pago, a: Parameters<typeof intentarPago>[1], q: Parameters<typeof intentarPago>[2], at: number, d?: Parameters<typeof intentarPago>[4]): Pago => {
  const r = intentarPago(p, a, q, at, d)
  if (!r.ok) throw new Error(r.motivo)
  return r.pago
}

describe('un pago nuevo guarda la foto de los montos de la reserva', () => {
  it('sin pagar, con lo que paga la familia, la comisión y lo que recibe el paseador', () => {
    const p = crear()
    expect(p.estado).toBe('sin_pagar')
    expect([p.monto, p.comision, p.neto]).toEqual([25, 5, 20])
  })

  it('no se pierde si ya existe uno del mismo paseo', () => {
    const a = crear()
    const dos = agregarPago([a], { ...crear(), monto: 99 })
    expect(dos).toHaveLength(1)
    expect(dos[0].monto).toBe(25)
  })
})

describe('el pago es AL FINAL del paseo: el paseador ve el pago y el equipo paga', () => {
  it('sin_pagar → «Vi el pago» (paseador) → «Pagado al paseador» (equipo)', () => {
    let p = crear()
    p = ok(p, 'ver_pago', 'paseador', T0 + HORA, { hora: '10:42' })
    expect(p.estado).toBe('visto')
    expect(p.vistoAt).toBe(T0 + HORA)
    expect(p.horaPago).toBe('10:42')
    p = ok(p, 'pagar_al_paseador', 'equipo', T0 + 2 * HORA)
    expect(p.estado).toBe('pagado_paseador')
    expect(p.pagadoPaseadorAt).toBe(T0 + 2 * HORA)
  })

  it('«Vi el pago» solo existe cuando el paseo ya terminó (entregado o cerrado): antes no se paga', () => {
    for (const paseo of ['solicitado', 'aceptado', 'en_camino', 'en_paseo', 'en_disputa', 'rechazado', 'expirado', 'cancelado'] as const) {
      const r = intentarPago(crear('j', paseo), 'ver_pago', 'paseador', T0)
      expect(r.ok, paseo).toBe(false)
    }
    for (const paseo of ['entregado', 'cerrado'] as const) expect(intentarPago(crear('j', paseo), 'ver_pago', 'paseador', T0).ok, paseo).toBe(true)
  })

  it('la familia y el equipo no pueden decir «Vi el pago»; el paseador no puede pagarse solo', () => {
    expect(intentarPago(crear(), 'ver_pago', 'equipo', T0).ok).toBe(false)
    const visto = ok(crear(), 'ver_pago', 'paseador', T0)
    expect(intentarPago(visto, 'pagar_al_paseador', 'paseador', T0).ok).toBe(false)
  })

  it('mientras el equipo no lo confirme, no se le paga al paseador: no se paga desde «sin pagar»', () => {
    const r = intentarPago(crear(), 'pagar_al_paseador', 'equipo', T0)
    expect(r.ok).toBe(false)
  })

  it('«No lo encuentro» pide una nota; el paseador puede volver a ver el pago y el equipo puede pagarlo si aparece', () => {
    const visto = ok(crear(), 'ver_pago', 'paseador', T0)
    expect(intentarPago(visto, 'no_encontrado', 'equipo', T0 + MIN).ok).toBe(false)
    expect(intentarPago(visto, 'no_encontrado', 'equipo', T0 + MIN, { nota: 'ab' }).ok).toBe(false)
    const perdido = ok(visto, 'no_encontrado', 'equipo', T0 + MIN, { nota: 'No llegó a la cuenta de Yape' })
    expect(perdido.estado).toBe('no_encontrado')
    expect(perdido.nota).toBe('No llegó a la cuenta de Yape')
    expect(ok(perdido, 'ver_pago', 'paseador', T0 + 2 * MIN).nota).toBeUndefined()
    expect(ok(perdido, 'pagar_al_paseador', 'equipo', T0 + 2 * MIN).estado).toBe('pagado_paseador')
  })

  it('no hay devolución ni «Ya pagué»: esas acciones ya no existen', () => {
    for (const a of ['declarar', 'verificar', 'devolver'] as const) {
      const r = intentarPago(crear(), a as unknown as 'ver_pago', 'equipo', T0)
      expect(r.ok, a).toBe(false)
    }
  })

  it('la hora que anota el paseador se recorta a 20 letras', () => {
    const p = ok(crear(), 'ver_pago', 'paseador', T0, { hora: 'x'.repeat(50) })
    expect(p.horaPago).toHaveLength(20)
  })
})

describe('quién debe pagar y cuándo no se puede reservar otro paseo', () => {
  it('debe la familia solo cuando el paseo terminó y todavía no se mostró el pago', () => {
    expect(debeLaFamilia(crear('j', 'en_paseo'))).toBe(false)
    expect(debeLaFamilia(crear('j', 'entregado'))).toBe(true)
    expect(debeLaFamilia(crear('j', 'cerrado'))).toBe(true)
    expect(debeLaFamilia(ok(crear(), 'ver_pago', 'paseador', T0))).toBe(false)
    expect(debeLaFamilia(null)).toBe(false)
  })

  it('un paseo que no se hizo no deja nada que pagar', () => {
    for (const paseo of ['rechazado', 'expirado', 'cancelado'] as const) {
      expect(debeLaFamilia(crear('j', paseo)), paseo).toBe(false)
      expect(pagoPendiente([crear('j', paseo)]), paseo).toBeNull()
    }
  })

  it('con un paseo sin pagar hay un pago pendiente (no se reserva otro); sin deudas, no', () => {
    const lista = [crear('a', 'en_paseo'), crear('b', 'cerrado')]
    expect(pagoPendiente(lista)?.id).toBe('b')
    expect(pagoPendiente([crear('a', 'en_paseo')])).toBeNull()
    expect(pagoPendiente([ok(crear('b'), 'ver_pago', 'paseador', T0)])).toBeNull()
    expect(pagoPendiente([])).toBeNull()
  })

  it('el plazo de pago corre desde que terminó el paseo y solo es un recordatorio', () => {
    const p = { ...crear(), hechoAt: T0 }
    expect(plazoDePagoVencido(p, T0 + 23 * HORA, 24)).toBe(false)
    expect(plazoDePagoVencido(p, T0 + 24 * HORA, 24)).toBe(true)
    expect(plazoDePagoVencido(crear(), T0 + 99 * HORA, 24)).toBe(false) // sin hora de término no hay plazo
    expect(plazoDePagoVencido(ok(p, 'ver_pago', 'paseador', T0), T0 + 99 * HORA, 24)).toBe(false)
    expect(plazoDePagoVencido(p, 0, 24)).toBe(false)
  })
})

describe('el libro de pagos', () => {
  it('encuentra un pago por paseo y no falla con null', () => {
    const l = [crear('a'), crear('b')]
    expect(pagoDe(l, 'b')?.id).toBe('b')
    expect(pagoDe(l, 'zz')).toBeNull()
    expect(pagoDe(l, null)).toBeNull()
  })

  it('actualizar sin cambio devuelve la misma lista', () => {
    const l = [crear('a')]
    expect(actualizarPago(l, 'a', (p) => p)).toBe(l)
    expect(actualizarPago(l, 'zz', (p) => ({ ...p, monto: 1 }))).toBe(l)
  })

  it('sincronizar anota cómo va el paseo y la hora en que terminó (una sola vez)', () => {
    const l = [crear('a', 'en_paseo')]
    const a = sincronizarPaseo(l, 'a', 'entregado', T0 + 5 * MIN)
    expect(a[0].paseo).toBe('entregado')
    expect(a[0].hechoAt).toBe(T0 + 5 * MIN)
    const b = sincronizarPaseo(a, 'a', 'cerrado', T0 + 9 * MIN)
    expect(b[0].paseo).toBe('cerrado')
    expect(b[0].hechoAt).toBe(T0 + 5 * MIN)
    expect(sincronizarPaseo(b, 'a', 'cerrado', T0 + 20 * MIN)).toBe(b)
  })

  it('«por pagar», «no encontrados» y «falta que la familia pague» se arman del estado', () => {
    const visto = ok(crear('v'), 'ver_pago', 'paseador', T0 + MIN)
    const perdido = ok(ok(crear('p'), 'ver_pago', 'paseador', T0), 'no_encontrado', 'equipo', T0 + MIN, { nota: 'No aparece' })
    const debe = { ...crear('d'), hechoAt: T0 }
    const todos = [visto, perdido, debe, crear('x', 'en_paseo')]
    expect(porPagarAlPaseador(todos).map((p) => p.id)).toEqual(['v'])
    expect(noEncontrados(todos).map((p) => p.id)).toEqual(['p'])
    expect(sinPagar(todos).map((p) => p.id)).toEqual(['d'])
  })

  it('el resumen del paseador separa lo recibido y lo que le toca, y ignora paseos que no se hicieron', () => {
    const w = 'nuevo-PAT-AB12'
    const pagado = ok(ok(crear('a', 'cerrado', w), 'ver_pago', 'paseador', T0), 'pagar_al_paseador', 'equipo', T0 + MIN)
    const visto = ok(crear('b', 'cerrado', w), 'ver_pago', 'paseador', T0)
    const cancelado = { ...crear('c', 'cancelado', w), estado: 'visto' as const }
    const sinVer = crear('d', 'cerrado', w)
    const ajeno = ok(crear('e', 'cerrado', 'otro'), 'ver_pago', 'paseador', T0)
    expect(resumenDelPaseador([pagado, visto, cancelado, sinVer, ajeno], w)).toEqual({ recibido: 20, porRecibir: 20, pagos: 1 })
  })
})

describe('los datos guardados de cuando el pago era antes del paseo se leen sin romperse', () => {
  const viejo = (estado: string, paseo: string, extra: Record<string, unknown> = {}) => ({
    id: 'j', walkerId: 'w', paseador: 'Lucía', dueno: 'Valeria', perro: 'Max', cuando: 'Hoy', monto: 25, comision: 5, neto: 20, creado: T0, estado, paseo, ...extra,
  })

  it('«en revisión» y «devuelto» vuelven a «sin pagar»; «verificado» de un paseo hecho pasa a «visto»', () => {
    expect(normalizarPago(viejo('en_revision', 'aceptado', { metodo: 'yape', image: 'data:x' }))?.estado).toBe('sin_pagar')
    expect(normalizarPago(viejo('devuelto', 'cancelado'))?.estado).toBe('sin_pagar')
    expect(normalizarPago(viejo('verificado', 'en_paseo'))?.estado).toBe('sin_pagar')
    const v = normalizarPago(viejo('verificado', 'cerrado', { verificadoAt: T0 + 5 }))
    expect(v?.estado).toBe('visto')
    expect(v?.vistoAt).toBe(T0 + 5)
  })

  it('deja los estados nuevos como están y suelta lo viejo (captura, método)', () => {
    const p = normalizarPago(viejo('pagado_paseador', 'cerrado', { pagadoPaseadorAt: T0, image: 'data:x', metodo: 'yape' }))
    expect(p?.estado).toBe('pagado_paseador')
    expect(p).not.toHaveProperty('image')
    expect(p).not.toHaveProperty('metodo')
  })

  it('lo que no es un pago se descarta y una lista rota es una lista vacía', () => {
    expect(normalizarPagos('nada')).toEqual([])
    expect(normalizarPagos([null, 3, { id: 'x' }, viejo('sin_pagar', 'cerrado')])).toHaveLength(1)
  })
})
