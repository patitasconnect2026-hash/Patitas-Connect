import { describe, expect, it } from 'vitest'
import { WALKERS } from './data'
import { COMPROBACIONES, type ComprobacionId } from './verificacion'
import {
  appFromWalker,
  casillasQueFaltan,
  celularDeCobro,
  cincoCasillasMarcadas,
  COBRO_VACIO,
  cobroRegistrado,
  EMPTY_APP,
  erroresCobro,
  estadoVisible,
  migrarPostulacion,
  walkerDesdePostulacion,
  type AppStatus,
  type WalkerApplication,
} from './walkerStore'

const CINCO = COMPROBACIONES.filter((c) => c.id !== 'primerPaseo').map((c) => c.id)

function postulacion(status: AppStatus, marcadas: readonly ComprobacionId[], paseos = 0): WalkerApplication {
  return {
    ...EMPTY_APP,
    status,
    code: 'PAT-TEST',
    person: { ...EMPTY_APP.person, firstName: 'Ana', lastName: 'Rojas' },
    cobro: { metodo: 'yape', telefono: '987 654 321', titular: 'Ana Rojas' },
    review: { comprobaciones: Object.fromEntries(marcadas.map((id) => [id, true])), notes: '', supervisedWalks: paseos },
  }
}

describe('el estado de un paseador es el que puso el equipo (alta rápida, sin exigir casillas)', () => {
  it('alta rápida: aprobado («supervisado») sin ninguna casilla SÍ se muestra aprobado, y sin comprobaciones', () => {
    const a = postulacion('supervisado', [])
    expect(estadoVisible(a)).toBe('supervisado')
    const w = walkerDesdePostulacion(a)
    expect(w).not.toBeNull()
    expect(w?.comprobaciones).toEqual([])
  })

  it('alta rápida: «activo» sin casillas también se muestra activo', () => {
    const a = postulacion('activo', [], 10)
    expect(estadoVisible(a)).toBe('activo')
    expect(walkerDesdePostulacion(a)).not.toBeNull()
  })

  it('dice cuáles son las casillas que faltan, con su título', () => {
    const a = postulacion('supervisado', ['dni', 'celular'])
    expect(casillasQueFaltan(a).map((c) => c.id)).toEqual(['distrito', 'consultas', 'examen'])
    expect(casillasQueFaltan(postulacion('supervisado', CINCO))).toEqual([])
  })

  it('con las cinco marcadas y aprobado por el equipo, sale como «Nuevo» con solo esas comprobaciones', () => {
    const a = postulacion('supervisado', CINCO)
    expect(cincoCasillasMarcadas(a)).toBe(true)
    expect(estadoVisible(a)).toBe('supervisado')
    const w = walkerDesdePostulacion(a)
    expect(w).not.toBeNull()
    expect(w?.comprobaciones).toEqual(CINCO)
    expect(w?.comprobaciones).not.toContain('primerPaseo')
  })

  it('las casillas solas no aprueban: en revisión, rechazada o borrador no salen aunque estén las cinco', () => {
    for (const status of ['borrador', 'enviada', 'rechazada'] as const) {
      expect(walkerDesdePostulacion(postulacion(status, CINCO)), status).toBeNull()
      expect(estadoVisible(postulacion(status, CINCO))).toBe(status)
    }
  })

  it('alta rápida: desmarcar una casilla ya no le quita la aprobación, pero deja de mostrar esa comprobación', () => {
    const a = postulacion('supervisado', CINCO)
    const b = { ...a, review: { ...a.review, comprobaciones: { ...a.review.comprobaciones, examen: false } } }
    expect(estadoVisible(b)).toBe('supervisado')
    expect(walkerDesdePostulacion(b)?.comprobaciones).not.toContain('examen')
  })

  it('un paseador de ejemplo (demostración) trae las cinco casillas y no se bloquea', () => {
    for (const w of WALKERS) {
      const a = appFromWalker(w)
      expect(cincoCasillasMarcadas(a), w.id).toBe(true)
      expect(estadoVisible(a), w.id).toBe('activo')
    }
  })
})

describe('dónde cobra el paseador: sin eso no puede recibir solicitudes', () => {
  it('Yape o Plin, un celular que sirva y el nombre del titular', () => {
    expect(cobroRegistrado({ metodo: 'yape', telefono: '987 654 321', titular: 'Ana Rojas' })).toBe(true)
    expect(cobroRegistrado({ metodo: 'plin', telefono: '+51 912 345 678', titular: 'Ana' })).toBe(true)
    expect(cobroRegistrado(COBRO_VACIO)).toBe(false)
    expect(cobroRegistrado(undefined)).toBe(false)
  })

  it('dice qué falta, en lenguaje simple', () => {
    expect(erroresCobro(COBRO_VACIO)).toEqual({
      metodo: 'Elige Yape o Plin.',
      telefono: 'Escribe un celular válido, por ejemplo 987 654 321.',
      titular: 'Escribe el nombre como sale en Yape o Plin.',
    })
    expect(erroresCobro({ metodo: 'yape', telefono: '(01) 319 0000', titular: 'Ana Rojas' }).telefono).toBeDefined() // un fijo no es un Yape
    expect(erroresCobro({ metodo: 'yape', telefono: '987 654 321', titular: 'Ana Rojas' })).toEqual({})
  })

  it('el celular se muestra al equipo con +51', () => {
    expect(celularDeCobro({ metodo: 'yape', telefono: '987 654 321', titular: 'x' })).toBe('+51987654321')
    expect(celularDeCobro(COBRO_VACIO)).toBe('')
  })

  it('aprobado con las cinco casillas pero sin dónde cobrar: NO recibe solicitudes (no sale al dueño)', () => {
    const a = { ...postulacion('supervisado', CINCO), cobro: COBRO_VACIO }
    expect(estadoVisible(a)).toBe('supervisado')
    expect(walkerDesdePostulacion(a)).toBeNull()
    expect(walkerDesdePostulacion(postulacion('supervisado', CINCO))).not.toBeNull()
  })

  it('el dueño NUNCA ve el número: lo que sale en la app del cliente no lo trae', () => {
    const w = walkerDesdePostulacion(postulacion('supervisado', CINCO))!
    const todo = JSON.stringify(w)
    expect(todo).not.toContain('987')
    expect(todo).not.toContain('654')
    expect(todo).not.toMatch(/titular|cobro/i)
    expect(Object.keys(w)).not.toContain('cobro')
  })

  it('una postulación guardada antes de esto se lee con el cobro vacío (lo registra para recibir solicitudes)', () => {
    const vieja = { ...postulacion('supervisado', CINCO) } as Partial<WalkerApplication>
    delete vieja.cobro
    const a = migrarPostulacion(vieja)!
    expect(a.cobro).toEqual(COBRO_VACIO)
    expect(walkerDesdePostulacion(a)).toBeNull()
  })

  it('el paseador de ejemplo (demostración) no necesita cuenta: no se inventa ninguna', () => {
    const a = appFromWalker(WALKERS[0])
    expect(a.cobro).toEqual(COBRO_VACIO)
  })
})

