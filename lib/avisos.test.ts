import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { debeAvisar, idsNuevos, normalizarPref, PREF_INICIAL } from './avisos'
import { TEXTO_ALERTAS } from './avisosTextos'

describe('avisos con la app abierta', () => {
  it('solo suena si la persona los activó y no los silenció', () => {
    expect(debeAvisar(PREF_INICIAL)).toBe(false)
    expect(debeAvisar({ visto: true, silenciado: false })).toBe(true)
    expect(debeAvisar({ visto: true, silenciado: true })).toBe(false)
    expect(debeAvisar({ visto: false, silenciado: false })).toBe(false)
  })
  it('lo guardado dañado parte de cero', () => {
    expect(normalizarPref(null)).toEqual(PREF_INICIAL)
    expect(normalizarPref('x')).toEqual(PREF_INICIAL)
    expect(normalizarPref({ visto: true, silenciado: 'si' })).toEqual({ visto: true, silenciado: false })
  })
  it('los ids nuevos son los que no se habían visto', () => {
    expect(idsNuevos(new Set(['a', 'b']), ['a', 'b', 'c', 'd'])).toEqual(['c', 'd'])
    expect(idsNuevos(new Set(), [])).toEqual([])
  })
  it('la insignia dice «1 nuevo» o «N nuevos»', () => {
    expect(TEXTO_ALERTAS.nuevos(1)).toBe('1 nuevo')
    expect(TEXTO_ALERTAS.nuevos(3)).toBe('3 nuevos')
  })
  it('la app y docs/PUBLICAR.md dicen la verdad: con el navegador cerrado todavía no hay aviso', () => {
    expect(TEXTO_ALERTAS.limite).toContain('todavía no hay aviso')
    const doc = fs.readFileSync(path.resolve(__dirname, '..', 'docs', 'PUBLICAR.md'), 'utf8')
    expect(doc).toContain('Con el navegador cerrado, todavía no hay aviso')
    expect(doc).toContain('Web Push')
    expect(doc).toContain('segundosEntreConsultas')
  })
})
