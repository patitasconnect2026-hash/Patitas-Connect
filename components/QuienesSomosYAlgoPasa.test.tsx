import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CONFIG } from '@/lib/config'
import { filasEquipo } from '@/lib/equipoTextos'
import { QuienesSomosSheet } from './QuienesSomosSheet'
import { SafetyView } from './SafetyView'
import { SiAlgoPasaSheet } from './SiAlgoPasaSheet'

const quienes = () => renderToStaticMarkup(<QuienesSomosSheet onClose={() => undefined} />)
const algoPasa = (p: Partial<React.ComponentProps<typeof SiAlgoPasaSheet>> = {}) =>
  renderToStaticMarkup(<SiAlgoPasaSheet distrito={null} paseoEnCurso={false} onOpenSos={() => undefined} onClose={() => undefined} {...p} />)

describe('«Quiénes somos»', () => {
  it('lleva la etiqueta «Piloto» y dice cuántos estudiantes son, leyendo la lista del equipo', () => {
    const h = quienes()
    expect(h).toContain('Piloto')
    expect(h).toContain('Quiénes somos')
    expect(h).toContain(`Somos ${CONFIG.equipo.length} estudiantes.`)
  })

  it('cada integrante muestra su rol y su nombre configurado; si no hay nombre, «Falta configurar»', () => {
    const h = quienes()
    for (const f of filasEquipo()) {
      expect(h).toContain(f.rol)
      expect(h).toContain(f.nombre ?? 'Falta configurar')
    }
  })

  it('el contacto sale de la configuración: o los botones, o «Falta configurar el contacto de Patitas»', () => {
    const h = quienes()
    if (CONFIG.contactosAyuda.length === 0) expect(h).toContain('Falta configurar el contacto de Patitas')
    else expect(h).toMatch(/tel:|wa\.me/)
  })

  it('dice a quién se le paga y deja el detalle detrás de «Ver más»', () => {
    const h = quienes()
    expect(h).toContain('Pagas al terminar el paseo. Patitas le paga al paseador.')
    expect(h).toContain('Ver más')
    expect(h).toContain('todavía no hay una empresa constituida')
  })
})

describe('«Si algo pasa»', () => {
  it('muestra las tres situaciones con sus pasos', () => {
    const h = algoPasa()
    for (const t of ['Perro perdido', 'Perro herido', 'Pelea entre perros']) expect(h).toContain(t)
    expect(h).toContain('veterinaria más cercana')
  })

  it('con un paseo en curso ofrece el botón de SOS; sin paseo dice dónde aparece', () => {
    expect(algoPasa({ paseoEnCurso: true })).toContain('Abrir SOS del paseo')
    const sin = algoPasa({ paseoEnCurso: false })
    expect(sin).not.toContain('Abrir SOS del paseo')
    expect(sin).toContain('aparece en «Paseo»')
  })

  it('siempre trae a quién llamar: serenazgo, Policía 105, Bomberos 116 y SAMU 106, sin quedar mudo', () => {
    const h = algoPasa()
    expect(h).toContain('Serenazgo de San Isidro')
    expect(h).toContain('Serenazgo de Jesús María')
    for (const n of ['tel:105', 'tel:116', 'tel:106']) expect(h).toContain(n)
    expect(h).toContain('Falta configurar')
  })

  it('con el distrito conocido muestra solo ese serenazgo', () => {
    const h = algoPasa({ distrito: 'Jesús María' })
    expect(h).toContain('Serenazgo de Jesús María')
    expect(h).not.toContain('Serenazgo de San Isidro')
  })
})

describe('Seguridad: las dos entradas', () => {
  it('tiene los botones «Si algo pasa» y «Quiénes somos»', () => {
    const h = renderToStaticMarkup(<SafetyView onExplore={() => undefined} onApply={() => undefined} onAlgoPasa={() => undefined} onQuienesSomos={() => undefined} />)
    expect(h).toContain('Si algo pasa')
    expect(h).toContain('Quiénes somos')
  })
})
