import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CONFIG } from '@/lib/config'
import { codigoDeFotos, type FotoPaseo } from '@/lib/fotos'
import { contadorFotos, TEXTO_FOTOS } from '@/lib/fotosTextos'
import { FotosDelPaseador } from './FotosDelPaseador'
import { CamaraPaseo } from './CamaraPaseo'
import { textoDelSello } from './capturarFoto'

const T0 = Date.UTC(2026, 9, 10, 15, 0, 0)
const foto = (i: number, p: Partial<FotoPaseo> = {}): FotoPaseo => ({
  id: `f${i}`,
  jobId: 'job1',
  t: T0 + i * 60_000,
  codigo: codigoDeFotos('job1'),
  ubicacion: null,
  sinUbicacion: 'sin_lectura',
  bytes: 90_000,
  almacen: 'indexeddb',
  ...p,
})
const tarjeta = (fotos: FotoPaseo[], extra: Partial<Parameters<typeof FotosDelPaseador>[0]> = {}) =>
  renderToStaticMarkup(
    <FotosDelPaseador jobId="job1" fotos={fotos} tope={CONFIG.maxFotosPorPaseo} errorCamara={null} mensaje={null} onTomar={() => {}} {...extra} />,
  )

describe('«Fotos del paseo» del paseador', () => {
  it('sin fotos: «Aún no hay fotos.», el código del paseo y el botón de la cámara', () => {
    const h = tarjeta([])
    expect(h).toContain('Aún no hay fotos.')
    expect(h).toContain('Tomar foto')
    expect(h).toContain(`>${codigoDeFotos('job1')}<`)
    expect(h).toContain('La app lo pone en cada foto.')
    expect(h).toContain(contadorFotos(0, CONFIG.maxFotosPorPaseo))
  })

  it('a la vista: hoy el dueño las ve solo si usan el mismo navegador', () => {
    const h = tarjeta([])
    expect(h.slice(0, h.indexOf('<details'))).toContain(TEXTO_FOTOS.avisoPaseador)
  })

  it('con fotos: cuenta cuántas lleva y las muestra con su hora', () => {
    const h = tarjeta([foto(1), foto(2)])
    expect(h).toContain(contadorFotos(2, CONFIG.maxFotosPorPaseo))
    expect(h).not.toContain('Aún no hay fotos.')
    expect(h).toContain('Sin ubicación')
  })

  it('debajo de cada miniatura, el lugar en dos o tres palabras (nunca coordenadas)', () => {
    const h = tarjeta([
      foto(1, { ubicacion: { pos: [-12.1219, -77.0297], lecturaT: T0 }, sinUbicacion: undefined }),
      foto(2),
    ])
    expect(h).toContain('Fuera de la zona')
    expect(h).toContain('Sin ubicación')
    expect(h.replace(/<[^>]+>/g, ' ')).not.toMatch(/-?\d{1,3}\.\d{3,}/)
  })

  it('con el tope lleno, el botón se apaga y lo dice', () => {
    const lleno = Array.from({ length: CONFIG.maxFotosPorPaseo }, (_, i) => foto(i))
    const h = tarjeta(lleno)
    expect(h).toContain(`Llegaste a las ${CONFIG.maxFotosPorPaseo} fotos`)
    expect(h).toMatch(/<button[^>]*\sdisabled=""/)
  })

  it('si la cámara no abrió, dice por qué y cómo arreglarlo', () => {
    const h = tarjeta([], { errorCamara: 'negada' })
    expect(h).toContain('Sin cámara: no diste el permiso.')
    expect(h).toContain('Permítela en los ajustes del navegador')
  })

  it('si no hay espacio, lo dice con una frase corta', () => {
    const h = tarjeta([], { mensaje: 'No hay espacio en el teléfono. Libera espacio y vuelve a intentar.' })
    expect(h).toContain('No hay espacio en el teléfono.')
    expect(h).toContain(TEXTO_FOTOS.paseoSigue)
  })

  it('el «Ver más» es honesto: señales, hora y lugar los pone el teléfono, falta servidor entre celulares', () => {
    const h = tarjeta([])
    expect(h).toContain('Qué son estas fotos')
    expect(h).toContain('Son solo señales')
    expect(h).toContain('se pueden alterar')
    expect(h).toContain('entre dos celulares hace falta servidor')
    expect(h.replace(/<[^>]+>/g, ' ')).not.toMatch(/\bpruebas?\b|verificad|garantiz|\bseguro\b|tiempo real/i)
  })
})

describe('la cámara', () => {
  it('abre con «Abriendo la cámara…», un solo botón y sin galería (no hay campo de archivo)', () => {
    const h = renderToStaticMarkup(<CamaraPaseo codigo="47" onFoto={async () => ({ ok: true })} onCerrar={() => {}} />)
    expect(h).toContain('Abriendo la cámara…')
    expect(h).toContain('aria-label="Sacar foto"')
    expect(h).not.toContain('type="file"')
    expect(h).not.toMatch(/capture=|accept="image/)
  })

  it('el botón de sacar foto está apagado hasta que la cámara está lista', () => {
    const h = renderToStaticMarkup(<CamaraPaseo codigo="47" onFoto={async () => ({ ok: true })} onCerrar={() => {}} />)
    expect(h).toMatch(/<button[^>]*aria-label="Sacar foto"[^>]*>|<button[^>]*\sdisabled=""[^>]*aria-label="Sacar foto"/)
    expect(h).toMatch(/disabled=""[^>]*aria-label="Sacar foto"|aria-label="Sacar foto"[^>]*disabled=""/)
  })

  it('lo que se estampa es el código del paseo', () => {
    expect(textoDelSello('47')).toBe('Código 47')
  })
})

describe('el punto de control en la tarjeta del paseador', () => {
  it('dice que su ubicación se guarda al empezar, al terminar y en cada foto', () => {
    expect(tarjeta([])).toContain('Guardamos tu ubicación al empezar, al terminar y en cada foto.')
  })

  it('antes de que toque, dice en cuántos minutos es la próxima foto de control', () => {
    const h = tarjeta([], { control: { faltanMin: 7 } })
    expect(h).toContain('Próxima foto de control en 7 min.')
    expect(h).not.toContain('Toca una foto de control.')
  })

  it('cuando toca, el recordatorio es suave: una frase y el botón; el paseo no se bloquea', () => {
    const h = tarjeta([], { control: { faltanMin: 0 } })
    expect(h).toContain('Toca una foto de control.')
    expect(h).toContain('Una foto rápida y sigues paseando.')
    expect(h).toContain('Tomar foto')
    expect(h).not.toContain('disabled=""')
  })

  it('si el paseo todavía no empezó (no hay hora de inicio), no dice nada del control', () => {
    const h = tarjeta([], { control: { faltanMin: null } })
    expect(h).not.toContain('foto de control')
  })

  it('el «Ver más» dice la frase del seguimiento y que la pantalla apagada no sigue la ubicación', () => {
    const h = tarjeta([])
    expect(h).toContain('El seguimiento es por puntos de control con foto.')
    expect(h).toContain('Con la pantalla apagada el teléfono no sigue tu ubicación.')
  })
})
