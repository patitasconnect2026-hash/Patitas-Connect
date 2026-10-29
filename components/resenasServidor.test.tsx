/**
 * Las reseñas con servidor en las pantallas: la calificación solo aparece con reseñas de verdad, se cuenta en «reseñas» (no en
 * «paseos») y un comentario sin distrito no inventa uno. Los paseadores de ejemplo se ven como siempre. Sin red, sin cuentas.
 */
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { WALKERS } from '@/lib/data'
import { walkerDeVista } from '@/lib/servidor/paseadoresReales'
import type { Review, Walker } from '@/lib/types'
import { ReviewsSheet } from './ReviewsSheet'
import { WalkerCard } from './WalkerCard'

const noop = () => {}
const ID = 'bbbbbbbb-0000-4000-8000-000000000001'
const vista = {
  paseador_id: ID,
  codigo: 'PAT-LUC',
  nombre_pila: 'Lucía',
  apellido_inicial: 'Q',
  universidad: '',
  carrera: 'Psicología',
  ciclo: '5to ciclo',
  distrito: 'San Isidro',
  perfil: { rate: 22, sizes: ['small', 'medium', 'large'], times: ['Mañana (6–12)'], spots: ['olivar'], bio: 'Me encantan los perros.' },
  foto_ruta: null,
  paseos_acompanados: 0,
  comprobaciones: ['dni', 'distrito', 'celular', 'consultas', 'examen'],
  dni_ultimos3: '678',
}
const delServidor = (extra: Record<string, unknown> = {}, reviews: Review[] = []): Walker => ({ ...walkerDeVista({ ...vista, ...extra })!, reviews })
const comentario = (extra: Partial<Review> = {}): Review => ({ id: 'resena-p-1', author: 'Valeria R.', district: 'San Isidro', rating: 5, text: 'Muy puntual y cariñosa.', when: 'Hace 2 días', tags: ['Puntual'], walkerId: ID, paseoId: 'p-1', ...extra })

const tarjeta = (w: Walker) => renderToStaticMarkup(<WalkerCard walker={w} index={0} dog={null} fav={false} onFav={noop} onDni={noop} onBook={noop} onReviews={noop} />)
const hoja = (w: Walker, mine: Review[] = []) => renderToStaticMarkup(<ReviewsSheet walker={w} mine={mine} canReview={false} dogName="Max" onReview={noop} onClose={noop} />)

describe('la tarjeta de un paseador de la base', () => {
  it('sin reseñas dice «Aún sin reseñas», aunque ya haya terminado paseos', () => {
    const h = tarjeta(delServidor({ resenas_n: 0, calificacion: null, paseos_hechos: 4 }))
    expect(h).toContain('Aún sin reseñas')
    expect(h).not.toMatch(/4 paseos/)
  })

  it('con reseñas muestra su calificación y cuántas son («3 reseñas»), no los paseos', () => {
    const h = tarjeta(delServidor({ resenas_n: 3, calificacion: 4.3, paseos_hechos: 5 }))
    expect(h).toContain('4.3')
    expect(h).toMatch(/3 reseñas/)
    expect(h).not.toContain('Aún sin reseñas')
    expect(h).not.toMatch(/5 paseos/)
    expect(tarjeta(delServidor({ resenas_n: 1, calificacion: 5, paseos_hechos: 1 }))).toMatch(/1 reseña(?!s)/)
  })

  it('el comentario de otra familia sale con su autora y su distrito; sin distrito sale solo la autora', () => {
    const con = tarjeta(delServidor({ resenas_n: 1, calificacion: 5, paseos_hechos: 1 }, [comentario()]))
    expect(con).toContain('Muy puntual y cariñosa.')
    expect(con).toContain('Valeria R. · San Isidro')
    const sin = tarjeta(delServidor({ resenas_n: 1, calificacion: 5, paseos_hechos: 1 }, [comentario({ district: '' })]))
    expect(sin).toContain('Valeria R.')
    expect(sin).not.toContain('Valeria R. ·')
  })

  it('un paseador de ejemplo se ve como siempre: su calificación y sus paseos', () => {
    const w = WALKERS[0]
    const h = tarjeta(w)
    expect(h).toContain(w.rating.toFixed(1))
    expect(h).toMatch(new RegExp(`${w.walks} paseos?`))
    expect(h).not.toMatch(/reseñas?<\/span>/)
  })
})

describe('la hoja de reseñas', () => {
  it('un paseador de la base sin reseñas: «Aún sin reseñas», sin calificación inventada', () => {
    const h = hoja(delServidor({ resenas_n: 0, calificacion: null, paseos_hechos: 2 }))
    expect(h).toContain('Aún sin reseñas')
    expect(h).not.toContain('0.0')
  })

  it('con reseñas: la calificación, cuántas son y cada comentario; la mía dice «Tu reseña»', () => {
    const otra = comentario({ id: 'resena-p-2', paseoId: 'p-2', author: 'Rosa V.', text: 'Todo bien.', rating: 4 })
    const mia = comentario({ mine: true, text: 'La mía.' })
    const h = hoja(delServidor({ resenas_n: 2, calificacion: 4.5, paseos_hechos: 2 }, [otra]), [mia])
    expect(h).toContain('4.5')
    expect(h).toMatch(/2 reseñas/)
    expect(h).toContain('Todo bien.')
    expect(h).toContain('Rosa V. · San Isidro')
    expect(h).toContain('La mía.')
    expect(h).toContain('Tu reseña')
    expect(h).toContain('Solo pueden reseñar los dueños que completaron un paseo.')
  })

  it('un paseador de ejemplo conserva su encabezado de siempre', () => {
    const w = WALKERS[0]
    const h = hoja(w)
    expect(h).toContain(w.rating.toFixed(1))
    expect(h).toMatch(new RegExp(`${w.walks} paseos? completados?`))
  })
})

describe('con y sin servidor', () => {
  const app = fs.readFileSync(path.resolve(__dirname, 'PatitasApp.tsx'), 'utf8')

  it('las reseñas van a la base solo con servidor y sesión de familia; si no, siguen en la cuenta de este teléfono', () => {
    expect(app).toMatch(/const resenasEnLaBase = reales\.aplica/)
    expect(app).toMatch(/resenasEnLaBase \? resenasDelServidor : \(store\?\.reviews \?\? \[\]\)/)
    // El camino de siempre (cuenta del teléfono) sigue ahí, con su «ya reseñó este paseo» local.
    expect(app).toMatch(/setStore\(\(s\) => \(s \? \{ \.\.\.s, reviews: \[review, \.\.\.s\.reviews\] \} : s\)\)/)
    expect(app).toMatch(/setReviewedLocal\(true\)/)
  })

  it('con servidor es una sola reseña por paseo y la calificación se vuelve a leer cuando la base la recibe', () => {
    expect(app).toMatch(/misResenas\.some\(\(x\) => x\.paseoId === paseoId\)\) return/)
    expect(app).toMatch(/esperarGuardadoDeLasResenas\(\)\.then/)
    expect(app).toMatch(/reales\.recargar\(\)/)
  })
})
