import { describe, expect, it } from 'vitest'
import type { ChatMsg } from './bus'
import { aplicar, nuevoPaseo, type Paseo } from './paseo'
import { MINUTOS_PARA_DECIR_ACTIVO, TEXTO_ACTIVIDAD, textoDeActividad, ultimaActividadDe } from './chatServidor'

const T0 = 1_800_000_000_000
const min = (n: number) => n * 60_000
const msg = (from: ChatMsg['from'], at: number): ChatMsg => ({ id: `${from}-${at}`, from, text: 'hola', at, jobId: 'j1' })

function paseoAceptado(): Paseo {
  return aplicar(nuevoPaseo(T0), 'aceptar', 'paseador', T0 + min(2))
}

describe('lo último que hizo la otra persona (solo lo que la base sabe)', () => {
  it('sin mensajes ni cambios suyos no se sabe nada (null), no se inventa', () => {
    expect(ultimaActividadDe('walker', [], nuevoPaseo(T0))).toBeNull()
    expect(ultimaActividadDe('walker', [msg('owner', T0 + min(1))], nuevoPaseo(T0))).toBeNull()
    expect(ultimaActividadDe('walker', [], null)).toBeNull()
  })

  it('cuenta los mensajes de esa persona y sus cambios del paseo, y toma el más reciente', () => {
    const p = paseoAceptado()
    expect(ultimaActividadDe('walker', [], p)).toBe(T0 + min(2))
    expect(ultimaActividadDe('walker', [msg('walker', T0 + min(5)), msg('owner', T0 + min(9))], p)).toBe(T0 + min(5))
    expect(ultimaActividadDe('owner', [msg('walker', T0 + min(5)), msg('owner', T0 + min(9))], p)).toBe(T0 + min(9))
  })

  it('no cuenta lo que hizo «el sistema» ni lo de demostración', () => {
    let p = paseoAceptado()
    p = aplicar(p, 'salir', 'paseador', T0 + min(3), 'Demostración', true)
    expect(ultimaActividadDe('walker', [], p)).toBe(T0 + min(2))
    expect(ultimaActividadDe('walker', [], nuevoPaseo(T0))).toBeNull()
  })
})

describe('«Activo hace…»', () => {
  it('sin dato, o sin saber la hora de ahora, no dice nada', () => {
    expect(textoDeActividad(null, T0)).toBeNull()
    expect(textoDeActividad(T0, 0)).toBeNull()
  })

  it('un momento, minutos y, pasada la hora, nada', () => {
    expect(textoDeActividad(T0, T0 + 30_000)).toBe(TEXTO_ACTIVIDAD.ahora)
    expect(textoDeActividad(T0, T0 + min(1) + 59_000)).toBe(TEXTO_ACTIVIDAD.ahora)
    expect(textoDeActividad(T0, T0 + min(2))).toBe('Activo hace 2 min')
    expect(textoDeActividad(T0, T0 + min(MINUTOS_PARA_DECIR_ACTIVO - 1))).toBe('Activo hace 59 min')
    expect(textoDeActividad(T0, T0 + min(MINUTOS_PARA_DECIR_ACTIVO))).toBeNull()
  })

  it('si el reloj de este teléfono va atrasado no sale un tiempo negativo', () => {
    expect(textoDeActividad(T0 + min(10), T0)).toBe(TEXTO_ACTIVIDAD.ahora)
  })

  it('nunca dice «en línea» ni «conectado»', () => {
    for (const m of [0, 1, 2, 7, 30, 59]) {
      const t = textoDeActividad(T0, T0 + min(m)) ?? ''
      expect(t).not.toMatch(/en l[ií]nea|conectad/i)
    }
  })
})
