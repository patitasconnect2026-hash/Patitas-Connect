import { describe, expect, it } from 'vitest'
import { CONFIG } from '../config'
import { HOURS, isBookable, slotInfo } from '../schedule'
import { DEMO_DOGS } from '../data'
import { estadoVisible } from '../walkerStore'
import { tieneCalificacion } from '../calificacion'
import { appAprobadaPorServidor, cobroDeFila, conResenas, paseadoresDeVista, perfilDe, walkerDeVista } from './paseadoresReales'

const ID = 'bbbbbbbb-0000-4000-8000-000000000001'
const vista = {
  paseador_id: ID,
  codigo: 'PAT-LUC',
  nombre_pila: 'Lucía',
  apellido_inicial: 'Q',
  universidad: 'Universidad del Pacífico',
  carrera: 'Psicología',
  ciclo: '5to ciclo',
  distrito: 'Jesús María',
  perfil: { rate: 22, sizes: ['small', 'large'], times: ['Mañana (6–12)'], spots: ['olivar'], includes: ['Agua y bolsas'], style: ['Tranquilo'], experience: 'Tengo perro', bio: 'Me encantan los perros.' },
  foto_ruta: null,
  paseos_acompanados: 0,
  comprobaciones: ['dni', 'distrito', 'celular', 'consultas', 'examen'],
  dni_ultimos3: '678',
}

describe('un paseador de la lista pública (paseadores_publicos)', () => {
  it('se arma con lo que dice la base y nada inventado: sin calificación, sin tiempo de respuesta', () => {
    const w = walkerDeVista(vista)!
    expect(w).toMatchObject({
      id: ID,
      name: 'Lucía Q.',
      firstName: 'Lucía',
      district: 'Jesús María',
      pricePerHour: 22,
      accepts: ['small', 'large'],
      windows: [[6, 12]],
      spots: ['olivar'],
      code: 'PAT-LUC',
      dni: '678',
      deServidor: true,
      probation: true,
    })
    expect(w.rating).toBe(0)
    expect(w.walks).toBe(0)
    expect(w.responds).toBe('')
    expect(w.reviews).toEqual([])
    expect(w.esEjemplo).toBeUndefined()
  })

  it('solo afirma las casillas marcadas: cinco, y la sexta únicamente si hay un paseo acompañado', () => {
    expect(walkerDeVista(vista)!.comprobaciones).toEqual(['dni', 'distrito', 'celular', 'consultas', 'examen'])
    expect(walkerDeVista({ ...vista, paseos_acompanados: 1 })!.comprobaciones).toEqual(['dni', 'distrito', 'celular', 'consultas', 'examen', 'primerPaseo'])
    expect(walkerDeVista({ ...vista, comprobaciones: ['dni'] })!.comprobaciones).toEqual(['dni'])
    expect(JSON.stringify(walkerDeVista(vista))).not.toMatch(/verificad/i)
  })

  it('acepta los nombres del comentario del SQL (tarifa, tamaños, horarios, parques) y los de la app', () => {
    const p = perfilDe({ tarifa: 30, 'tamaños': ['medium'], horarios: ['Tarde (12–18)', 'Noche (18–21)'], parques: ['caceres'], incluye: ['Fotos'], estilo: ['Puntual'], experiencia: 'Primera vez' })
    expect(p).toMatchObject({ tarifa: 30, tamanos: ['medium'], franjas: ['Tarde (12–18)', 'Noche (18–21)'], parques: ['caceres'], incluye: ['Fotos'], estilo: ['Puntual'], experiencia: 'Primera vez' })
    const w = walkerDeVista({ ...vista, perfil: { tarifa: 30, 'tamaños': ['medium'], horarios: ['Tarde (12–18)', 'Noche (18–21)'] } })!
    expect(w.pricePerHour).toBe(30)
    expect(w.accepts).toEqual(['medium'])
    expect(w.windows).toEqual([[12, 18], [18, 21]])
  })

  it('sin una tarifa dentro del rango del equipo, sin nombre o con un id que no es uuid, no se muestra (no se inventa el precio)', () => {
    expect(walkerDeVista({ ...vista, perfil: {} })).toBeNull()
    expect(walkerDeVista({ ...vista, perfil: { rate: CONFIG.tarifaMinima - 1 } })).toBeNull()
    expect(walkerDeVista({ ...vista, perfil: { rate: CONFIG.tarifaMaxima + 1 } })).toBeNull()
    expect(walkerDeVista({ ...vista, nombre_pila: '  ' })).toBeNull()
    expect(walkerDeVista({ ...vista, paseador_id: 'carlos' })).toBeNull()
    expect(paseadoresDeVista([vista, { ...vista, perfil: {} }]).map((w) => w.id)).toEqual([ID])
  })

  it('sus horarios declarados se muestran libres: no hay ocupación inventada', () => {
    const w = walkerDeVista(vista)!
    const dentro = HOURS.filter((h) => h >= 6 && h < 12 && h > 9)
    for (const h of dentro) expect(isBookable(slotInfo(w, 1, h, DEMO_DOGS[0]).state), `hora ${h}`).toBe(true)
    // Fuera de su franja, apagado.
    expect(isBookable(slotInfo(w, 1, 15, DEMO_DOGS[0]).state)).toBe(false)
    // Un paseador de la demostración sí conserva su ocupación simulada (no cambió).
    const ejemplo = { ...w, deServidor: undefined }
    const estados = HOURS.map((h) => slotInfo(ejemplo, 1, h, null).state)
    expect(new Set(estados).size).toBeGreaterThan(1)
  })
})

