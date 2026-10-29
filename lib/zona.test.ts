import { describe, expect, it } from 'vitest'
import { CONFIG } from './config'
import { WALKERS } from './data'
import { DISTRICTS, HOME_POINT, SPOTS, type LatLng } from './geo'
import {
  aristasExteriores,
  bloqueoPorZona,
  bordeMasCercano,
  clasificarPunto,
  desplazar,
  distanciaAlBordeMetros,
  distanciaMetros,
  redondearZona,
  distritoDe,
  enZona,
  evaluarLectura,
  evaluarLecturas,
  NIVEL_AVISO,
  nuevaVigilancia,
  parquesEnZona,
  puntoEnPoligono,
  sePuedeAtender,
  type Lectura,
  type TipoAviso,
  vectorMetros,
} from './zona'

const SI = DISTRICTS.find((d) => d.id === 'san-isidro')!
const JM = DISTRICTS.find((d) => d.id === 'jesus-maria')!

/** El vértice más al sur de un distrito (el borde de la zona queda a su sur: sirve para medir «hacia afuera»). */
const masAlSur = (poligono: LatLng[]) => poligono.reduce((m, p) => (p[0] < m[0] ? p : m))
/** El vértice más al norte. */
const masAlNorte = (poligono: LatLng[]) => poligono.reduce((m, p) => (p[0] > m[0] ? p : m))

describe('la configuración de la zona', () => {
  it('el margen es de 300 m y los avisos tienen sus umbrales en lib/config.ts', () => {
    expect(CONFIG.zonaBufferMetros).toBe(300)
    expect(CONFIG.precisionMaximaMetros).toBe(50)
    expect(CONFIG.avisoBordeMetros).toBe(100)
    expect(CONFIG.lecturasFueraParaAlerta).toBe(2)
    expect(CONFIG.velocidadMaximaKmh).toBe(15)
    expect(CONFIG.minutosQuietoParaAviso).toBe(10)
  })
})

describe('puntoEnPoligono', () => {
  const cuadrado: LatLng[] = [
    [0, 0],
    [0, 10],
    [10, 10],
    [10, 0],
  ]
  const ele: LatLng[] = [
    [0, 0],
    [0, 10],
    [4, 10],
    [4, 4],
    [10, 4],
    [10, 0],
  ]

  it('adentro y afuera de un cuadrado', () => {
    expect(puntoEnPoligono([5, 5], cuadrado)).toBe(true)
    expect(puntoEnPoligono([11, 5], cuadrado)).toBe(false)
    expect(puntoEnPoligono([5, -1], cuadrado)).toBe(false)
  })

  it('un polígono cóncavo (en L) no cuenta el hueco como adentro', () => {
    expect(puntoEnPoligono([2, 8], ele)).toBe(true)
    expect(puntoEnPoligono([8, 2], ele)).toBe(true)
    expect(puntoEnPoligono([8, 8], ele)).toBe(false)
  })

  it('da lo mismo si el polígono repite el primer punto al final (como los de OpenStreetMap)', () => {
    const cerrado = [...cuadrado, cuadrado[0]]
    for (const p of [[5, 5], [11, 5], [-1, -1]] as LatLng[]) expect(puntoEnPoligono(p, cerrado)).toBe(puntoEnPoligono(p, cuadrado))
  })
})

