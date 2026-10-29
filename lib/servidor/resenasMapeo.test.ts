import { describe, expect, it } from 'vitest'
import { REVIEW_TAGS } from '../data'
import type { Review } from '../types'
import { cuandoFue, filaDeResena, MAX_TEXTO_RESENA, resenasDeFilas, reviewDeFila } from './resenasMapeo'

const AHORA = Date.parse('2026-10-20T12:00:00.000Z')
const DIA = 86_400_000
const hace = (dias: number) => new Date(AHORA - dias * DIA).toISOString()

const FAMILIA = 'aaaaaaaa-0000-4000-8000-000000000001'
const PASEADOR = 'bbbbbbbb-0000-4000-8000-000000000001'

const mia = (extra: Partial<Pick<Review, 'paseoId' | 'walkerId' | 'rating' | 'text' | 'tags'>> = {}) => ({
  paseoId: 'p-1',
  walkerId: PASEADOR,
  rating: 5,
  text: 'Muy puntual y cariñosa.',
  tags: [REVIEW_TAGS[0]],
  ...extra,
})

describe('filaDeResena: lo que se manda a la base', () => {
  it('manda el paseo, el paseador, las estrellas, el comentario y las etiquetas; el nombre y el distrito los pone la base', () => {
    const f = filaDeResena(mia(), FAMILIA)
    expect(f).toEqual({ paseo_id: 'p-1', familia_id: FAMILIA, paseador_id: PASEADOR, estrellas: 5, texto: 'Muy puntual y cariñosa.', etiquetas: [REVIEW_TAGS[0]] })
    expect(f).not.toHaveProperty('autor')
    expect(f).not.toHaveProperty('distrito')
  })

  it('sin paseo, sin paseador, sin familia o sin estrellas de 1 a 5 no hay fila (no se manda a medias)', () => {
    expect(filaDeResena(mia({ paseoId: undefined }), FAMILIA)).toBeNull()
    expect(filaDeResena(mia({ walkerId: undefined }), FAMILIA)).toBeNull()
    expect(filaDeResena(mia(), '')).toBeNull()
    expect(filaDeResena(mia({ rating: 0 }), FAMILIA)).toBeNull()
    expect(filaDeResena(mia({ rating: 6 }), FAMILIA)).toBeNull()
    expect(filaDeResena(mia({ rating: Number.NaN }), FAMILIA)).toBeNull()
  })

  it('las estrellas son enteras, el comentario se recorta y las etiquetas son solo las que ofrece la app (sin repetir, hasta 8)', () => {
    expect(filaDeResena(mia({ rating: 4.6 }), FAMILIA)?.estrellas).toBe(5)
    expect(filaDeResena(mia({ text: `  ${'a'.repeat(400)}  ` }), FAMILIA)?.texto).toHaveLength(MAX_TEXTO_RESENA)
    expect(filaDeResena(mia({ text: '   ' }), FAMILIA)?.texto).toBe('')
    expect(filaDeResena(mia({ tags: [REVIEW_TAGS[0], REVIEW_TAGS[0], 'inventada', REVIEW_TAGS[1]] }), FAMILIA)?.etiquetas).toEqual([REVIEW_TAGS[0], REVIEW_TAGS[1]])
  })
})

describe('cuandoFue', () => {
  it('lo dice en palabras simples', () => {
    expect(cuandoFue(hace(0), AHORA)).toBe('Hoy')
    expect(cuandoFue(hace(1), AHORA)).toBe('Ayer')
    expect(cuandoFue(hace(3), AHORA)).toBe('Hace 3 días')
    expect(cuandoFue(hace(7), AHORA)).toBe('Hace 1 semana')
    expect(cuandoFue(hace(15), AHORA)).toBe('Hace 2 semanas')
    expect(cuandoFue(hace(45), AHORA)).toBe('Hace 1 mes')
    expect(cuandoFue(hace(130), AHORA)).toBe('Hace 4 meses')
  })
  it('una fecha que no se entiende no inventa nada; una del futuro (reloj distinto) dice «Hoy»', () => {
    expect(cuandoFue('ayer', AHORA)).toBe('')
    expect(cuandoFue('', AHORA)).toBe('')
    expect(cuandoFue(hace(-2), AHORA)).toBe('Hoy')
  })
})

describe('reviewDeFila: lo que la base entregó, como lo usa la app', () => {
  const fila = { paseo_id: 'p-1', familia_id: FAMILIA, paseador_id: PASEADOR, estrellas: 4, texto: ' Todo bien. ', etiquetas: ['Puntual'], autor: 'Valeria R.', distrito: 'San Isidro', creado_en: hace(2) }

  it('arma la reseña con el nombre y el distrito de la base, y su id es el del paseo', () => {
    expect(reviewDeFila(fila, null, AHORA)).toEqual({ id: 'resena-p-1', author: 'Valeria R.', district: 'San Isidro', rating: 4, text: 'Todo bien.', tags: ['Puntual'], when: 'Hace 2 días', walkerId: PASEADOR, paseoId: 'p-1' })
  })
  it('la marca como «mía» solo si la escribió esta persona', () => {
    expect(reviewDeFila(fila, FAMILIA, AHORA)?.mine).toBe(true)
    expect(reviewDeFila(fila, 'otra-persona', AHORA)?.mine).toBeUndefined()
    expect(reviewDeFila(fila, null, AHORA)?.mine).toBeUndefined()
  })
  it('sin distrito en la base no se inventa uno', () => {
    expect(reviewDeFila({ ...fila, distrito: null }, null, AHORA)?.district).toBe('')
    expect(reviewDeFila({ ...fila, distrito: 'Miraflores' }, null, AHORA)?.district).toBe('')
  })
  it('sin paseo, paseador, estrellas de 1 a 5 o autora no se muestra (no se inventa)', () => {
    expect(reviewDeFila({ ...fila, paseo_id: '' }, null, AHORA)).toBeNull()
    expect(reviewDeFila({ ...fila, paseador_id: null }, null, AHORA)).toBeNull()
    expect(reviewDeFila({ ...fila, estrellas: 0 }, null, AHORA)).toBeNull()
    expect(reviewDeFila({ ...fila, estrellas: 9 }, null, AHORA)).toBeNull()
    expect(reviewDeFila({ ...fila, autor: '  ' }, null, AHORA)).toBeNull()
  })
  it('las estrellas pueden llegar como texto y las etiquetas raras se ignoran', () => {
    expect(reviewDeFila({ ...fila, estrellas: '3' }, null, AHORA)?.rating).toBe(3)
    expect(reviewDeFila({ ...fila, etiquetas: ['Puntual', 7, null] }, null, AHORA)?.tags).toEqual(['Puntual'])
    expect(reviewDeFila({ ...fila, etiquetas: 'Puntual' }, null, AHORA)?.tags).toEqual([])
  })
  it('una lista descarta lo que no se entiende', () => {
    expect(resenasDeFilas([fila, { ...fila, paseo_id: '' }, { ...fila, paseo_id: 'p-2' }], null, AHORA).map((r) => r.paseoId)).toEqual(['p-1', 'p-2'])
  })
})
