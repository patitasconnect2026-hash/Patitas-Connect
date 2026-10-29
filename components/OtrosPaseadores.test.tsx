import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { WALKERS } from '@/lib/data'
import { OtrosPaseadores } from './OtrosPaseadores'

const r = (opciones: typeof WALKERS) => renderToStaticMarkup(<OtrosPaseadores opciones={opciones} slot="Mañana · 10:00 am" onReservar={() => {}} onOtroHorario={() => {}} />)

describe('«Otros paseadores libres»', () => {
  it('lista con botón «Reservar» y etiqueta «Ejemplo»; sin celulares ni dirección', () => {
    const h = r(WALKERS.slice(0, 2))
    expect(h).toContain('Otros paseadores libres')
    expect((h.match(/>Reservar</g) ?? []).length).toBe(2)
    expect(h).toContain('Ejemplo')
    expect(h).not.toMatch(/\+51|\d{3} \d{3} \d{3}|Calle|WhatsApp/)
    expect(h).not.toMatch(/seguro|garantiz|verificado/i)
  })
  it('sin compatibles: el mensaje y «Elegir otro horario»', () => {
    const h = r([])
    expect(h).toContain('Aún no hay otro paseador libre a esa hora')
    expect(h).toContain('Elegir otro horario')
    expect(h).not.toContain('>Reservar<')
  })
})
