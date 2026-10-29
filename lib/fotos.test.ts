import { describe, expect, it } from 'vitest'
import { CONFIG } from './config'
import { DISTRICTS, HOME_POINT, SPOTS, type LatLng } from './geo'
import { codigoCoincide, codigoDeFotos, dimensionesFoto, errorDeCamara, fotosDe, lugarDeFoto, quedanFotos, ubicacionParaFoto, type FotoPaseo } from './fotos'
import { desplazar, distanciaMetros, nuevaVigilancia, type Vigilancia } from './zona'

const T0 = Date.UTC(2026, 9, 10, 15, 0, 0)
const MIN = 60_000

const foto = (p: Partial<FotoPaseo> = {}): FotoPaseo => ({
  id: 'f1',
  jobId: 'job1',
  t: T0,
  codigo: codigoDeFotos('job1'),
  ubicacion: null,
  sinUbicacion: 'sin_lectura',
  bytes: 90_000,
  almacen: 'indexeddb',
  ...p,
})
const enSpot = (id: string): LatLng => SPOTS.find((s) => s.id === id)!.pos
const SI = DISTRICTS.find((d) => d.id === 'san-isidro')!
const sur = SI.polygon.reduce((m, p) => (p[0] < m[0] ? p : m))

describe('el código de 2 dígitos', () => {
  it('siempre son dos dígitos, de 10 a 99', () => {
    for (let i = 0; i < 2000; i++) {
      const c = codigoDeFotos(`${Date.now().toString(36)}${i}${Math.random().toString(36).slice(2, 6)}`)
      expect(c).toMatch(/^[1-9]\d$/)
    }
  })

  it('es el mismo para el mismo paseo (así la app del dueño y la del paseador lo calculan igual)', () => {
    expect(codigoDeFotos('abc123')).toBe(codigoDeFotos('abc123'))
  })

  it('cambia de un paseo a otro (no es un número fijo)', () => {
    const codigos = new Set(Array.from({ length: 60 }, (_, i) => codigoDeFotos(`paseo-${i}`)))
    expect(codigos.size).toBeGreaterThan(20)
  })

  it('la foto «coincide» con el código de su paseo; si no, se nota', () => {
    expect(codigoCoincide(foto())).toBe(true)
    const otro = codigoDeFotos('job1') === '10' ? '11' : '10'
    expect(codigoCoincide(foto({ codigo: otro }))).toBe(false)
  })
})

describe('qué ubicación lleva la foto', () => {
  const conLectura = (demo?: boolean): Vigilancia => ({
    ...nuevaVigilancia(),
    ultima: { pos: HOME_POINT, precisionM: 12, t: T0 - MIN },
    ...(demo ? { demo: true } : {}),
  })

  it('con una lectura válida: la última, con su hora', () => {
    expect(ubicacionParaFoto({ vigilancia: conLectura(), ubicacion: 'activa' })).toMatchObject({ ubicacion: { pos: HOME_POINT, lecturaT: T0 - MIN } })
  })

  it('si la lectura vino de una prueba de la demostración, lo dice', () => {
    expect(ubicacionParaFoto({ vigilancia: conLectura(true), ubicacion: 'activa' }).ubicacion?.demo).toBe(true)
  })

  it('sin permiso, o «Ahora no», o sin soporte: «Sin ubicación» y se anota por qué', () => {
    expect(ubicacionParaFoto({ ubicacion: 'negada' })).toEqual({ ubicacion: null, sinUbicacion: 'negada' })
    expect(ubicacionParaFoto({ ubicacion: 'omitida' })).toEqual({ ubicacion: null, sinUbicacion: 'omitida' })
    expect(ubicacionParaFoto({ ubicacion: 'no_disponible' })).toEqual({ ubicacion: null, sinUbicacion: 'no_disponible' })
  })

  it('con permiso pero todavía sin ninguna lectura (o sin haber elegido): «sin lectura»', () => {
    expect(ubicacionParaFoto({ ubicacion: 'activa', vigilancia: nuevaVigilancia() })).toEqual({ ubicacion: null, sinUbicacion: 'sin_lectura' })
    expect(ubicacionParaFoto({})).toEqual({ ubicacion: null, sinUbicacion: 'sin_lectura' })
  })
})

