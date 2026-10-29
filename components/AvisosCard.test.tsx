import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TEXTO_ALERTAS } from '@/lib/avisosTextos'
import { AvisosCard } from './AvisosCard'

describe('AvisosCard', () => {
  it('la primera vez explica los avisos, dice su límite y ofrece activar o dejarlo', () => {
    const html = renderToStaticMarkup(<AvisosCard quien="paseador" />)
    expect(html).toContain(TEXTO_ALERTAS.apoyoPaseador)
    expect(html).toContain(TEXTO_ALERTAS.limite)
    expect(html).toContain(TEXTO_ALERTAS.activar)
    expect(html).toContain(TEXTO_ALERTAS.ahoraNo)
  })
  it('para la familia habla de respuestas a su pedido', () => {
    expect(renderToStaticMarkup(<AvisosCard quien="familia" />)).toContain(TEXTO_ALERTAS.apoyoFamilia)
  })
})
