import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { nuevoPago, type Pago } from '@/lib/pagos'
import { TEXTO_PAGO_SERVIDOR } from '@/lib/servidor/paseosTextos'
import { CobroDelPaseo } from './CobroDelPaseo'

const pago: Pago = nuevoPago({
  jobId: 'j-1',
  walkerId: 'lucia',
  paseador: 'Lucía',
  dueno: 'Valeria',
  perro: 'Max',
  cuando: 'Hoy · 10:00 am',
  reserva: { walkPrice: 25, discount: 0, total: 25, comision: 5, neto: 20 },
  at: Date.UTC(2026, 9, 10, 15, 0, 0),
  paseo: 'entregado',
})
const vista = (p: Partial<Parameters<typeof CobroDelPaseo>[0]> = {}) =>
  renderToStaticMarkup(<CobroDelPaseo pago={pago} dueno="Valeria" onVi={() => undefined} onReportar={() => undefined} {...p} />)

describe('«Cobro del paseo» del paseador', () => {
  it('normal: el botón dice «Vi el pago» y no hay avisos de envío', () => {
    const h = vista()
    expect(h).toContain('Vi el pago')
    expect(h).not.toContain(TEXTO_PAGO_SERVIDOR.enviando)
    expect(h).not.toContain('role="alert"')
  })

  it('con servidor, mientras la base contesta: botón apagado que dice «Enviando…»', () => {
    const h = vista({ enviando: true })
    expect(h).toContain(TEXTO_PAGO_SERVIDOR.enviando)
    expect(h).toMatch(/<button[^>]*\sdisabled=""[^>]*>.*Enviando…/)
    expect(h).not.toContain('Listo')
  })

  it('sin internet: dice que el aviso todavía no llegó y que NO se marcó nada', () => {
    const h = vista({ enviando: true, sinConexion: true })
    expect(h).toContain(TEXTO_PAGO_SERVIDOR.sinConexionVi)
    expect(h).toContain('todavía no llegó')
  })

  it('si la base dijo que no, se explica con una frase y se puede volver a intentar', () => {
    const h = vista({ error: TEXTO_PAGO_SERVIDOR.paseoNoTermino })
    expect(h).toContain(TEXTO_PAGO_SERVIDOR.paseoNoTermino)
    expect(h).toContain('role="alert"')
    expect(h).not.toMatch(/<button[^>]*\sdisabled=""/)
  })

  it('cuando la base confirmó («visto»), ya no hay botón: dice que Patitas le paga después de confirmar', () => {
    const h = vista({ pago: { ...pago, estado: 'visto', vistoAt: 1 } })
    expect(h).toContain('después de confirmar el pago en su cuenta')
    expect(h).not.toContain('Enviando')
  })
})
