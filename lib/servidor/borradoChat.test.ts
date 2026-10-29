/**
 * El borrado a los 7 días de las imágenes del chat (supabase/scripts/vencimiento_chat.mjs). Solo se prueban las funciones puras:
 * la llamada a la API de Storage del Supabase real no se puede probar aquí.
 */
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'

interface Imagen {
  paseo: string
  ruta: string
  creado: number
}
interface Modulo {
  DIAS_DEL_CHAT: number
  imagenDeChat(paseo: string, item: Record<string, unknown> | null): Imagen | null
  imagenesDeChatVencidas(o: { imagenes: Imagen[]; ahora: number; conservar: Set<string>; dias?: number }): string[]
  paseosAConservar(o: { casosAbiertos: Array<{ paseo_id?: unknown }>; paseosEnDisputa: Array<{ id?: unknown }> }): Set<string>
}

const modulo = (await import(/* @vite-ignore */ pathToFileURL(path.resolve(__dirname, '..', '..', 'supabase', 'scripts', 'vencimiento_chat.mjs')).href)) as Modulo
const { DIAS_DEL_CHAT, imagenDeChat, imagenesDeChatVencidas, paseosAConservar } = modulo

const DIA = 24 * 60 * 60 * 1000
const AHORA = Date.parse('2026-10-20T12:00:00.000Z')
const hace = (dias: number) => new Date(AHORA - dias * DIA).toISOString()

describe('imagenDeChat', () => {
  it('un archivo con fecha es una imagen de chat con su ruta completa', () => {
    expect(imagenDeChat('p-1', { id: 'abc', name: 'm-1.jpg', created_at: hace(9) })).toEqual({ paseo: 'p-1', ruta: 'chat/p-1/m-1.jpg', creado: Date.parse(hace(9)) })
  })
  it('usa la fecha de actualización si no hay de creación', () => {
    expect(imagenDeChat('p-1', { id: 'abc', name: 'm-1.jpg', updated_at: hace(2) })?.creado).toBe(Date.parse(hace(2)))
  })
  it('una carpeta, un archivo sin fecha o sin nombre no sirven (sin fecha NO se borra)', () => {
    expect(imagenDeChat('p-1', { id: null, name: 'subcarpeta' })).toBeNull()
    expect(imagenDeChat('p-1', { id: 'abc', name: 'm.jpg' })).toBeNull()
    expect(imagenDeChat('p-1', { id: 'abc', name: 'm.jpg', created_at: 'ayer' })).toBeNull()
    expect(imagenDeChat('p-1', { id: 'abc', name: '', created_at: hace(9) })).toBeNull()
    expect(imagenDeChat('', { id: 'abc', name: 'm.jpg', created_at: hace(9) })).toBeNull()
    expect(imagenDeChat('p-1', null)).toBeNull()
  })
})

describe('imagenesDeChatVencidas', () => {
  const img = (paseo: string, nombre: string, dias: number): Imagen => ({ paseo, ruta: `chat/${paseo}/${nombre}`, creado: AHORA - dias * DIA })
  it('el plazo es de 7 días', () => expect(DIAS_DEL_CHAT).toBe(7))
  it('borra las de más de 7 días y deja las nuevas', () => {
    const r = imagenesDeChatVencidas({ imagenes: [img('p-1', 'a.jpg', 8), img('p-1', 'b.jpg', 7), img('p-1', 'c.jpg', 6.9), img('p-2', 'd.jpg', 30)], ahora: AHORA, conservar: new Set() })
    expect(r).toEqual(['chat/p-1/a.jpg', 'chat/p-1/b.jpg', 'chat/p-2/d.jpg'])
  })
  it('NO borra las de un paseo con un caso abierto o en disputa, aunque tengan meses', () => {
    const r = imagenesDeChatVencidas({ imagenes: [img('p-1', 'a.jpg', 90), img('p-2', 'b.jpg', 90)], ahora: AHORA, conservar: new Set(['p-1']) })
    expect(r).toEqual(['chat/p-2/b.jpg'])
  })
  it('sin imágenes, nada', () => expect(imagenesDeChatVencidas({ imagenes: [], ahora: AHORA, conservar: new Set() })).toEqual([]))
})

describe('paseosAConservar', () => {
  it('junta los paseos con un caso sin resolver y los que están en disputa', () => {
    expect([...paseosAConservar({ casosAbiertos: [{ paseo_id: 'p-1' }, { paseo_id: 'p-3' }], paseosEnDisputa: [{ id: 'p-2' }, { id: 'p-1' }] })].sort()).toEqual(['p-1', 'p-2', 'p-3'])
  })
  it('ignora filas raras', () => {
    expect([...paseosAConservar({ casosAbiertos: [{ paseo_id: null }, {}], paseosEnDisputa: [{ id: '' }, { id: 7 }] })]).toEqual([])
  })
})