describe('el lugar que lee el dueño', () => {
  const lugar = (pos: LatLng, extra: Partial<FotoPaseo> = {}) => lugarDeFoto(foto({ ubicacion: { pos, lecturaT: T0 }, sinUbicacion: undefined, ...extra }))

  it('dentro de San Isidro y cerca de un parque: «En San Isidro, cerca del Bosque El Olivar»', () => {
    const l = lugar(enSpot('olivar'))
    expect(l.texto).toBe('En San Isidro, cerca del Bosque El Olivar')
    expect(l.conLugar).toBe(true)
  })

  it('dentro de Jesús María: el distrito y el parque (con el artículo que corresponde)', () => {
    expect(lugar(enSpot('campo-de-marte')).texto).toBe('En Jesús María, cerca del Campo de Marte')
    expect(lugar(enSpot('habich')).texto).toBe('En Jesús María, cerca del Parque Habich')
  })

  it('dentro de la zona pero lejos de todo parque: solo el distrito', () => {
    // un punto de San Isidro a más de 300 m de cualquier parque (se comprueba en la propia prueba)
    const candidatos: LatLng[] = [SI.center, desplazar(SI.center, 200, 120), desplazar(SI.center, -250, 80), desplazar(SI.center, 0, 260)]
    const lejos = candidatos.find((p) => SPOTS.every((s) => distanciaMetros(p, s.pos) > CONFIG.metrosCercaDeParque))
    expect(lejos, 'hace falta un punto de prueba lejos de los parques').toBeDefined()
    expect(lugar(lejos!).texto).toBe('En San Isidro')
  })

  it('en el borde: lo dice, sin distrito ni parque', () => {
    expect(lugar(desplazar(sur, 0, -200)).texto).toBe('En el borde de la zona')
  })

  it('fuera de la zona: lo dice y no inventa un lugar', () => {
    const l = lugar([-12.1219, -77.0297]) // Miraflores
    expect(l.texto).toBe('Fuera de la zona')
    expect(l.conLugar).toBe(false)
  })

  it('sin ubicación: «Sin ubicación» y por qué', () => {
    const l = lugarDeFoto(foto({ ubicacion: null, sinUbicacion: 'negada' }))
    expect(l).toMatchObject({ texto: 'Sin ubicación', conLugar: false })
    expect(l.nota).toMatch(/no dio el permiso/)
    expect(lugarDeFoto(foto({ ubicacion: null, sinUbicacion: 'sin_lectura' })).nota).toMatch(/Todavía no había/)
  })

  it('nunca muestra coordenadas crudas', () => {
    for (const pos of [enSpot('olivar'), enSpot('campo-de-marte'), desplazar(sur, 0, -200), [-12.1219, -77.0297] as LatLng, HOME_POINT]) {
      const l = lugar(pos, { ubicacion: { pos, lecturaT: T0 - 10 * MIN, demo: true } })
      expect(`${l.texto} ${l.nota ?? ''}`).not.toMatch(/-?\d{1,3}\.\d{2,}/)
    }
  })

  it('si la lectura es vieja, dice de hace cuánto; si es de demostración, también', () => {
    const vieja = lugarDeFoto(foto({ ubicacion: { pos: enSpot('olivar'), lecturaT: T0 - 8 * MIN }, sinUbicacion: undefined }))
    expect(vieja.nota).toBe('Ubicación de hace 8 min.')
    const reciente = lugarDeFoto(foto({ ubicacion: { pos: enSpot('olivar'), lecturaT: T0 - MIN }, sinUbicacion: undefined }))
    expect(reciente.nota).toBeUndefined()
    const demo = lugarDeFoto(foto({ ubicacion: { pos: enSpot('olivar'), lecturaT: T0, demo: true }, sinUbicacion: undefined }))
    expect(demo.nota).toBe('Ubicación de demostración.')
  })
})

describe('tamaño de la foto y tope por paseo', () => {
  it('el lado mayor queda en 800 px y se mantiene la forma', () => {
    expect(dimensionesFoto(1920, 1080)).toEqual({ w: 800, h: 450 })
    expect(dimensionesFoto(1080, 1920)).toEqual({ w: 450, h: 800 })
    expect(dimensionesFoto(4000, 3000)).toEqual({ w: 800, h: 600 })
  })

  it('una foto chica no se agranda', () => {
    expect(dimensionesFoto(640, 480)).toEqual({ w: 640, h: 480 })
  })

  it('las fotos de un paseo salen en orden, y no se mezclan con las de otro', () => {
    const lista = [foto({ id: 'b', t: T0 + 2 * MIN }), foto({ id: 'a', t: T0 + MIN }), foto({ id: 'z', jobId: 'otro' })]
    expect(fotosDe(lista, 'job1').map((f) => f.id)).toEqual(['a', 'b'])
    expect(fotosDe(lista, null)).toEqual([])
  })

  it('el tope sale de la configuración', () => {
    const lista = Array.from({ length: CONFIG.maxFotosPorPaseo }, (_, i) => foto({ id: `f${i}` }))
    expect(quedanFotos(lista.slice(1), 'job1')).toBe(true)
    expect(quedanFotos(lista, 'job1')).toBe(false)
  })
})

describe('por qué no abrió la cámara', () => {
  const con = (name: string) => errorDeCamara({ name })

  it('permiso negado', () => {
    expect(con('NotAllowedError')).toBe('negada')
    expect(con('PermissionDeniedError')).toBe('negada')
  })

  it('sin cámara, otra app la usa, conexión no segura y lo demás', () => {
    expect(con('NotFoundError')).toBe('sin_camara')
    expect(con('NotReadableError')).toBe('ocupada')
    expect(con('SecurityError')).toBe('sin_https')
    expect(con('LoQueSea')).toBe('error')
    expect(errorDeCamara(null)).toBe('error')
  })
})