describe('clasificarPunto con los datos reales', () => {
  it('todos los parques están dentro, cada uno en su distrito', () => {
    for (const s of SPOTS) {
      const d = DISTRICTS.find((x) => x.name === s.district)!
      expect(puntoEnPoligono(s.pos, d.polygon), s.id).toBe(true)
      expect(clasificarPunto(s.pos), s.id).toBe('dentro')
    }
  })

  it('la casa de la demostración y el centro de cada distrito están dentro', () => {
    expect(clasificarPunto(HOME_POINT)).toBe('dentro')
    expect(puntoEnPoligono(HOME_POINT, SI.polygon)).toBe(true)
    for (const d of DISTRICTS) expect(clasificarPunto(d.center), d.id).toBe('dentro')
  })

  it('los parques que usan los paseadores de ejemplo existen y están dentro', () => {
    const ids = new Set(SPOTS.map((s) => s.id))
    for (const w of WALKERS) {
      for (const id of w.spots) {
        expect(ids.has(id), `${w.firstName}: ${id}`).toBe(true)
        expect(sePuedeAtender(SPOTS.find((s) => s.id === id)!.pos), `${w.firstName}: ${id}`).toBe(true)
      }
    }
  })

  /**
   * Sitios conocidos de afuera (coordenadas aproximadas, de referencias públicas; basta que estén a kilómetros):
   *  - Parque Kennedy, Miraflores (≈ −12,1219; −77,0297): 1,2 km al sur de San Isidro.
   *  - Aeropuerto Jorge Chávez, Callao (≈ −12,0219; −77,1144): 6 km al oeste.
   *  - Jockey Plaza, Santiago de Surco (≈ −12,0847; −76,9758): 3,5 km al este.
   */
  it('Miraflores, el Callao y Surco están fuera', () => {
    const afuera: Array<[string, LatLng]> = [
      ['Parque Kennedy (Miraflores)', [-12.1219, -77.0297]],
      ['Aeropuerto Jorge Chávez (Callao)', [-12.0219, -77.1144]],
      ['Jockey Plaza (Surco)', [-12.0847, -76.9758]],
    ]
    for (const [nombre, p] of afuera) {
      expect(enZona(p), nombre).toBe(false)
      expect(clasificarPunto(p), nombre).toBe('fuera')
      expect(distanciaAlBordeMetros(p), nombre).toBeGreaterThan(1000)
      expect(sePuedeAtender(p), nombre).toBe(false)
    }
  })

  it('los vértices de los polígonos (el límite exacto) nunca son «fuera»', () => {
    for (const d of DISTRICTS) {
      for (const v of d.polygon) expect(clasificarPunto(v), `${d.id} ${v}`).not.toBe('fuera')
    }
  })

  it('hacia afuera: a 200 m del borde es «borde» y a 400 m es «fuera» (San Isidro, al sur)', () => {
    const v = masAlSur(SI.polygon)
    const a200 = desplazar(v, 0, -200)
    const a400 = desplazar(v, 0, -400)
    expect(distanciaAlBordeMetros(a200)).toBeCloseTo(200, 0)
    expect(distanciaAlBordeMetros(a400)).toBeCloseTo(400, 0)
    expect(clasificarPunto(a200)).toBe('borde')
    expect(clasificarPunto(a400)).toBe('fuera')
  })

  it('hacia afuera: lo mismo en Jesús María, al norte', () => {
    const v = masAlNorte(JM.polygon)
    expect(clasificarPunto(desplazar(v, 0, 200))).toBe('borde')
    expect(clasificarPunto(desplazar(v, 0, 400))).toBe('fuera')
  })

  it('justo en el margen: 290 m es «borde» y 310 m es «fuera»', () => {
    const v = masAlSur(SI.polygon)
    expect(clasificarPunto(desplazar(v, 0, -290))).toBe('borde')
    expect(clasificarPunto(desplazar(v, 0, -310))).toBe('fuera')
  })

  it('el margen se puede cambiar (se lee de la configuración, no está escrito en la función)', () => {
    const p = desplazar(masAlSur(SI.polygon), 0, -200)
    expect(clasificarPunto(p, 100)).toBe('fuera')
    expect(clasificarPunto(p, 500)).toBe('borde')
  })
})

