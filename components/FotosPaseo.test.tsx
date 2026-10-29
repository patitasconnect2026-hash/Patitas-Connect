import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { DISTRICTS, SPOTS, type LatLng } from '@/lib/geo'
import { CONFIG } from '@/lib/config'
import { codigoDeFotos, type FotoPaseo } from '@/lib/fotos'
import { contadorFotos, TEXTO_FOTOS } from '@/lib/fotosTextos'
import { desplazar } from '@/lib/zona'
import { FotosPaseo } from './FotosPaseo'

const T0 = Date.UTC(2026, 9, 10, 15, 0, 0)
const MIN = 60_000
const foto = (i: number, p: Partial<FotoPaseo> = {}): FotoPaseo => ({
  id: `f${i}`,
  jobId: 'job1',
  t: T0 + i * MIN,
  codigo: codigoDeFotos('job1'),
  ubicacion: null,
  sinUbicacion: 'omitida',
  bytes: 90_000,
  almacen: 'indexeddb',
  ...p,
})
const enSpot = (id: string): LatLng => SPOTS.find((s) => s.id === id)!.pos
const SI = DISTRICTS.find((d) => d.id === 'san-isidro')!
const sur = SI.polygon.reduce((m, p) => (p[0] < m[0] ? p : m))
const pintar = (fotos: FotoPaseo[], extra: { compacto?: boolean } = {}) =>
  renderToStaticMarkup(<FotosPaseo fotos={fotos} perro="Max" jobId="job1" {...extra} />)
const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

describe('«Fotos del paseo» del dueño', () => {
  it('sin fotos: «Aún no hay fotos.» y el código del paseo para comparar', () => {
    const h = pintar([])
    expect(h).toContain('Aún no hay fotos.')
    expect(h).toContain(`>${codigoDeFotos('job1')}<`)
    expect(h).toContain(TEXTO_FOTOS.codigoDueno)
    expect(h).toContain(contadorFotos(0, CONFIG.maxFotosPorPaseo))
  })

  it('a la vista (no escondido en «Ver más»): quién pone la hora y el lugar, y que hoy solo llegan en el mismo navegador', () => {
    const h = pintar([foto(1)])
    const antesDelVerMas = h.slice(0, h.indexOf('<details'))
    expect(antesDelVerMas).toContain(TEXTO_FOTOS.avisoDueno)
    expect(texto(antesDelVerMas)).toContain('mismo navegador')
  })

  it('cada foto con su hora y su lugar: dentro de la zona dice el distrito y el parque', () => {
    const h = texto(pintar([foto(1, { ubicacion: { pos: enSpot('olivar'), lecturaT: T0 }, sinUbicacion: undefined })]))
    expect(h).toContain('En San Isidro, cerca del Bosque El Olivar')
    expect(h).toMatch(/\d{1,2}:\d{2}/)
    expect(h).toContain(contadorFotos(1, CONFIG.maxFotosPorPaseo))
  })

  it('en el borde, fuera y sin ubicación lo dice, y por qué no hay ubicación', () => {
    const h = texto(
      pintar([
        foto(1, { ubicacion: { pos: desplazar(sur, 0, -200), lecturaT: T0 }, sinUbicacion: undefined }),
        foto(2, { ubicacion: { pos: [-12.1219, -77.0297], lecturaT: T0 }, sinUbicacion: undefined }),
        foto(3, { ubicacion: null, sinUbicacion: 'negada' }),
      ]),
    )
    expect(h).toContain('En el borde de la zona')
    expect(h).toContain('Fuera de la zona')
    expect(h).toContain('Sin ubicación')
    expect(h).toContain('El paseador no dio el permiso.')
  })

  it('nunca escribe coordenadas', () => {
    const fotos = [
      foto(1, { ubicacion: { pos: enSpot('olivar'), lecturaT: T0 }, sinUbicacion: undefined }),
      foto(2, { ubicacion: { pos: [-12.1219, -77.0297], lecturaT: T0 - 20 * MIN, demo: true }, sinUbicacion: undefined }),
    ]
    expect(texto(pintar(fotos))).not.toMatch(/-?\d{1,3}\.\d{3,}/)
  })

  it('si el código de la foto no es el del paseo, se avisa', () => {
    const otro = codigoDeFotos('job1') === '10' ? '11' : '10'
    const h = texto(pintar([foto(1, { codigo: otro })]))
    expect(h).toContain('El código no coincide con el del paseo.')
    expect(texto(pintar([foto(1)]))).not.toContain(TEXTO_FOTOS.codigoNoCoincide)
  })

  it('la más nueva va primero', () => {
    const h = pintar([foto(1, { codigo: '11' }), foto(5, { codigo: '55' })])
    expect(h.indexOf('Código 55')).toBeLessThan(h.indexOf('Código 11'))
  })

  it('compacto (la hoja de confirmar): las dos últimas a la vista y las demás en «Ver las N anteriores»', () => {
    const cinco = [1, 2, 3, 4, 5].map((i) => foto(i, { codigo: `${i}${i}` }))
    const h = pintar(cinco, { compacto: true })
    const vista = h.slice(0, h.indexOf('Ver las 3 anteriores'))
    expect(vista).toContain('Código 55')
    expect(vista).toContain('Código 44')
    expect(vista).not.toContain('Código 33')
    expect(h).toContain('Ver las 3 anteriores')
    expect(h).toContain('Código 11')
    // sin la explicación larga a la vista; el aviso corto sí
    expect(texto(vista)).toContain(TEXTO_FOTOS.avisoDuenoCorto)
    expect(texto(vista)).not.toContain('mismo navegador')
  })

  it('compacto con dos fotos o menos: no hay «anteriores»', () => {
    expect(pintar([foto(1), foto(2)], { compacto: true })).not.toContain('anteriores')
  })

  it('el «Ver más» es honesto y no usa palabras que prometen de más', () => {
    const h = texto(pintar([foto(1)]))
    expect(h).toContain('Qué son estas fotos')
    expect(h).toContain('Son solo señales')
    expect(h).toContain('se pueden alterar')
    expect(h).toContain('entre dos celulares hace falta servidor')
    expect(h).not.toMatch(/\bpruebas?\b|verificad|garantiz|\bseguro\b|tiempo real|24\/7/i)
  })
})

describe('lo que ya no está en la pantalla', () => {
  const RAIZ = path.resolve(__dirname, '..')
  const leer = (f: string) => fs.readFileSync(path.join(RAIZ, f), 'utf8')

  it('no quedan «fotos recibidas» fijas ni ilustraciones de relleno', () => {
    for (const f of ['components/LiveWalk.tsx', 'components/ConfirmSheet.tsx', 'components/PatitasApp.tsx', 'components/ChatThread.tsx', 'lib/walk.ts']) {
      const src = leer(f)
      expect(src, f).not.toMatch(/DogPhoto/)
      expect(src, f).not.toMatch(/fotos? recibidas?/i)
      expect(src, f).not.toMatch(/Fotos de ejemplo/)
    }
    expect(leer('components/ui/Dog.tsx')).not.toMatch(/Bosque El Olivar/)
  })

  it('las fotos del paseo solo salen de la cámara de la app: sin campo de archivo ni «capture» en la vista del paseador', () => {
    for (const f of ['components/walker/WalkerHome.tsx', 'components/walker/CamaraPaseo.tsx', 'components/walker/FotosDelPaseador.tsx']) {
      const src = leer(f)
      expect(src, f).not.toMatch(/type="file"|capture=|<input[^>]*accept=/)
    }
    expect(leer('components/walker/useCamara.ts')).toContain('getUserMedia')
  })
})
