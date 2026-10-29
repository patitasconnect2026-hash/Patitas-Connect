/**
 * La portada del paseador (parte 1c): con servidor, «Entrar a mi cuenta» es la acción principal y «Crear cuenta de paseador»
 * queda aparte; así quien ya postuló no cree que puede postular dos veces. Sin servidor no cambia nada. Sin red.
 */
import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => undefined, replace: () => undefined, refresh: () => undefined }) }))

import { entradaDelPaseador, TEXTO_PORTADA_PASEADOR, Welcome } from './WalkerApp'

const palabras = (t: string) => t.split(/\s+/).filter(Boolean).length
const pintar = (servidor: boolean) => renderToStaticMarkup(createElement(Welcome, { onStart: () => undefined, servidor }))

describe('portada del paseador con servidor', () => {
  const h = pintar(true)
  it('«Entrar a mi cuenta» es el botón principal y «Crear cuenta de paseador» queda aparte', () => {
    expect(h).toContain('Entrar a mi cuenta')
    expect(h).toContain('¿Primera vez?')
    expect(h).toContain('Crear cuenta de paseador')
    // El principal va primero.
    expect(h.indexOf('Entrar a mi cuenta')).toBeLessThan(h.indexOf('Crear cuenta de paseador'))
  })
  it('ya no dice «Entrar o crear cuenta» y avisa que quien ya postuló no tiene que postular otra vez', () => {
    expect(h).not.toContain('Entrar o crear cuenta')
    expect(h).toContain('Si ya postulaste, entra a tu cuenta: no hace falta postular otra vez.')
  })
  it('volver a la app de clientes sigue (ya no hay botón de demostración)', () => {
    expect(h).not.toContain('Entrar como paseador de demostración')
    expect(h).toContain('Tengo un perro: volver al inicio')
  })
  it('los textos son cortos', () => {
    expect(palabras(TEXTO_PORTADA_PASEADOR.entrar)).toBeLessThanOrEqual(5)
    expect(palabras(TEXTO_PORTADA_PASEADOR.crear)).toBeLessThanOrEqual(5)
    expect(palabras(TEXTO_PORTADA_PASEADOR.yaPostulaste)).toBeLessThanOrEqual(14)
  })
})

describe('portada del paseador sin servidor: idéntica a hoy', () => {
  const h = pintar(false)
  it('«Crear cuenta de paseador» como botón principal y nada de «Entrar a mi cuenta»', () => {
    expect(h).toContain('Crear cuenta de paseador')
    expect(h).not.toContain('Entrar a mi cuenta')
    expect(h).not.toContain('¿Primera vez?')
    expect(h).not.toContain('Si ya postulaste')
    expect(h).not.toContain('Entrar como paseador de demostración')
  })
})

describe('qué pantalla abre cada botón', () => {
  it('«Entrar a mi cuenta» abre iniciar sesión', () => {
    expect(entradaDelPaseador('entrar')).toEqual({ modoInicial: 'entrar', rolInicial: null })
  })
  it('«Crear cuenta de paseador» abre crear cuenta con «Soy paseador» ya elegido', () => {
    expect(entradaDelPaseador('crear')).toEqual({ modoInicial: 'registrar', rolInicial: 'paseador' })
  })
})