describe('el borde de la zona es el borde de los dos distritos juntos', () => {
  const tot = SI.polygon.length + JM.polygon.length

  it('la frontera entre San Isidro y Jesús María no cuenta como borde', () => {
    const exteriores = aristasExteriores()
    expect(exteriores.length).toBeLessThan(tot)
    // Las aristas compartidas (5 idénticas en los datos) salen de las dos listas: 10 aristas menos.
    expect(tot - exteriores.length).toBeGreaterThanOrEqual(10)
  })

  it('un punto sobre la frontera, de cualquier lado, está lejos del borde exterior', () => {
    // La arista más larga que comparten los dos distritos.
    const a: LatLng = [-12.0867, -77.0499]
    const b: LatLng = [-12.09307, -77.05322]
    const enSI = SI.polygon.some((p) => p[0] === a[0] && p[1] === a[1]) && SI.polygon.some((p) => p[0] === b[0] && p[1] === b[1])
    const enJM = JM.polygon.some((p) => p[0] === a[0] && p[1] === a[1]) && JM.polygon.some((p) => p[0] === b[0] && p[1] === b[1])
    expect(enSI && enJM).toBe(true)
    const medio: LatLng = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
    expect(enZona(medio)).toBe(true)
    // 30 m a cada lado de la frontera: sigue dentro de la zona y lejos de salir de ella.
    for (const lado of [30, -30]) {
      const p = desplazar(medio, lado, 0)
      expect(clasificarPunto(p)).toBe('dentro')
      expect(distanciaAlBordeMetros(p)).toBeGreaterThan(300)
    }
  })

  it('bordeMasCercano devuelve el punto del borde y su distancia', () => {
    const v = masAlSur(SI.polygon)
    const desde = desplazar(v, 0, -150)
    const { punto, metros } = bordeMasCercano(desde)
    expect(metros).toBeCloseTo(150, 0)
    expect(distanciaMetros(punto, v)).toBeLessThan(2)
  })
})

describe('desplazar y distanciaMetros', () => {
  it('son inversas: 300 m al este y 400 m al norte quedan a 500 m', () => {
    const p = desplazar(HOME_POINT, 300, 400)
    expect(distanciaMetros(HOME_POINT, p)).toBeCloseTo(500, 0)
  })

  it('una cuadra al norte son unos 100 m (0,0009° de latitud)', () => {
    const p: LatLng = [HOME_POINT[0] + 0.0009, HOME_POINT[1]]
    expect(distanciaMetros(HOME_POINT, p)).toBeGreaterThan(95)
    expect(distanciaMetros(HOME_POINT, p)).toBeLessThan(105)
  })
})

describe('distritoDe', () => {
  it('dice en qué distrito cae un punto', () => {
    expect(distritoDe(HOME_POINT)).toBe('San Isidro')
    expect(distritoDe(JM.center)).toBe('Jesús María')
  })

  it('en el borde (afuera) devuelve el distrito más cercano', () => {
    const sur = desplazar(masAlSur(SI.polygon), 0, -200)
    expect(distritoDe(sur)).toBe('San Isidro')
    const norte = desplazar(masAlNorte(JM.polygon), 0, 200)
    expect(distritoDe(norte)).toBe('Jesús María')
  })

  it('fuera de la zona no hay distrito', () => {
    expect(distritoDe([-12.1219, -77.0297])).toBeNull()
  })
})

describe('bloqueoPorZona: lo que impide reservar desde una casa', () => {
  it('sin casa marcada: «casa»', () => {
    expect(bloqueoPorZona(undefined)).toBe('casa')
    expect(bloqueoPorZona(null)).toBe('casa')
  })

  it('casa fuera de la zona: «zona»', () => {
    expect(bloqueoPorZona([-12.1219, -77.0297])).toBe('zona')
    expect(bloqueoPorZona(desplazar(masAlSur(SI.polygon), 0, -400))).toBe('zona')
  })

  it('casa dentro o en el borde: se puede reservar', () => {
    expect(bloqueoPorZona(HOME_POINT)).toBeNull()
    expect(bloqueoPorZona(desplazar(masAlSur(SI.polygon), 0, -200))).toBeNull()
  })
})

describe('parquesEnZona: los puntos de paseo del paseador', () => {
  it('todos los parques de la lista se pueden ofrecer', () => {
    expect(parquesEnZona(SPOTS.map((s) => s.id))).toBe(true)
  })

  it('un parque que no existe no se acepta', () => {
    expect(parquesEnZona(['olivar', 'parque-inventado'])).toBe(false)
  })

  it('un parque que quedara fuera no se acepta (con un margen más chico, uno del borde sale)', () => {
    // Con margen 0 solo valen los puntos dentro de los distritos: todos los parques siguen valiendo.
    expect(parquesEnZona(SPOTS.map((s) => s.id), 0)).toBe(true)
  })
})

