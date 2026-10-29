import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { aplicar, nuevoPaseo, type Paseo } from '@/lib/paseo'
import { ESCENARIOS, TEXTO_ESCENARIO } from '@/lib/zonaDemo'
import type { TipoAviso } from '@/lib/zona'
import { AvisosPaseo, avisosDelRegistro } from './AvisosPaseo'

const T0 = Date.UTC(2026, 9, 10, 15, 0, 0)
const MIN = 60_000

function enPaseo(avisos: Array<{ tipo: TipoAviso; demo?: boolean }> = []): Paseo {
  let p = nuevoPaseo(T0)
  p = aplicar(p, 'aceptar', 'paseador', T0 + MIN)
  p = aplicar(p, 'salir', 'paseador', T0 + 2 * MIN)
  p = aplicar(p, 'recoger', 'paseador', T0 + 3 * MIN)
  avisos.forEach((a, i) => {
    p = aplicar(p, 'avisar', 'sistema', T0 + (4 + i) * MIN, undefined, a.demo ?? true, a.tipo)
  })
  return p
}

describe('AvisosPaseo', () => {
  it('sin avisos y sin prueba no pinta nada (no promete una vigilancia que no hay)', () => {
    expect(renderToStaticMarkup(<AvisosPaseo paseo={enPaseo()} vista="dueno" />)).toBe('')
  })

  it('muestra cada aviso con su texto, la hora, quién lo dejó y «Demostración»', () => {
    const html = renderToStaticMarkup(<AvisosPaseo paseo={enPaseo([{ tipo: 'salida' }])} vista="dueno" />)
    expect(html).toContain('Posible salida de la zona')
    expect(html).toContain('La app')
    expect(html).toContain('Demostración')
    // la etiqueta está junto al título (no solo en la línea gris de abajo)
    expect(html.indexOf('Demostración')).toBeLessThan(html.indexOf('Posible salida de la zona'))
    expect(html).toMatch(/\d{1,2}:\d{2}/)
  })

  it('un aviso que no es de demostración no lleva esa etiqueta', () => {
    const html = renderToStaticMarkup(<AvisosPaseo paseo={enPaseo([{ tipo: 'quieto', demo: false }])} vista="dueno" />)
    expect(html).toContain('Quieto hace')
    expect(html).not.toContain('Demostración')
  })

  it('al dueño le dice que entre dos celulares hace falta un servidor', () => {
    const html = renderToStaticMarkup(<AvisosPaseo paseo={enPaseo([{ tipo: 'borde' }])} vista="dueno" />)
    expect(html).toMatch(/dos celulares hace falta un servidor/)
    expect(html).toContain('Son solo señales')
  })

  it('al paseador también se lo dice (con otras palabras)', () => {
    const html = renderToStaticMarkup(<AvisosPaseo paseo={enPaseo([{ tipo: 'borde' }])} vista="paseador" />)
    expect(html).toMatch(/Entre dos celulares hace falta un servidor/)
  })

  it('el más nuevo va primero y de a tres: el resto queda en «Ver más»', () => {
    const p = enPaseo([{ tipo: 'borde' }, { tipo: 'salida' }, { tipo: 'regreso' }, { tipo: 'quieto' }, { tipo: 'salto' }])
    expect(avisosDelRegistro(p).map((e) => e.aviso)).toEqual(['salto', 'quieto', 'regreso', 'salida', 'borde'])
    const html = renderToStaticMarkup(<AvisosPaseo paseo={p} vista="dueno" />)
    expect(html).toContain('Ver 2 más')
    expect(html.indexOf('Salto de ubicación')).toBeLessThan(html.indexOf('Quieto hace'))
  })

  it('con onProbar muestra el panel «Probar los avisos · Demostración» con un botón por escenario', () => {
    const html = renderToStaticMarkup(<AvisosPaseo paseo={enPaseo()} vista="paseador" onProbar={() => {}} />)
    expect(html).toContain('Probar los avisos')
    expect(html).toContain('Demostración')
    expect(html).toContain('Señales inventadas')
    expect(html).toContain('Entre dos celulares hace falta servidor')
    for (const e of ESCENARIOS) expect(html).toContain(TEXTO_ESCENARIO[e].boton)
    expect((html.match(/<button/g) ?? []).length).toBe(ESCENARIOS.length)
  })

  it('no usa palabras que prometen de más', () => {
    const p = enPaseo([{ tipo: 'borde' }, { tipo: 'salida' }, { tipo: 'regreso' }, { tipo: 'quieto' }, { tipo: 'salto' }])
    const html = renderToStaticMarkup(<AvisosPaseo paseo={p} vista="dueno" onProbar={() => {}} />)
    expect(html).not.toMatch(/\bseguro\b|tiempo real|24\/7|100 ?%|garantiz/i)
  })
})
