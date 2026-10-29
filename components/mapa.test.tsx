import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TEXTO_MAPA } from '@/lib/mapaTextos'
import { CasaSheet } from './CasaSheet'
import { MapaZona } from './map/MapaZona'
import { ParquesEnMapa } from './walker/ParquesEnMapa'

describe('mapa y búsqueda de dirección', () => {
  it('«Marca tu casa» trae el buscador: solo se busca al apretar «Buscar» (hay un botón, no autocompletar)', () => {
    const html = renderToStaticMarkup(<CasaSheet valor={null} onSave={() => {}} onClose={() => {}} />)
    expect(html).toContain(TEXTO_MAPA.buscarEtiqueta)
    expect(html).toContain(TEXTO_MAPA.buscar)
    expect(html).toContain('autoComplete="off"')
    expect(html).toContain('type="search"')
  })
  it('el mapa del paseador antes de ser elegido solo dice «zona aproximada» (nunca el punto exacto)', () => {
    const html = renderToStaticMarkup(<MapaZona centro={[-12.0999, -77.0374]} modo="aproximada" />)
    expect(html).toContain(TEXTO_MAPA.zonaAproximada)
    expect(html).toContain(TEXTO_MAPA.zonaAproximadaApoyo)
    expect(html).not.toContain('-12.0999')
  })
  it('después de ser elegido muestra el punto de recojo', () => {
    expect(renderToStaticMarkup(<MapaZona centro={[-12.0999, -77.0374]} modo="exacta" />)).toContain(TEXTO_MAPA.puntoExacto)
  })
  it('el paseador marca sus parques sobre el mapa', () => {
    const html = renderToStaticMarkup(<ParquesEnMapa elegidos={[]} max={3} onChange={() => {}} />)
    expect(html).toContain(TEXTO_MAPA.parquesTitulo)
    expect(html).toContain(TEXTO_MAPA.parquesApoyo)
  })
})
