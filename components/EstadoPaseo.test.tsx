import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { ESTADOS } from '@/lib/paseo'
import { EstadoCard } from './EstadoPaseo'

const nombres = { paseador: 'Carlos', perro: 'Max', dueno: 'Valeria' }

describe('EstadoCard: el estado del paseo en pantalla', () => {
  it('se dibuja para cada estado, para el dueño y para el paseador', () => {
    for (const e of ESTADOS) {
      for (const v of ['dueno', 'paseador'] as const) {
        const html = renderToStaticMarkup(<EstadoCard estado={e} vista={v} nombres={nombres} />)
        expect(html, `${e}/${v}`).toContain('aria-label="Estado del paseo"')
        expect(html).toMatch(/<p class="font-display[^>]*>[^<]+<\/p>/)
      }
    }
  })

  it('el dueño lee «Solicitud enviada» antes de que alguien acepte y «Paseo aceptado» después', () => {
    expect(renderToStaticMarkup(<EstadoCard estado="solicitado" vista="dueno" nombres={nombres} />)).toContain('Solicitud enviada')
    expect(renderToStaticMarkup(<EstadoCard estado="aceptado" vista="dueno" nombres={nombres} />)).toContain('Paseo aceptado')
  })

  it('lo de dentro (las acciones) se muestra', () => {
    const html = renderToStaticMarkup(
      <EstadoCard estado="solicitado" vista="paseador" nombres={nombres}>
        <button type="button">Aceptar</button>
      </EstadoCard>,
    )
    expect(html).toContain('Aceptar')
  })
})

describe('«Reserva confirmada» no vuelve', () => {
  it('ninguna pantalla lo escribe: la reserva es una solicitud hasta que el paseador acepta', () => {
    const raiz = path.resolve(__dirname, '..')
    const malos: string[] = []
    const ver = (dir: string) => {
      for (const e of fs.readdirSync(path.join(raiz, dir), { withFileTypes: true })) {
        const rel = path.join(dir, e.name)
        if (e.isDirectory()) ver(rel)
        else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.(ts|tsx)$/.test(e.name)) {
          const src = fs.readFileSync(path.join(raiz, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
          if (/Reserva confirmada|¡Paseo reservado!/.test(src)) malos.push(rel)
        }
      }
    }
    for (const d of ['app', 'components', 'lib']) ver(d)
    expect(malos).toEqual([])
  })
})
