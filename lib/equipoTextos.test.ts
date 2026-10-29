import { describe, expect, it } from 'vitest'
import { CONFIG, NOMBRE_APP, type Config } from './config'
import { apoyoQuienesSomos, filasEquipo, situaciones, TEXTO_ALGO_PASA, TEXTO_QUIENES } from './equipoTextos'

const palabras = (t: string) => t.split(/\s+/).filter(Boolean).length
const configCon = (equipo: Config['equipo']): Config => ({ ...CONFIG, equipo })
const CONFIG_CON_CONTACTO: Config = { ...CONFIG, contactosAyuda: [{ nombre: 'Contacto', telefono: '987 654 321' }] }
const CONFIG_SIN_CONTACTO: Config = { ...CONFIG, contactosAyuda: [] }

/** Todo lo que estas dos pantallas escriben, en una lista. */
function todosLosTextos(): string[] {
  const t = [
    ...Object.values(TEXTO_QUIENES).flatMap((v) => (typeof v === 'string' ? [v] : [])),
    TEXTO_QUIENES.mensajeContacto(NOMBRE_APP),
    apoyoQuienesSomos(),
    ...Object.values(TEXTO_ALGO_PASA),
    ...situaciones(CONFIG_CON_CONTACTO).flatMap((s) => [s.titulo, ...s.pasos]),
    ...CONFIG.equipo.map((p) => p.rol),
  ]
  return t
}

describe('Quiénes somos: el equipo sale de la configuración, nada inventado', () => {
  it('los roles vienen de docs/CONTEXTO.md y son tres', () => {
    expect(CONFIG.equipo.map((p) => p.rol)).toEqual(['La web y la lógica', 'El diseño y la marca', 'El marketing y las encuestas'])
  })

  it('sin nombres escritos, cada fila lo dice (nombre null = «Falta configurar»)', () => {
    const filas = filasEquipo(configCon(CONFIG.equipo.map((p) => ({ ...p, nombre: '' }))))
    expect(filas).toHaveLength(3)
    expect(filas.every((f) => f.nombre === null)).toBe(true)
  })

  it('un nombre solo aparece si el equipo lo escribió en la configuración, sin espacios de más', () => {
    const filas = filasEquipo(configCon([{ rol: 'La web', nombre: '  Ana  ' }, { rol: 'El diseño', nombre: '   ' }]))
    expect(filas).toEqual([
      { rol: 'La web', nombre: 'Ana' },
      { rol: 'El diseño', nombre: null },
    ])
  })

  it('el número de estudiantes sale de la lista, no de un texto escrito a mano', () => {
    expect(apoyoQuienesSomos()).toBe(`Somos ${CONFIG.equipo.length} estudiantes.`)
    expect(apoyoQuienesSomos(configCon([{ rol: 'x', nombre: '' }]))).toBe('Soy 1 estudiante.')
  })

  it('la etiqueta es «Piloto»', () => {
    expect(TEXTO_QUIENES.etiqueta).toBe('Piloto')
  })
})

describe('Si algo pasa: las tres situaciones y sus pasos', () => {
  it('son perro perdido, herido y pelea, con 3 pasos cada una cuando hay un contacto de Patitas', () => {
    const s = situaciones(CONFIG_CON_CONTACTO)
    expect(s.map((x) => x.id)).toEqual(['perdido', 'herido', 'pelea'])
    for (const x of s) expect(x.pasos).toHaveLength(3)
  })

  it('sin contacto de Patitas configurado no manda a contarle a nadie: queda sin ese paso (nada sin salida)', () => {
    const s = situaciones(CONFIG_SIN_CONTACTO)
    for (const x of s) {
      expect(x.pasos).toHaveLength(2)
      expect(x.pasos.join(' ')).not.toMatch(/Patitas/)
    }
  })

  it('no hay lista de veterinarias ni números escritos en los pasos (no hay convenio)', () => {
    for (const s of situaciones(CONFIG_CON_CONTACTO)) for (const p of s.pasos) expect(p).not.toMatch(/\d/)
    expect(situaciones(CONFIG_SIN_CONTACTO).find((s) => s.id === 'herido')?.pasos.join(' ')).toContain('veterinaria más cercana')
  })
})

describe('textos cortos y honestos en las dos pantallas', () => {
  it('títulos de hasta 5 palabras y apoyos de hasta 12', () => {
    const titulos = [TEXTO_QUIENES.titulo, TEXTO_QUIENES.equipoTitulo, TEXTO_QUIENES.pilotoTitulo, TEXTO_QUIENES.contactoTitulo, TEXTO_ALGO_PASA.titulo, TEXTO_ALGO_PASA.contactosTitulo, ...situaciones(CONFIG_CON_CONTACTO).map((s) => s.titulo)]
    for (const t of titulos) expect(palabras(t), t).toBeLessThanOrEqual(5)
    const apoyos = [TEXTO_QUIENES.piloto, apoyoQuienesSomos(), TEXTO_ALGO_PASA.apoyo, TEXTO_ALGO_PASA.noLlamaSola, TEXTO_ALGO_PASA.sinPaseo, TEXTO_ALGO_PASA.botonSosAyuda, TEXTO_QUIENES.faltanNombres, ...situaciones(CONFIG_CON_CONTACTO).flatMap((s) => s.pasos)]
    for (const t of apoyos) expect(palabras(t), t).toBeLessThanOrEqual(12)
  })

  it('no usan «seguro», «prueba», «tiempo real», «24/7», «100 %», «garantizado» ni «verificado»', () => {
    for (const t of todosLosTextos()) {
      expect(t, t).not.toMatch(/seguro|prueba|tiempo real|24\s*\/\s*7|100\s*%|garantiz|verificad|custodia|escrow/i)
    }
  })
})
