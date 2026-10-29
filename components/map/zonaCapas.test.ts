import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { DISTRICTS } from '@/lib/geo'
import { dibujarZona } from './zonaCapas'
import type { LeafletLib } from './useLeaflet'

/** Un Leaflet de mentira que solo anota qué se dibujó (el de verdad necesita un navegador). */
function falsoLeaflet() {
  const dibujos: Array<{ rings: unknown[]; opciones: Record<string, unknown>; tooltip?: string }> = []
  const grupo = { addTo: () => grupo, remove: () => undefined }
  const L = {
    featureGroup: () => grupo,
    polygon: (rings: unknown[], opciones: Record<string, unknown>) => {
      const d = { rings, opciones } as (typeof dibujos)[number]
      dibujos.push(d)
      const capa = {
        addTo: () => capa,
        bindTooltip: (texto: string) => {
          d.tooltip = texto
          return capa
        },
      }
      return capa
    },
  }
  return { L: L as unknown as LeafletLib, dibujos }
}

describe('dibujarZona', () => {
  it('tapa lo de afuera con un velo que tiene un hueco por distrito y no recibe toques', () => {
    const { L, dibujos } = falsoLeaflet()
    dibujarZona(L, {} as never)
    const velo = dibujos[0]
    expect(velo.rings).toHaveLength(1 + DISTRICTS.length)
    expect(velo.rings.slice(1)).toEqual(DISTRICTS.map((d) => d.polygon))
    expect(velo.opciones.interactive).toBe(false)
    expect(velo.opciones.stroke).toBe(false)
  })

  it('dibuja cada distrito con su polígono real y un borde claro (sin línea punteada)', () => {
    const { L, dibujos } = falsoLeaflet()
    dibujarZona(L, {} as never)
    const bordes = dibujos.filter((d) => d.opciones.fill !== false && d !== dibujos[0])
    expect(bordes.map((d) => d.rings)).toEqual(DISTRICTS.map((d) => d.polygon))
    for (const b of bordes) {
      expect(b.opciones.dashArray).toBeUndefined()
      expect(b.opciones.weight).toBeGreaterThanOrEqual(3)
    }
  })

  it('con un distrito destacado, el otro baja de intensidad', () => {
    const { L, dibujos } = falsoLeaflet()
    dibujarZona(L, {} as never, { destacado: 'San Isidro' })
    const [si, jm] = dibujos.filter((d) => d.opciones.fill !== false && d !== dibujos[0])
    expect(si.rings).toEqual(DISTRICTS[0].polygon)
    expect(Number(si.opciones.weight)).toBeGreaterThan(Number(jm.opciones.weight))
  })

  it('el nombre del distrito sobre el mapa es opcional', () => {
    const sin = falsoLeaflet()
    dibujarZona(sin.L, {} as never)
    expect(sin.dibujos.some((d) => d.tooltip)).toBe(false)
    const con = falsoLeaflet()
    dibujarZona(con.L, {} as never, { etiquetas: true })
    expect(con.dibujos.map((d) => d.tooltip).filter(Boolean)).toEqual(DISTRICTS.map((d) => d.name))
  })
})

describe('los dos mapas usan la zona real', () => {
  const RAIZ = path.resolve(__dirname, '../..')
  const leer = (f: string) => fs.readFileSync(path.join(RAIZ, f), 'utf8')

  it('ZonesMap y LiveMap dibujan la zona con dibujarZona', () => {
    for (const f of ['components/ZonesMap.tsx', 'components/LiveMap.tsx']) expect(leer(f), f).toContain('dibujarZona(')
  })

  it('ninguno de los mapas de zona dibuja un círculo ni un margen inventado (el margen de 300 m se usa solo en la lógica; el círculo de «zona aproximada» del paseador es otro mapa: components/map/MapaZona.tsx)', () => {
    for (const f of ['components/ZonesMap.tsx', 'components/LiveMap.tsx', 'components/map/zonaCapas.ts']) {
      // `radius:` como opción de Leaflet (no `border-radius:` de un estilo)
      expect(leer(f), f).not.toMatch(/L\.circle\(|(?<![-\w])radius\s*:/)
    }
    // El dibujo no lee la configuración del margen; ZonesMap la lee solo para escribir el número en un texto.
    for (const f of ['components/LiveMap.tsx', 'components/map/zonaCapas.ts']) expect(leer(f), f).not.toMatch(/from '@\/lib\/config'/)
    const conLeaflet = leer('components/ZonesMap.tsx')
      .split('\n')
      .filter((l) => /zonaBufferMetros/.test(l) && /\bL\./.test(l))
    expect(conLeaflet).toEqual([])
  })
})