describe('vectorMetros', () => {
  it('300 m al este y 400 m al norte', () => {
    const p = desplazar(HOME_POINT, 300, 400)
    const [e, n] = vectorMetros(HOME_POINT, p)
    expect(e).toBeCloseTo(300, 1)
    expect(n).toBeCloseTo(400, 1)
  })
})

/* ------------------------------------------------------------------ */
/* Avisos durante el paseo                                              */
/* ------------------------------------------------------------------ */

const T0 = Date.UTC(2026, 9, 10, 15, 0, 0)
const SEG = 1000
const MIN = 60_000
const lect = (pos: [number, number], t: number, precisionM = 10): Lectura => ({ pos, t, precisionM })
/** A `m` metros AFUERA del vértice más al sur de San Isidro (hacia el sur). */
const afuera = (m: number): [number, number] => desplazar(masAlSur(SI.polygon), 0, -m)
const tipos = (r: { avisos: Array<{ tipo: TipoAviso }> }) => r.avisos.map((a) => a.tipo)

describe('avisos: precisión', () => {
  it('una lectura con error de más de 50 m se ignora y no cuenta para nada', () => {
    const v = nuevaVigilancia()
    const r = evaluarLectura(v, lect(afuera(900), T0, 51))
    expect(r.ignorada).toBe('precision')
    expect(r.avisos).toEqual([])
    expect(r.vigilancia.ultima).toBeNull()
    expect(r.vigilancia.seguidasFuera).toBe(0)
    expect(r.vigilancia.ignoradasPrecision).toBe(1)
  })

  it('50 m justos todavía sirven', () => {
    const r = evaluarLectura(nuevaVigilancia(), lect(HOME_POINT, T0, 50))
    expect(r.ignorada).toBeUndefined()
    expect(r.vigilancia.ultima).not.toBeNull()
  })

  it('varias lecturas imprecisas afuera no hacen una alerta de salida', () => {
    const r = evaluarLecturas(nuevaVigilancia(), [lect(afuera(900), T0, 80), lect(afuera(950), T0 + 45 * SEG, 80), lect(afuera(1000), T0 + 90 * SEG, 80)])
    expect(r.avisos).toEqual([])
    expect(r.vigilancia.ignoradasPrecision).toBe(3)
  })
})

describe('avisos: salida de la zona', () => {
  it('una sola lectura fuera no alcanza; dos seguidas dan la alerta, una sola vez', () => {
    let v = nuevaVigilancia()
    let r = evaluarLectura(v, lect(afuera(400), T0))
    expect(r.avisos).toEqual([])
    v = r.vigilancia
    r = evaluarLectura(v, lect(afuera(450), T0 + 45 * SEG))
    expect(tipos(r)).toEqual(['salida'])
    v = r.vigilancia
    r = evaluarLectura(v, lect(afuera(500), T0 + 90 * SEG))
    expect(r.avisos).toEqual([])
  })

  it('«fuera», adentro y «fuera» otra vez: el conteo se reinicia, no hay alerta', () => {
    const r = evaluarLecturas(nuevaVigilancia(), [
      lect(afuera(400), T0),
      lect(afuera(250), T0 + 45 * SEG), // en el margen: ya no es «fuera»
      lect(afuera(400), T0 + 90 * SEG),
    ])
    expect(tipos(r)).not.toContain('salida')
    expect(r.vigilancia.seguidasFuera).toBe(1)
  })

  it('al volver a la zona avisa «regreso» y la alerta se vuelve a armar', () => {
    const r = evaluarLecturas(nuevaVigilancia(), [
      lect(afuera(400), T0),
      lect(afuera(450), T0 + 45 * SEG), // salida
      lect(afuera(360), T0 + 90 * SEG),
      lect(afuera(260), T0 + 135 * SEG), // regreso (ya en el margen)
      lect(afuera(360), T0 + 180 * SEG),
      lect(afuera(450), T0 + 225 * SEG), // otra salida
    ])
    expect(tipos(r).filter((t) => t === 'salida')).toHaveLength(2)
    expect(tipos(r)).toContain('regreso')
  })

  it('el margen cuenta: a 250 m afuera todavía se atiende y no es salida', () => {
    const r = evaluarLecturas(nuevaVigilancia(), [lect(afuera(250), T0), lect(afuera(255), T0 + 45 * SEG)])
    expect(tipos(r)).not.toContain('salida')
  })
})

