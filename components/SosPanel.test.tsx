import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { SosPanel } from './SosPanel'

const base = {
  perro: 'Max',
  paseador: 'Carlos',
  posicion: null,
  ubicacion: 'sin' as const,
}
const contacto = { nombre: 'Contacto X', telefono: '+51987654321' }

const html = (p: Partial<React.ComponentProps<typeof SosPanel>> = {}) =>
  renderToStaticMarkup(<SosPanel {...base} quien="dueno" distrito="San Isidro" emergencia={null} {...p} />)

describe('SosPanel: qué sale en pantalla', () => {
  it('el SOS del DUEÑO no muestra su contacto de emergencia, aunque exista', () => {
    const h = html({ quien: 'dueno', emergencia: contacto })
    expect(h).not.toContain('Contacto X')
    expect(h).not.toContain('Contacto del dueño')
    expect(h).not.toContain('987654321')
  })

  it('el SOS del PASEADOR lo muestra como «Contacto del dueño», con llamar y WhatsApp', () => {
    const h = html({ quien: 'paseador', emergencia: contacto })
    expect(h).toContain('Contacto del dueño')
    expect(h).toContain('Contacto X')
    expect(h).toContain('tel:+51987654321')
    expect(h).toContain('https://wa.me/51987654321')
  })

  it('si el dueño no dejó contacto, el paseador lo lee y se le manda al chat', () => {
    const h = html({ quien: 'paseador', emergencia: null })
    expect(h).toContain('El dueño no dejó un contacto')
  })

  it('el orden es: pasos → serenazgo → emergencias → Patitas → contacto del dueño', () => {
    const h = html({ quien: 'paseador', emergencia: contacto })
    const orden = ['Qué hacer, en orden', 'Serenazgo', 'Emergencias', 'Patitas', 'Contacto del dueño'].map((t) => h.indexOf(t))
    expect(orden.every((i) => i >= 0)).toBe(true)
    expect([...orden].sort((a, b) => a - b)).toEqual(orden)
  })

  it('con el distrito conocido muestra solo ese serenazgo; sin distrito, los dos', () => {
    const uno = html({ distrito: 'Jesús María' })
    expect(uno).toContain('Serenazgo de Jesús María')
    expect(uno).not.toContain('Serenazgo de San Isidro')
    const dos = html({ distrito: null })
    expect(dos).toContain('Serenazgo de San Isidro')
    expect(dos).toContain('Serenazgo de Jesús María')
  })

  it('con la config real (vacía) dice «Falta configurar» en el serenazgo y en Patitas; no queda muda', () => {
    const h = html()
    expect(h).toContain('Falta configurar')
    expect(h).toContain('Falta configurar el contacto de Patitas')
  })

  it('muestra Policía 105, Bomberos 116 y SAMU 106 como botones para llamar', () => {
    const h = html()
    expect(h).toContain('tel:105')
    expect(h).toContain('tel:116')
    expect(h).toContain('tel:106')
  })

  it('no promete atención a toda hora ni usa palabras prohibidas', () => {
    for (const quien of ['dueno', 'paseador'] as const) {
      const h = html({ quien, emergencia: contacto })
      expect(h).not.toMatch(/24 ?\/ ?7|garantiz|\bseguro\b|siempre responde/i)
      expect(h).not.toMatch(/veterinaria[s]? 24/i)
    }
  })
})
