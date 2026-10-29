import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { DEMO_ACCOUNT, DEMO_DOGS, WALKERS } from '@/lib/data'
import { desplazar } from '@/lib/zona'
import { DISTRICTS } from '@/lib/geo'
import { TEXTO_CASA } from '@/lib/zonaTextos'
import { BookingSheet } from './BookingSheet'
import { CasaSheet, ResultadoZona } from './CasaSheet'

const SI = DISTRICTS.find((d) => d.id === 'san-isidro')!
const sur = SI.polygon.reduce((m, p) => (p[0] < m[0] ? p : m))

describe('ResultadoZona', () => {
  it('dentro: lo dice sin alarmar', () => {
    const html = renderToStaticMarkup(<ResultadoZona punto={[-12.09993, -77.03739]} />)
    expect(html).toContain('Dentro de la zona')
    expect(html).toContain('San Isidro')
    expect(html).not.toContain('Aún no llegamos')
  })

  it('borde: aviso suave, con «Ver más»', () => {
    const html = renderToStaticMarkup(<ResultadoZona punto={desplazar(sur, 0, -200)} />)
    expect(html).toContain('Borde de la zona')
    expect(html).toContain('Ver más')
    expect(html).not.toContain('Aún no llegamos')
  })

  it('fuera: «Aún no llegamos a tu zona.»', () => {
    const html = renderToStaticMarkup(<ResultadoZona punto={[-12.1219, -77.0297]} />)
    expect(html).toContain('Aún no llegamos a tu zona.')
  })
})

describe('CasaSheet', () => {
  it('sin punto: el botón está apagado, dice qué hacer, para qué es y quién lo ve', () => {
    const html = renderToStaticMarkup(<CasaSheet valor={null} onSave={() => {}} onClose={() => {}} />)
    expect(html).toContain(TEXTO_CASA.indicacion)
    expect(html).toContain('El paseador no la ve')
    expect(html).toContain('Se queda en tu teléfono')
    // la leyenda del mapa
    expect(html).toContain('Zona')
    expect(html).toContain('Fuera')
    expect(html).toMatch(/<button[^>]*\sdisabled=""[^>]*>[^<]*Usar este punto/)
  })

  it('con un punto fuera de la zona: el botón sigue apagado', () => {
    const html = renderToStaticMarkup(<CasaSheet valor={[-12.1219, -77.0297]} onSave={() => {}} onClose={() => {}} />)
    expect(html).toContain('Aún no llegamos a tu zona.')
    expect(html).toMatch(/<button[^>]*\sdisabled=""[^>]*>[^<]*Usar este punto/)
  })

  it('con un punto dentro: el botón se puede tocar', () => {
    const html = renderToStaticMarkup(<CasaSheet valor={[-12.09993, -77.03739]} onSave={() => {}} onClose={() => {}} />)
    expect(html).not.toMatch(/<button[^>]*\sdisabled=""[^>]*>[^<]*Usar este punto/)
    expect(html).toContain('Usar este punto')
  })
})

describe('BookingSheet y la casa del dueño', () => {
  const walker = WALKERS[0]
  const base = { walker, dogs: DEMO_DOGS, initialDogId: DEMO_DOGS[0].id, welcome: false, onAddDog: () => {}, onEditDog: () => {}, onPedirCasa: () => {}, onClose: () => {}, onConfirmed: () => {}, onSeeLive: () => {} }
  const html = (account: typeof DEMO_ACCOUNT) => renderToStaticMarkup(<BookingSheet {...base} account={account} />)

  it('una cuenta sin casa marcada no puede reservar: el botón de abajo es «Marcar mi casa»', () => {
    const { casa: _casa, ...sinCasa } = DEMO_ACCOUNT
    void _casa
    const h = html(sinCasa)
    expect(h).toContain(TEXTO_CASA.titulo)
    expect(h).toContain(TEXTO_CASA.marcar)
    expect(h).not.toContain('Revisar y enviar')
    expect(h).not.toContain('Total del paseo')
  })

  it('una casa fuera de la zona no puede reservar: «Aún no llegamos a tu zona.» y el botón de abajo es la salida', () => {
    const h = html({ ...DEMO_ACCOUNT, casa: [-12.1219, -77.0297] })
    expect(h).toContain('Aún no llegamos a tu zona.')
    expect(h).toContain(TEXTO_CASA.cambiar)
    expect(h).not.toContain('Revisar y enviar')
    expect(h).not.toContain('Total del paseo')
  })

  it('una casa en el borde puede reservar, con un aviso suave', () => {
    const h = html({ ...DEMO_ACCOUNT, casa: desplazar(sur, 0, -200) })
    expect(h).toContain('Borde de la zona')
    // el botón de abajo es el de siempre (no «Marcar mi casa»): la zona no bloquea
    expect(h).toMatch(/Elige un horario libre|Revisar y enviar/)
    expect(h).not.toContain('Aún no llegamos')
  })

  it('la cuenta de demostración (casa dentro) reserva sin avisos de zona', () => {
    const h = html(DEMO_ACCOUNT)
    expect(h).not.toContain('Aún no llegamos')
    expect(h).not.toContain(TEXTO_CASA.titulo)
    expect(h).not.toContain(TEXTO_CASA.marcar)
    expect(h).toMatch(/Elige un horario libre|Revisar y enviar/)
  })
})
