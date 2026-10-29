import { describe, expect, it } from 'vitest'
import { ESTADOS } from './paseo'
import { aplicar, nuevoPaseo } from './paseo'
import { ETIQUETA_ESTADO, PASOS, pasosAlcanzados, pasosDelPaseo, textosPaseo } from './paseoTextos'

const n = { paseador: 'Carlos', perro: 'Max', dueno: 'Valeria' }
const palabras = (t: string) => t.split(/\s+/).filter(Boolean).length

describe('textos del estado del paseo', () => {
  it('todos los estados tienen texto para el dueño y para el paseador', () => {
    for (const e of ESTADOS) {
      for (const v of ['dueno', 'paseador'] as const) {
        const t = textosPaseo(e, v, n)
        expect(t.titulo.length, `${e}/${v}`).toBeGreaterThan(0)
        expect(t.apoyo.length, `${e}/${v}`).toBeGreaterThan(0)
      }
      expect(ETIQUETA_ESTADO[e]).toBeTruthy()
    }
  })

  it('título de 5 palabras o menos y apoyo de 12 o menos', () => {
    // con nombres largos también
    const largos = { paseador: 'María Fernanda', perro: 'Capitán Nemo', dueno: 'Ana Lucía' }
    for (const nombres of [n, largos]) {
      for (const e of ESTADOS) {
        for (const v of ['dueno', 'paseador'] as const) {
          const t = textosPaseo(e, v, nombres)
          expect(palabras(t.titulo), `${e}/${v}: ${t.titulo}`).toBeLessThanOrEqual(5)
          expect(palabras(t.apoyo), `${e}/${v}: ${t.apoyo}`).toBeLessThanOrEqual(12)
        }
      }
    }
  })

  it('«Reserva confirmada» ya no existe: el dueño lee «Solicitud enviada» hasta que alguien acepta', () => {
    expect(textosPaseo('solicitado', 'dueno', n).titulo).toBe('Solicitud enviada')
    expect(textosPaseo('aceptado', 'dueno', n).titulo).toBe('Paseo aceptado')
    for (const e of ESTADOS) {
      for (const v of ['dueno', 'paseador'] as const) {
        const t = textosPaseo(e, v, n)
        expect(`${t.titulo} ${t.apoyo}`).not.toMatch(/confirmada|seguro|garantiz|24 ?\/ ?7|verificad/i)
      }
    }
  })

  it('en disputa, quien no reportó lee «Reporte recibido» y quién fue; quien reportó, «Reporte enviado»', () => {
    expect(textosPaseo('en_disputa', 'dueno', n, 'dueno').titulo).toBe('Reporte enviado')
    const r = textosPaseo('en_disputa', 'paseador', n, 'dueno')
    expect(r.titulo).toBe('Reporte recibido')
    expect(r.apoyo).toContain('Valeria')
    expect(textosPaseo('en_disputa', 'dueno', n, 'paseador').apoyo).toContain('Carlos')
    expect(palabras(r.apoyo)).toBeLessThanOrEqual(12)
  })

  it('la barra conserva hasta dónde llegó el paseo aunque pase a disputa', () => {
    let p = nuevoPaseo(1000)
    for (const [a, q] of [['aceptar', 'paseador'], ['salir', 'paseador'], ['recoger', 'paseador']] as const) p = aplicar(p, a, q, 2000)
    p = aplicar(p, 'reportar', 'dueno', 3000)
    expect(pasosAlcanzados(p.estado)).toBe(0)
    expect(pasosDelPaseo(p)).toBe(4)
  })

  it('la barra de avance sigue el camino normal', () => {
    expect(PASOS.map((p) => p.id)).toEqual(['solicitado', 'aceptado', 'en_camino', 'en_paseo', 'entregado'])
    expect(pasosAlcanzados('solicitado')).toBe(1)
    expect(pasosAlcanzados('en_paseo')).toBe(4)
    expect(pasosAlcanzados('cerrado')).toBe(5)
    expect(pasosAlcanzados('cancelado')).toBe(0)
  })
})
