import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { intentarPago, nuevoPago, type Pago } from '@/lib/pagos'
import { EMPTY_APP, type WalkerApplication } from '@/lib/walkerStore'
import { PanelDePagos } from './ColaDePagos'

const T0 = Date.UTC(2026, 9, 10, 15, 0, 0)
const MIN = 60_000
const crear = (id: string, walkerId: string, p: Partial<Pago> = {}): Pago => ({
  ...nuevoPago({
    jobId: id,
    walkerId,
    paseador: 'Lucía',
    dueno: 'Valeria',
    perro: 'Max',
    cuando: 'Hoy · 10:00 am',
    reserva: { walkPrice: 25, discount: 0, total: 25, comision: 5, neto: 20 },
    at: T0,
    paseo: 'cerrado',
  }),
  ...p,
})
const ok = (p: Pago, a: Parameters<typeof intentarPago>[1], q: Parameters<typeof intentarPago>[2], at: number, d?: Parameters<typeof intentarPago>[4]): Pago => {
  const r = intentarPago(p, a, q, at, d)
  if (!r.ok) throw new Error(r.motivo)
  return r.pago
}
const postulacion: WalkerApplication = {
  ...EMPTY_APP,
  code: 'PAT-AB12',
  cobro: { metodo: 'plin', telefono: '912 345 678', titular: 'Lucía Quispe' },
}
const panel = (pagos: Pago[], app: WalkerApplication | null = postulacion) =>
  renderToStaticMarkup(<PanelDePagos pagos={pagos} postulacion={app} onAccion={() => ({ ok: false, motivo: 'x' })} />)