describe('avisos: cerca del borde', () => {
  it('a menos de 100 m del borde: aviso suave, una sola vez', () => {
    const r = evaluarLecturas(nuevaVigilancia(), [lect(afuera(80), T0), lect(afuera(70), T0 + 45 * SEG), lect(afuera(60), T0 + 90 * SEG)])
    expect(tipos(r)).toEqual(['borde'])
  })

  it('a 100 m justos todavía no avisa', () => {
    const r = evaluarLectura(nuevaVigilancia(), lect(afuera(100), T0))
    expect(r.avisos).toEqual([])
  })

  it('al alejarse (150 m o más) se vuelve a armar y vuelve a avisar al acercarse', () => {
    const r = evaluarLecturas(nuevaVigilancia(), [
      lect(afuera(80), T0),
      lect(afuera(160), T0 + 45 * SEG),
      lect(afuera(90), T0 + 90 * SEG),
    ])
    expect(tipos(r)).toEqual(['borde', 'borde'])
  })

  it('también avisa estando adentro, cerca del borde', () => {
    const v = masAlSur(SI.polygon)
    const adentro = desplazar(v, 0, 40) // 40 m al norte del vértice más al sur: dentro del distrito
    expect(enZona(adentro)).toBe(true)
    expect(tipos(evaluarLectura(nuevaVigilancia(), lect(adentro, T0)))).toEqual(['borde'])
  })

  it('en el centro del distrito no avisa nada', () => {
    expect(evaluarLectura(nuevaVigilancia(), lect(HOME_POINT, T0)).avisos).toEqual([])
  })
})

describe('avisos: velocidad imposible', () => {
  it('un salto de 2 km en 45 s se descarta y se avisa una sola vez', () => {
    const lejos = desplazar(HOME_POINT, 2000, 0)
    let r = evaluarLectura(evaluarLectura(nuevaVigilancia(), lect(HOME_POINT, T0)).vigilancia, lect(lejos, T0 + 45 * SEG))
    expect(r.ignorada).toBe('salto')
    expect(tipos(r)).toEqual(['salto'])
    expect(r.vigilancia.ultima?.pos).toEqual(HOME_POINT)
    r = evaluarLectura(r.vigilancia, lect(desplazar(lejos, 20, 0), T0 + 90 * SEG))
    expect(r.ignorada).toBe('salto')
    expect(r.avisos).toEqual([]) // el mismo salto no avisa dos veces
    expect(r.vigilancia.descartadasSalto).toBe(2)
  })

  it('una lectura buena después del salto se acepta y rearma el aviso', () => {
    const lejos = desplazar(HOME_POINT, 2000, 0)
    const r = evaluarLecturas(nuevaVigilancia(), [
      lect(HOME_POINT, T0),
      lect(lejos, T0 + 45 * SEG), // salto
      lect(desplazar(HOME_POINT, 20, 0), T0 + 90 * SEG), // normal
      lect(lejos, T0 + 135 * SEG), // otro salto
    ])
    expect(tipos(r)).toEqual(['salto', 'salto'])
  })

  it('15 km/h no es salto; 15,2 km/h sí', () => {
    const base = evaluarLectura(nuevaVigilancia(), lect(HOME_POINT, T0)).vigilancia
    // en 45 s: 15 km/h = 187,5 m
    expect(evaluarLectura(base, lect(desplazar(HOME_POINT, 187, 0), T0 + 45 * SEG)).ignorada).toBeUndefined()
    expect(evaluarLectura(base, lect(desplazar(HOME_POINT, 190, 0), T0 + 45 * SEG)).ignorada).toBe('salto')
  })

  it('un movimiento que cabe en el error de las dos lecturas es ruido, no un salto', () => {
    const base = evaluarLectura(nuevaVigilancia(), lect(HOME_POINT, T0, 30)).vigilancia
    // 40 m en 1 s sería muy rápido, pero el error de las dos lecturas (30 + 30) lo explica
    expect(evaluarLectura(base, lect(desplazar(HOME_POINT, 40, 0), T0 + 1 * SEG, 30)).ignorada).toBeUndefined()
  })

  it('con el tiempo la distancia se vuelve posible: a los 5 min, 1 km ya es una caminata', () => {
    const base = evaluarLectura(nuevaVigilancia(), lect(HOME_POINT, T0)).vigilancia
    expect(evaluarLectura(base, lect(desplazar(HOME_POINT, 1000, 0), T0 + 5 * MIN)).ignorada).toBeUndefined()
  })
})

