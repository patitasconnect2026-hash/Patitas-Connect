import { describe, expect, it } from 'vitest'
import { CONFIG } from './config'
import { botonesSerenazgo, distritosLima, distritosPorEstado } from './distritos'
import { normalizarTelefono } from './telefono'

describe('distritos y serenazgo', () => {
  it('hoy se pasea solo en San Isidro y Jesús María', () => {
    expect(distritosPorEstado('activo').map((d) => d.nombre)).toEqual(['San Isidro', 'Jesús María'])
  })
  it('todo número escrito trae su fuente y sirve para llamar', () => {
    for (const d of distritosLima()) {
      if (d.serenazgo) {
        expect(d.fuente, d.nombre).not.toBe('')
        expect(normalizarTelefono(d.serenazgo), d.nombre).not.toBeNull()
      }
    }
  })
  it('los activos leen el número de CONFIG (un solo lugar)', () => {
    const vacio = { ...CONFIG, serenazgo: { sanIsidro: { telefono: '', whatsapp: '' }, jesusMaria: { telefono: '', whatsapp: '' } } }
    const b = botonesSerenazgo('hola', vacio, true)
    expect(b.map((x) => x.llamar)).toEqual([null, null])
    expect(botonesSerenazgo('hola', CONFIG, true)[0].llamar).toBe('tel:+5113190450')
  })
  it('sin número no se inventa: el botón queda sin enlace', () => {
    const sb = botonesSerenazgo('x').find((b) => b.distrito === 'San Borja')!
    expect(sb.llamar).toBeNull()
  })
})