describe('/admin: pagos al final del paseo', () => {
  it('sin pagos: las tres listas dicen que no hay nada', () => {
    const h = panel([])
    expect(h).toContain('No hay pagos por pagar.')
    expect(h).toContain('No hay pagos sin encontrar.')
    expect(h).toContain('Ninguna familia debe un paseo.')
    expect(h).not.toMatch(/por verificar|por devolver|Marcar «Verificado»|Devuelto/i)
  })

  it('por pagar al paseador: monto, comisión y neto, con «Pagado al paseador» y «No lo encuentro»', () => {
    const p = ok(crear('a', 'nuevo-PAT-AB12'), 'ver_pago', 'paseador', T0 + MIN, { hora: '10:42' })
    const h = panel([p])
    expect(h).toContain('Por pagar al paseador')
    expect(h).toContain('S/ 25.00')
    expect(h).toContain('S/ 5.00')
    expect(h).toContain('S/ 20.00')
    expect(h).toContain('El paseador vio el pago')
    expect(h).toContain('hora anotada: 10:42')
    expect(h).toContain('Mira en TU cuenta que el dinero llegó.')
    expect(h).toContain('Marcar «Pagado al paseador»')
    expect(h).toContain('No lo encuentro')
    expect(h).toContain('Nota del equipo (obligatoria)')
    expect(h).not.toContain('..')
  })

  it('muestra el Yape o Plin y el titular del paseador (solo para el equipo)', () => {
    const p = ok(crear('b', 'nuevo-PAT-AB12'), 'ver_pago', 'paseador', T0 + MIN)
    const h = panel([p])
    expect(h).toContain('Plin')
    expect(h).toContain('+51912345678')
    expect(h).toContain('Lucía Quispe')
  })

  it('un paseador sin Yape ni Plin: el botón queda apagado y lo explica', () => {
    const p = ok(crear('c', 'nuevo-PAT-AB12'), 'ver_pago', 'paseador', T0 + MIN)
    const h = panel([p], { ...postulacion, cobro: { metodo: 'yape', telefono: '', titular: '' } })
    expect(h).toContain('Falta el Yape o Plin del paseador.')
    expect(h).toContain('No se puede marcar pagado sin su Yape o Plin.')
    expect(h).toMatch(/<button[^>]*disabled[^>]*>Marcar «Pagado al paseador»/)
  })

  it('un paseador de ejemplo: «no tiene cuenta real» y todo marcado «Demostración»', () => {
    const p = ok(crear('d', 'carlos', { demo: true }), 'ver_pago', 'paseador', T0 + MIN)
    const h = panel([p], null)
    expect(h).toContain('Paseador de ejemplo: no tiene cuenta real.')
    expect(h).toContain('Demostración: no es plata real.')
  })

  it('sin que el paseador vea el pago no hay nada por pagar: aparece en «Falta que la familia pague»', () => {
    const h = panel([crear('e', 'nuevo-PAT-AB12', { hechoAt: T0 })])
    expect(h).toContain('No hay pagos por pagar.')
    expect(h).toContain('Falta que la familia pague')
    expect(h).toContain('Valeria aún no mostró el pago.')
  })

  it('«No encontrados» muestra la nota y se puede pagar si aparece', () => {
    const p = ok(ok(crear('f', 'nuevo-PAT-AB12'), 'ver_pago', 'paseador', T0), 'no_encontrado', 'equipo', T0 + MIN, { nota: 'No llegó a Plin' })
    const h = panel([p])
    expect(h).toContain('No encontrados')
    expect(h).toContain('No llegó a Plin')
    expect(h).toContain('Ya lo encontré')
  })

  it('el historial lista lo ya pagado al paseador con su desglose', () => {
    const p = ok(ok(crear('g', 'nuevo-PAT-AB12'), 'ver_pago', 'paseador', T0), 'pagar_al_paseador', 'equipo', T0 + MIN)
    const h = panel([p])
    expect(h).toContain('Historial (1)')
    expect(h).toContain('pagado al paseador S/ 20.00')
    expect(h).toContain('Paga la familia S/ 25.00')
  })

  it('«Mostrar ejemplos» apagado oculta los pagos de paseadores de ejemplo', () => {
    const p = ok(crear('h', 'carlos', { demo: true }), 'ver_pago', 'paseador', T0)
    const h = renderToStaticMarkup(<PanelDePagos pagos={[p]} postulacion={null} mostrarEjemplos={false} onAccion={() => ({ ok: false, motivo: 'x' })} />)
    expect(h).toContain('No hay pagos por pagar.')
  })

  it('explica que todo se hace a mano, que no se paga hasta confirmar en la cuenta del equipo y lee la comisión de la configuración', () => {
    const h = panel([])
    expect(h).toContain('La app no mueve dinero')
    expect(h).toContain('Mientras no lo confirmes en tu cuenta, no se le paga.')
    expect(h).toContain('Patitas cobra una comisión del 20 % de cada paseo.')
  })

  it('con servidor: el Yape o Plin sale de la base (solo la ve el equipo) aunque la postulación del navegador sea de otra persona', () => {
    const p = ok(crear('i', 'bbbbbbbb-0000-4000-8000-000000000001'), 'ver_pago', 'paseador', T0 + MIN)
    const h = renderToStaticMarkup(
      <PanelDePagos pagos={[p]} postulacion={null} cobros={{ 'bbbbbbbb-0000-4000-8000-000000000001': { metodo: 'yape', telefono: '987111222', titular: 'Lucía Quispe' } }} onAccion={() => ({ ok: false, motivo: 'x' })} />,
    )
    expect(h).toContain('Yape')
    expect(h).toContain('+51987111222')
    expect(h).toContain('Lucía Quispe')
    expect(h).not.toContain('Falta el Yape o Plin del paseador.')
  })

  it('con servidor y sin Yape ni Plin en la base: no se puede marcar pagado', () => {
    const p = ok(crear('j', 'bbbbbbbb-0000-4000-8000-000000000001'), 'ver_pago', 'paseador', T0 + MIN)
    const h = renderToStaticMarkup(<PanelDePagos pagos={[p]} postulacion={null} cobros={{}} onAccion={() => ({ ok: false, motivo: 'x' })} />)
    expect(h).toContain('Falta el Yape o Plin del paseador.')
    expect(h).toMatch(/<button[^>]*disabled[^>]*>Marcar «Pagado al paseador»/)
  })

  it('con una acción esperando a la base: dice «Enviando…» y apaga «No lo encuentro»; sin internet, que todavía NO está marcado', () => {
    const p = ok(crear('k', 'nuevo-PAT-AB12'), 'ver_pago', 'paseador', T0 + MIN)
    const enviando = renderToStaticMarkup(<PanelDePagos pagos={[p]} postulacion={postulacion} enCola={['k']} onAccion={() => ({ ok: false, motivo: 'x' })} />)
    expect(enviando).toContain('Enviando…')
    expect(enviando).toMatch(/<button[^>]*\sdisabled=""[^>]*>No lo encuentro/)
    const sinRed = renderToStaticMarkup(<PanelDePagos pagos={[p]} postulacion={postulacion} enCola={['k']} sinConexion onAccion={() => ({ ok: false, motivo: 'x' })} />)
    expect(sinRed).toContain('Sin conexión. Todavía NO está marcado.')
    // Sin nada en espera, no hay aviso.
    expect(panel([p])).not.toContain('Enviando…')
  })
})
