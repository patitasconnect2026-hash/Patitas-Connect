import { describe, expect, it } from 'vitest'
import { enlaceLlamada, enlaceWhatsApp, esCelularPeru, normalizarTelefono } from './telefono'

describe('normalizarTelefono', () => {
  it('celulares, como los escribe la gente', () => {
    expect(normalizarTelefono('987654321')).toBe('+51987654321')
    expect(normalizarTelefono('987 654 321')).toBe('+51987654321')
    expect(normalizarTelefono('+51 987-654-321')).toBe('+51987654321')
    expect(normalizarTelefono('51987654321')).toBe('+51987654321')
    expect(normalizarTelefono('(+51) 987 654 321')).toBe('+51987654321')
  })

  it('fijos de Lima, como los copian de las páginas oficiales', () => {
    expect(normalizarTelefono('(01) 319 0000')).toBe('+5113190000')
    expect(normalizarTelefono('01 319 0000')).toBe('+5113190000')
    expect(normalizarTelefono('319 0000')).toBe('+5113190000')
    expect(normalizarTelefono('3190000')).toBe('+5113190000')
    expect(normalizarTelefono('(511) 3190000')).toBe('+5113190000')
    expect(normalizarTelefono('+51 1 319 0000')).toBe('+5113190000')
  })

  it('un número internacional con +', () => {
    expect(normalizarTelefono('+1 305 555 0123')).toBe('+13055550123')
  })

  it('rechaza lo que no sirve', () => {
    for (const malo of ['', '   ', '12345', '12345678', '887654321', '98765abcd', '+51', '105']) {
      expect(normalizarTelefono(malo), `«${malo}»`).toBeNull()
    }
  })
})

describe('esCelularPeru', () => {
  it('un celular sí; un fijo, un número corto o texto no', () => {
    expect(esCelularPeru('987 654 321')).toBe(true)
    expect(esCelularPeru('+51 987 654 321')).toBe(true)
    expect(esCelularPeru('(01) 319 0000')).toBe(false)
    expect(esCelularPeru('105')).toBe(false)
    expect(esCelularPeru('hola')).toBe(false)
  })
})

describe('enlaces', () => {
  it('llamar usa el formato internacional', () => {
    expect(enlaceLlamada('(01) 319 0000')).toBe('tel:+5113190000')
    expect(enlaceLlamada('nada')).toBeNull()
  })
  it('WhatsApp lleva solo dígitos y el mensaje codificado', () => {
    expect(enlaceWhatsApp('987 654 321', 'Ayuda, Max ¿sí?')).toBe(`https://wa.me/51987654321?text=${encodeURIComponent('Ayuda, Max ¿sí?')}`)
    expect(enlaceWhatsApp('', 'Hola')).toBeNull()
  })
})
