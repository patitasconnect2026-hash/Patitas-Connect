import { describe, expect, it } from 'vitest'
import { avisosPara, cambiar, encendido, TIPOS_AVISO } from './notificaciones'

describe('avisos', () => {
  it('cada aviso tiene un id único y es para alguien', () => {
    const ids = TIPOS_AVISO.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(TIPOS_AVISO.every((t) => t.para.length > 0)).toBe(true)
  })
  it('los de seguridad no se apagan', () => {
    const seguridad = TIPOS_AVISO.filter((t) => t.grupo === 'seguridad')
    expect(seguridad.length).toBeGreaterThan(3)
    for (const t of seguridad) {
      expect(t.obligatorio).toBe(true)
      expect(encendido(t, cambiar({}, t, false))).toBe(true)
    }
  })
  it('los demás se pueden apagar', () => {
    const foto = TIPOS_AVISO.find((t) => t.id === 'foto')!
    expect(encendido(foto, {})).toBe(true)
    expect(encendido(foto, cambiar({}, foto, false))).toBe(false)
  })
  it('la familia y el paseador ven sus propios avisos', () => {
    expect(avisosPara('paseador').some((t) => t.id === 'pedido_nuevo')).toBe(true)
    expect(avisosPara('familia').some((t) => t.id === 'pedido_nuevo')).toBe(false)
  })
})