describe('avisos: sin moverse', () => {
  const quieto = (n: number, pasoMs = MIN, desvio = 6) =>
    Array.from({ length: n }, (_, i) => lect(desplazar(HOME_POINT, i % 2 ? desvio : -desvio, 0), T0 + i * pasoMs))

  it('a los 10 minutos dentro del mismo radio avisa, una sola vez', () => {
    const r = evaluarLecturas(nuevaVigilancia(), quieto(15))
    expect(tipos(r)).toEqual(['quieto'])
    const aviso = r.avisos[0]
    expect(aviso.t).toBe(T0 + 10 * MIN)
  })

  it('a los 9 minutos todavía no', () => {
    expect(evaluarLecturas(nuevaVigilancia(), quieto(10)).avisos).toEqual([])
  })

  it('moverse más allá del radio reinicia la cuenta', () => {
    const lecturas = [...quieto(6), lect(desplazar(HOME_POINT, 120, 0), T0 + 6 * MIN), ...quieto(6).map((l, i) => lect(desplazar(HOME_POINT, 120, 0), T0 + (7 + i) * MIN))]
    expect(evaluarLecturas(nuevaVigilancia(), lecturas).avisos).toEqual([])
  })

  it('el error del GPS (45 m cada lectura) no cuenta como movimiento: sigue «quieto»', () => {
    // dos lecturas seguidas quedan a 60 m una de otra, pero cada una puede estar equivocada por 45 m
    const lecturas = Array.from({ length: 12 }, (_, i) => lect(desplazar(HOME_POINT, i % 2 ? 30 : -30, 0), T0 + i * MIN, 45))
    expect(tipos(evaluarLecturas(nuevaVigilancia(), lecturas))).toEqual(['quieto'])
  })

  it('al volver a moverse y quedarse quieto otra vez, avisa de nuevo', () => {
    const otraParte = (desde: number) => Array.from({ length: 12 }, (_, i) => lect(desplazar(HOME_POINT, 200, 5), T0 + (desde + i) * MIN))
    const r = evaluarLecturas(nuevaVigilancia(), [...quieto(12), ...otraParte(12)])
    expect(tipos(r)).toEqual(['quieto', 'quieto'])
  })
})

describe('niveles de aviso', () => {
  it('salida y quieto son alertas; borde y salto, avisos suaves; regreso, informativo', () => {
    expect(NIVEL_AVISO).toEqual({ salida: 'alerta', quieto: 'alerta', borde: 'suave', salto: 'suave', sin_ubicacion: 'suave', regreso: 'info' })
  })
})

describe('zona aproximada (lo que ve el paseador antes de ser elegido)', () => {
  it('redondea a la cuadrícula de 0.003 grados, igual que la base', () => {
    expect(redondearZona([-12.0999, -77.0374])).toEqual([-12.099, -77.037])
    expect(redondearZona([-12.1011, -77.0347])).toEqual([-12.102, -77.034])
  })
  it('el punto exacto queda a menos de ≈ 233 m del redondeado (cabe en el círculo de config)', () => {
    for (const p of [[-12.0999, -77.0374], [-12.0877, -77.0512], [-12.0701, -77.0419]] as LatLng[]) {
      expect(distanciaMetros(p, redondearZona(p))).toBeLessThan(CONFIG.radioZonaAproximadaMetros)
    }
  })
  it('dos casas de la misma casilla dan lo mismo: no se puede saber cuál es', () => {
    expect(redondearZona([-12.0991, -77.0371])).toEqual(redondearZona([-12.0988, -77.0369]))
  })
})
