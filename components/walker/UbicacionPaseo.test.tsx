import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { UbicacionCard, UbicacionSheet } from './UbicacionPaseo'
import type { EstadoUbicacion, SensoresPaseo } from './useSensoresPaseo'

const sensores = (ubicacion: EstadoUbicacion): SensoresPaseo => ({
  ubicacion,
  ultima: null,
  pantallaEncendida: true,
  permitir: () => {},
  seguirSinUbicacion: () => {},
  leerAhora: async () => null,
})
const card = (u: EstadoUbicacion) => renderToStaticMarkup(<UbicacionCard sensores={sensores(u)} onActivar={() => {}} />)

describe('la pantalla que explica la ubicación (antes del permiso del navegador)', () => {
  const html = renderToStaticMarkup(<UbicacionSheet onPermitir={() => {}} onAhoraNo={() => {}} />)

  it('dice para qué se pide y dónde se queda, y no promete que le llegue al dueño en otro celular', () => {
    expect(html).toContain('Tu ubicación durante el paseo')
    expect(html).toContain('al empezar, al terminar y en cada foto')
    expect(html).toContain('Se queda en este teléfono')
    expect(html).toContain('No se guarda en ningún servidor')
    expect(html).toContain('Hoy no llega a otro celular: falta servidor.')
  })

  it('tiene dos salidas: permitir y «Ahora no»', () => {
    expect(html).toContain('Permitir ubicación')
    expect(html).toContain('Ahora no')
  })

  it('el detalle honesto va en «Más detalles»: se puede negar y seguir; qué ve el dueño; pantalla apagada; señales', () => {
    expect(html).toContain('Más detalles')
    expect(html).toContain('El seguimiento es por puntos de control con foto')
    expect(html).toContain('Si lo niegas, puedes seguir')
    expect(html).toContain('el dueño ve los puntos de control y los avisos, no tu recorrido'.replace('el dueño', 'El dueño'))
    expect(html).toContain('con la pantalla apagada se pausan')
    expect(html).toContain('Son solo señales')
  })

  it('no promete lo que no existe', () => {
    // solo el texto visible (el marcado trae estilos como translateY(100%))
    const texto = html.replace(/<[^>]+>/g, ' ')
    expect(texto).not.toMatch(/\bseguro\b|tiempo real|24\/7|100 ?%|garantiz/i)
  })
})

describe('la tarjeta de ubicación', () => {
  it('con ubicación activa', () => {
    expect(card('activa')).toContain('Activa en este teléfono.')
  })

  it('si se negó el permiso: lo dice y cómo activarla; el paseo sigue', () => {
    const h = card('negada')
    expect(h).toContain('Sin ubicación: no diste el permiso.')
    expect(h).toContain('Permítela en los ajustes del navegador y recarga la página.')
  })

  it('si eligió «Ahora no»: ofrece activarla', () => {
    const h = card('omitida')
    expect(h).toContain('Sin ubicación: elegiste seguir sin ella.')
    expect(h).toContain('Activar ubicación')
  })

  it('si el navegador no la permite (sin HTTPS o sin la función): lo dice', () => {
    expect(card('no_disponible')).toContain('este navegador o esta conexión no la permite')
  })

  it('dice a la vista que los avisos de zona solo funcionan con la pantalla encendida y no pide mantenerla encendida', () => {
    for (const u of ['activa', 'negada', 'omitida', 'esperando'] as const) {
      const h = card(u)
      expect(h).toContain('Los avisos de zona solo funcionan con la pantalla encendida.')
      expect(h).not.toContain('Mantén la pantalla')
    }
  })

  it('«Ver más» es honesto: la web no sigue la ubicación con la pantalla apagada; hace falta HTTPS', () => {
    const h = card('activa')
    expect(h).toContain('Ver más')
    expect(h).toContain('no puede seguir tu ubicación con la pantalla apagada')
    expect(h).toContain('puntos de control con foto')
    expect(h).toContain('HTTPS')
    expect(h).toContain('localhost')
  })
})