describe('dónde cobra y la app del paseador aprobado por el servidor', () => {
  it('el cobro se lee de la fila o es null', () => {
    expect(cobroDeFila({ metodo: 'yape', celular: '987654321', titular: 'Lucía Quispe' })).toEqual({ metodo: 'yape', telefono: '987654321', titular: 'Lucía Quispe' })
    expect(cobroDeFila({ metodo: 'paypal', celular: '1', titular: 'x' })).toBeNull()
    expect(cobroDeFila(null)).toBeNull()
  })

  it('sin postulación en este teléfono: queda aprobada con las cinco casillas, su código y su cobro', () => {
    const app = appAprobadaPorServidor(null, vista, { metodo: 'plin', celular: '912345678', titular: 'Lucía Quispe' })
    expect(estadoVisible(app)).toBe('activo')
    expect(app.code).toBe('PAT-LUC')
    expect(app.person.firstName).toBe('Lucía')
    expect(app.profile.rate).toBe(22)
    expect(app.profile.sizes).toEqual(['small', 'large'])
    expect(app.cobro).toEqual({ metodo: 'plin', telefono: '912345678', titular: 'Lucía Quispe' })
    expect(app.review.comprobaciones).toEqual({ dni: true, distrito: true, celular: true, consultas: true, examen: true })
  })

  it('con postulación local: se respeta lo que escribió y la aprobación sale del servidor', () => {
    const local = appAprobadaPorServidor(null, vista, null)
    const editada = { ...local, status: 'enviada' as const, code: 'PAT-LOCAL', profile: { ...local.profile, bio: 'Mi texto propio', includes: ['Fotos'] } }
    const app = appAprobadaPorServidor(editada, vista, null)
    expect(app.profile.bio).toBe('Mi texto propio')
    expect(app.status).toBe('activo')
    expect(app.code).toBe('PAT-LUC')
    expect(estadoVisible(app)).toBe('activo')
  })
})

describe('la calificación de un paseador de la base: solo con reseñas de verdad', () => {
  const AHORA = Date.parse('2026-10-20T12:00:00.000Z')
  const FAMILIA = 'aaaaaaaa-0000-4000-8000-000000000001'
  const OTRA = 'aaaaaaaa-0000-4000-8000-000000000002'
  const resena = (paseo: string, familia: string, estrellas: number, texto: string) => ({
    paseo_id: paseo,
    familia_id: familia,
    paseador_id: ID,
    estrellas,
    texto,
    etiquetas: [],
    autor: familia === FAMILIA ? 'Valeria R.' : 'Rosa V.',
    distrito: 'San Isidro',
    creado_en: new Date(AHORA - 2 * 86_400_000).toISOString(),
  })

  it('sin reseñas no hay calificación aunque haya terminado paseos: la tarjeta dice «Aún sin reseñas»', () => {
    const w = walkerDeVista({ ...vista, resenas_n: 0, calificacion: null, paseos_hechos: 3 })!
    expect(w).toMatchObject({ rating: 0, walks: 3, resenasN: 0, deServidor: true })
    expect(tieneCalificacion(w)).toBe(false)
  })

  it('con reseñas, la calificación es la que dice la base (el promedio) y se cuenta cuántas son', () => {
    const w = walkerDeVista({ ...vista, resenas_n: 3, calificacion: 4.3, paseos_hechos: 5 })!
    expect(w).toMatchObject({ rating: 4.3, walks: 5, resenasN: 3 })
    expect(tieneCalificacion(w)).toBe(true)
  })

  it('la calificación puede llegar como texto (numeric) y lo raro no se inventa', () => {
    expect(walkerDeVista({ ...vista, resenas_n: 2, calificacion: '4.5', paseos_hechos: 2 })).toMatchObject({ rating: 4.5, resenasN: 2 })
    expect(walkerDeVista({ ...vista, resenas_n: 2, calificacion: null, paseos_hechos: 2 })).toMatchObject({ rating: 0, resenasN: 2 })
    expect(walkerDeVista({ ...vista, resenas_n: -4, calificacion: 5, paseos_hechos: -1 })).toMatchObject({ rating: 0, walks: 0, resenasN: 0 })
    // La vista de antes (sin las columnas nuevas) sigue sirviendo: nada de calificación.
    expect(walkerDeVista(vista)).toMatchObject({ rating: 0, walks: 0, resenasN: 0 })
  })

  it('un paseador de ejemplo sigue mostrando su calificación de siempre', () => {
    expect(tieneCalificacion({ deServidor: undefined, resenasN: undefined, walks: 120 })).toBe(true)
    expect(tieneCalificacion({ deServidor: undefined, resenasN: undefined, walks: 0 })).toBe(false)
  })

  it('conResenas suma los comentarios de OTRAS familias, los más nuevos primero; el de esta persona va aparte', () => {
    const lista = paseadoresDeVista([{ ...vista, resenas_n: 2, calificacion: 4.5, paseos_hechos: 2 }])
    const filas = [resena('p-1', FAMILIA, 5, 'La mía.'), resena('p-2', OTRA, 4, 'De otra familia.')]
    const [w] = conResenas(lista, filas, FAMILIA, AHORA)
    expect(w.reviews.map((r) => r.text)).toEqual(['De otra familia.'])
    expect(w.reviews[0]).toMatchObject({ author: 'Rosa V.', when: 'Hace 2 días', walkerId: ID, paseoId: 'p-2' })
    expect(w.reviews[0].mine).toBeUndefined()
    // Los datos del paseador no cambian.
    expect(w).toMatchObject({ rating: 4.5, resenasN: 2, deServidor: true })
  })

  it('sin reseñas (o si no llegaron por falta de internet) el paseador queda con la lista vacía', () => {
    const lista = paseadoresDeVista([vista])
    expect(conResenas(lista, [], FAMILIA, AHORA)[0].reviews).toEqual([])
  })
})
