import { afterEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CONFIG, type Config } from '@/lib/config'
import { nuevoPago, type EstadoPago, type Pago } from '@/lib/pagos'
import { CobroDelEquipo, PagoCard } from './PagoCard'

const original: Config['cobroEquipo'] = { ...CONFIG.cobroEquipo }
afterEach(() => {
  CONFIG.cobroEquipo = { ...original }
})

const T0 = Date.UTC(2026, 9, 10, 15, 0, 0)
const pago = (estado: EstadoPago = 'sin_pagar', extra: Partial<Pago> = {}): Pago => ({
  ...nuevoPago({
    jobId: 'j1',
    walkerId: 'nuevo-PAT-AB12',
    paseador: 'Lucía',
    dueno: 'Valeria',
    perro: 'Max',
    cuando: 'Hoy · 10:00 am',
    reserva: { walkPrice: 25, discount: 0, total: 25, comision: 5, neto: 20 },
    at: T0,
    paseo: 'cerrado',
  }),
  estado,
  ...extra,
})
const card = (p: Pago | null, extra: Partial<Parameters<typeof PagoCard>[0]> = {}) =>
  renderToStaticMarkup(<PagoCard pago={p} monto={25} paseador="Lucía" demo={false} hecho plazoVencido={false} onSimularVisto={() => {}} onReportar={() => {}} {...extra} />)
const configurar = () => {
  CONFIG.cobroEquipo = { titular: 'Equipo Patitas Piloto', yape: '987 654 321', plin: '912 345 678', cuenta: '002-193-001234567890-12', qr: '' }
}

describe('el equipo todavía no configuró el medio de cobro', () => {
  it('lo dice y no inventa ningún número', () => {
    const h = renderToStaticMarkup(<CobroDelEquipo />)
    expect(h).toContain('Falta configurar el medio de cobro.')
    expect(h).toContain('Aún no puedes pagar.')
    expect(h).not.toMatch(/\d{3} \d{3} \d{3}/)
  })

  it('en la tarjeta de pago dice «Falta configurar» y no queda muda', () => {
    const h = card(pago())
    expect(h).toContain('Falta configurar el medio de cobro.')
    expect(h).toContain('Paga a Patitas')
  })

  it('en la demostración se puede simular que el paseador vio el pago (marcado «demostración»)', () => {
    expect(card(pago(), { demo: true })).toContain('Simular que Lucía vio el pago · demostración')
    expect(card(pago())).not.toContain('Simular que')
  })
})

describe('con el medio de cobro configurado', () => {
  it('muestra a dónde pagar, el NOMBRE de la cuenta bien a la vista, el monto y qué hacer', () => {
    configurar()
    const h = card(pago())
    expect(h).toContain('987 654 321')
    expect(h).toContain('912 345 678')
    expect(h).toContain('Cuenta a nombre de')
    expect(h).toContain('Equipo Patitas Piloto')
    expect(h).toContain('S/ 25.00')
    expect(h).toContain('Paga a Patitas y muéstrale el pago a Lucía.')
  })

  it('sin el nombre de la cuenta dice «Falta configurar» (no se inventa)', () => {
    CONFIG.cobroEquipo = { titular: '', yape: '987 654 321', plin: '', cuenta: '', qr: '' }
    expect(renderToStaticMarkup(<CobroDelEquipo />)).toContain('Falta configurar el nombre de la cuenta.')
  })

  it('el pago NO tiene «Ya pagué», ni captura, ni elegir cómo pagó: se muestra el pago al paseador', () => {
    configurar()
    const h = card(pago())
    expect(h).not.toMatch(/Ya pagué|Adjuntar captura|¿Con qué pagaste|no sale hasta|verifique/)
  })
})

describe('el recorrido del pago visto por la familia', () => {
  it('antes de terminar el paseo no hay a dónde pagar', () => {
    configurar()
    const h = card(pago('sin_pagar', { paseo: 'en_paseo' }), { hecho: false })
    expect(h).toContain('Pagas al terminar el paseo.')
    expect(h).not.toContain('987 654 321')
  })

  it('después de «Recibí», con el paseo hecho, aparece cómo pagar y que no puede reservar otro hasta pagar', () => {
    configurar()
    const h = card(pago())
    expect(h).toContain('987 654 321')
    expect(h).toContain('No puedes reservar otro paseo hasta pagar este.')
  })

  it('pasado el plazo, un recordatorio suave', () => {
    configurar()
    expect(card(pago(), { plazoVencido: true })).toContain('Pasó el plazo de 24 horas. Paga cuando puedas.')
    expect(card(pago(), { plazoVencido: false })).not.toContain('Pasó el plazo')
  })

  it('cuando el paseador vio el pago ya no pide pagar y dice cuándo se le paga', () => {
    configurar()
    const h = card(pago('visto', { vistoAt: T0 }))
    expect(h).toContain('Lucía vio tu pago')
    expect(h).toContain('después de confirmarlo en su cuenta')
    expect(h).not.toContain('987 654 321')
    expect(h).not.toContain('No puedes reservar')
  })

  it('«No encontramos tu pago» muestra la nota del equipo y «Reportar problema»', () => {
    configurar()
    const h = card(pago('no_encontrado', { nota: 'No llegó a Yape' }))
    expect(h).toContain('No encontramos tu pago')
    expect(h).toContain('Nota del equipo: No llegó a Yape')
    expect(h).toContain('Reportar problema')
  })

  it('pagado al paseador', () => {
    expect(card(pago('pagado_paseador'))).toContain('Paseador pagado')
  })

  it('si el paseo no se hizo no hay nada que pagar', () => {
    configurar()
    const h = card(pago('sin_pagar', { paseo: 'cancelado' }), { paseoNoOcurrio: true })
    expect(h).toContain('No hace falta pagar')
    expect(h).not.toContain('987 654 321')
  })

  it('el «Ver más» cuenta el camino completo sin decir que se paga antes', () => {
    const h = card(pago())
    expect(h).toContain('Cómo funciona el pago')
    expect(h).not.toMatch(/antes del paseo|verific/i)
  })
})
