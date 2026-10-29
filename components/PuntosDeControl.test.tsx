import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CONFIG } from '@/lib/config'
import { SPOTS } from '@/lib/geo'
import { puntosDelPaseo, type PuntoControl } from '@/lib/puntosControl'
import { PuntosDeControl } from './PuntosDeControl'

const T0 = Date.UTC(2026, 9, 10, 15, 0, 0)
const MIN = 60_000
const olivar = SPOTS.find((s) => s.id === 'olivar')!.pos
const puntos: PuntoControl[] = [
  { tipo: 'inicio', t: T0, ubicacion: { pos: olivar, lecturaT: T0 } },
  { tipo: 'fin', t: T0 + 40 * MIN, ubicacion: null, sinUbicacion: 'omitida' },
]
const vista = (p: Partial<Parameters<typeof PuntosDeControl>[0]> = {}) =>
  renderToStaticMarkup(<PuntosDeControl puntos={puntosDelPaseo(puntos, [])} demo={false} enCurso={false} ahora={T0} ultimoT={null} {...p} />)

describe('«Puntos de control» del dueño', () => {
  it('lista el inicio y el fin con su hora y su lugar, sin coordenadas', () => {
    const h = vista()
    expect(h).toContain('Puntos de control')
    expect(h).toContain('Inicio')
    expect(h).toContain('Fin')
    expect(h).toMatch(/En San Isidro/)
    expect(h).toContain('Sin ubicación')
    expect(h).not.toMatch(/-?\d{1,3}\.\d{4,}/)
  })

  it('sin puntos dice «Aún no hay puntos de control.»', () => {
    expect(vista({ puntos: [] })).toContain('Aún no hay puntos de control.')
  })

  it('en la demostración lo dice', () => {
    expect(vista({ demo: true })).toContain('Demostración')
  })

  it('el «Ver más» dice cómo se sigue el paseo: puntos de control con foto, no continuo', () => {
    const h = vista()
    expect(h).toContain('Cómo se sigue el paseo')
    expect(h).toContain('El seguimiento es por puntos de control con foto.')
    expect(h).toContain('pantalla apagada')
  })

  it('con el paseo en curso dice hace cuánto fue el último punto y avisa si pasó el tiempo sin foto', () => {
    const reciente = vista({ enCurso: true, ultimoT: T0, ahora: T0 + 4 * MIN })
    expect(reciente).toContain('Último punto de control: hace 4 min.')
    expect(reciente).not.toContain('sin foto de control')
    const tarde = vista({ enCurso: true, ultimoT: T0, ahora: T0 + (CONFIG.minutosPuntoControl + 5) * MIN })
    expect(tarde).toContain(`Pasaron ${CONFIG.minutosPuntoControl + 5} min sin foto de control.`)
  })

  it('fuera de un paseo en curso no habla del último control', () => {
    expect(vista({ enCurso: false, ultimoT: T0, ahora: T0 + 30 * MIN })).not.toContain('Último punto de control')
  })
})
