import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { plural, soles, solesShort } from './utils'

describe('soles', () => {
  it('siempre muestra dos decimales', () => {
    expect(soles(28)).toBe('S/ 28.00')
    expect(soles(12.5)).toBe('S/ 12.50')
  })
})

describe('solesShort', () => {
  it('quita los decimales si el monto es entero', () => {
    expect(solesShort(25)).toBe('S/ 25')
  })
  it('deja dos decimales si el monto no es entero', () => {
    expect(solesShort(22.5)).toBe('S/ 22.50')
  })
})

describe('plural', () => {
  it('uno va en singular', () => {
    expect(plural(1, 'paseador', 'paseadores')).toBe('1 paseador')
    expect(plural(1, 'paseo completado', 'paseos completados')).toBe('1 paseo completado')
  })
  it('cero y varios van en plural', () => {
    expect(plural(0, 'paseador', 'paseadores')).toBe('0 paseadores')
    expect(plural(2, 'foto', 'fotos')).toBe('2 fotos')
    expect(plural(12, 'perro', 'perros')).toBe('12 perros')
  })
})

/**
 * Un número que se muestra seguido de un sustantivo en plural escrito a mano («{n} paseadores») sale mal con 1.
 * Estos archivos muestran conteos que pueden valer 1: tienen que usar plural().
 */
describe('los conteos de pantalla usan plural()', () => {
  const RAIZ = path.resolve(__dirname, '..')
  const archivos = ['ZonesMap', 'WalkerCard', 'ReviewsSheet', 'LiveWalk', 'walker/WalkerHome', 'DogSheets', 'DogForm']
  const SUSTANTIVOS = 'paseadores|paseos|perros|fotos|reseñas|horarios|eventos|estrellas|años'

  it('ningún archivo pega un número o conteo con un sustantivo en plural escrito a mano', () => {
    const malos: string[] = []
    for (const a of archivos) {
      const f = `components/${a}.tsx`
      const src = fs.readFileSync(path.join(RAIZ, f), 'utf8')
      src.split('\n').forEach((linea, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(linea)) return
        // «{algo} paseadores» o «${algo} paseadores»
        if (new RegExp(`\\}\\s+(${SUSTANTIVOS})\\b`).test(linea) && !/plural\(|=== 1|\.plural\b/.test(linea)) malos.push(`${f}:${i + 1}: ${linea.trim().slice(0, 90)}`)
      })
    }
    expect(malos).toEqual([])
  })
})
