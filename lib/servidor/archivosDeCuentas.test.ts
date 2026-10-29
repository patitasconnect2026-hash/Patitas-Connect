/**
 * El borrado de los archivos de las cuentas borradas (supabase/scripts/archivos_de_cuentas.mjs). Solo se prueban las funciones
 * puras: la llamada a la API de Storage del Supabase real no se puede probar aquí.
 */
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'

interface Modulo {
  rutasDeCuentasBorradas(filas: unknown): string[]
  filtroDeRutas(rutas: string[]): string
}
const modulo = (await import(/* @vite-ignore */ pathToFileURL(path.resolve(__dirname, '..', '..', 'supabase', 'scripts', 'archivos_de_cuentas.mjs')).href)) as Modulo
const { rutasDeCuentasBorradas, filtroDeRutas } = modulo

describe('rutasDeCuentasBorradas', () => {
  it('devuelve las rutas del almacén, sin repetir y sin espacios de más', () => {
    const filas = [{ ruta: 'paseo/p-1/f1.jpg' }, { ruta: ' hoy/abc/2026-10-15.jpg ' }, { ruta: 'paseo/p-1/f1.jpg' }, { ruta: 'chat/p-1/m-2.jpg' }]
    expect(rutasDeCuentasBorradas(filas)).toEqual(['paseo/p-1/f1.jpg', 'hoy/abc/2026-10-15.jpg', 'chat/p-1/m-2.jpg'])
  })

  it('lo que no es una ruta clara se deja quieto (no se borra a ciegas)', () => {
    const filas = [{ ruta: '' }, { ruta: '   ' }, { ruta: '/paseo/x.jpg' }, { ruta: 'paseo/../../otra/x.jpg' }, { ruta: 7 }, { ruta: null }, {}, null, 'texto']
    expect(rutasDeCuentasBorradas(filas)).toEqual([])
  })

  it('si la base no devolvió una lista, no hay nada que borrar', () => {
    expect(rutasDeCuentasBorradas(null)).toEqual([])
    expect(rutasDeCuentasBorradas({ ruta: 'paseo/x.jpg' })).toEqual([])
    expect(rutasDeCuentasBorradas(undefined)).toEqual([])
  })
})

describe('filtroDeRutas', () => {
  it('arma el filtro de PostgREST con comillas', () => {
    expect(filtroDeRutas(['paseo/p-1/f1.jpg', 'hoy/abc/2026-10-15.jpg'])).toBe('ruta=in.("paseo/p-1/f1.jpg","hoy/abc/2026-10-15.jpg")')
  })
  it('escapa las comillas y las barras invertidas de una ruta', () => {
    expect(filtroDeRutas(['a"b', 'c\\d'])).toBe('ruta=in.("a\\"b","c\\\\d")')
  })
})
