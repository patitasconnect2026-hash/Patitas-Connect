import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { COMPROBACIONES } from '@/lib/verificacion'
import { Onboarding } from './Onboarding'

const html = renderToStaticMarkup(<Onboarding onFinish={() => {}} />)

describe('portada (inicio)', () => {
  it('las tres líneas bajo el lema están en la pantalla', () => {
    expect(html).toContain('Pagas a Patitas, no al paseador')
    expect(html).toContain('Fotos y puntos de control')
    expect(html).toContain('Paseadores con hasta ')
  })

  it('la cantidad de comprobaciones sale de la lista, no de un número escrito a mano', () => {
    expect(html).toContain(`hasta ${COMPROBACIONES.length} comprobaciones`)
  })

  it('no promete verificación a secas ni un pago dentro de la app', () => {
    expect(html).not.toMatch(/verificad|tarjeta|custodia|seguro/i)
  })

  it('la portada se puede desplazar: en un celular chico no queda cortada', () => {
    expect(html).toContain('overflow-y-auto')
  })
})
