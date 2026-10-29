import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { perfilDe } from '@/lib/servidor/paseadoresReales'
import { TEXTO_RESERVAS } from '@/lib/reservasTextos'
import { DisponibleAhora } from './DisponibleAhora'

describe('«Disponible ahora»', () => {
  it('el interruptor dice qué ven las familias', () => {
    expect(renderToStaticMarkup(<DisponibleAhora disponible onChange={() => undefined} />)).toContain(TEXTO_RESERVAS.disponibleApoyoSi)
    const no = renderToStaticMarkup(<DisponibleAhora disponible={false} onChange={() => undefined} />)
    expect(no).toContain(TEXTO_RESERVAS.disponibleApoyoNo)
    expect(no).toContain('aria-checked="false"')
  })
  it('desde la base: sin dato es disponible; solo «false» lo apaga', () => {
    expect(perfilDe({ rate: 20 }).disponible).toBe(true)
    expect(perfilDe({ rate: 20, disponible: false }).disponible).toBe(false)
  })
})
