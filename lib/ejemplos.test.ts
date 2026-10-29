import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { DEMO_ACCOUNT, DEMO_DOGS, PAST_WALKS, WALKERS } from './data'
import { casoEsDeEjemplo, esPaseadorDeEjemplo, mostrarEjemplosPorDefecto, paseadoresVisibles, resolverMostrarEjemplos, textoPaseadores } from './ejemplos'
import { walkerDesdePostulacion, appFromWalker, EMPTY_APP } from './walkerStore'
import type { Walker } from './types'

const RAIZ = path.resolve(__dirname, '..')

function archivos(dir: string): string[] {
  const salida: string[] = []
  for (const e of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name)
    if (e.isDirectory()) salida.push(...archivos(rel))
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.(ts|tsx)$/.test(e.name)) salida.push(rel)
  }
  return salida
}

const FUENTES = [...archivos('app'), ...archivos('components'), ...archivos('lib')]
const leer = (f: string) => fs.readFileSync(path.join(RAIZ, f), 'utf8')

function ls(dir: string, patron: RegExp): string[] {
  const abs = path.join(RAIZ, dir)
  if (!fs.existsSync(abs)) return []
  return fs.readdirSync(abs).filter((n) => patron.test(n)).map((n) => path.join(dir, n))
}

describe('nombres de ejemplo', () => {
  it('«Mamá», «Persona de prueba» y «Veterinaria de prueba» solo existen dentro de las pruebas', () => {
    const hallazgos: string[] = []
    const otros = ['README.md', 'CLAUDE.md', ...ls('docs', /\.md$/), ...ls('scripts', /\.mjs$/), ...ls('e2e', /\.ts$/)]
    for (const f of [...FUENTES, ...otros]) {
      const src = leer(f)
      if (/persona de prueba|veterinaria de prueba|(?<!\p{L})mamá(?!\p{L})/iu.test(src)) hallazgos.push(f)
    }
    expect(hallazgos).toEqual([])
  })
})


describe('los datos de ejemplo llevan su marca', () => {
  it('todos los paseadores inventados, sus reseñas y los paseos anteriores son «esEjemplo»', () => {
    expect(WALKERS.length).toBeGreaterThan(0)
    for (const w of WALKERS) {
      expect(w.esEjemplo, w.name).toBe(true)
      expect(w.reviews.length, w.name).toBeGreaterThan(0)
      for (const r of w.reviews) expect(r.esEjemplo, `${w.name}: ${r.id}`).toBe(true)
    }
    for (const p of PAST_WALKS) expect(p.esEjemplo, p.id).toBe(true)
  })

  it('un paseador real (aprobado por el equipo) NO lleva la marca', () => {
    const cinco = { dni: true, distrito: true, celular: true, consultas: true, examen: true }
    const real = walkerDesdePostulacion({
      ...EMPTY_APP,
      status: 'supervisado',
      code: 'PAT-REAL',
      person: { ...EMPTY_APP.person, firstName: 'Lucía', lastName: 'Quispe' },
      cobro: { metodo: 'plin', telefono: '912 345 678', titular: 'Lucía Quispe' },
      review: { comprobaciones: cinco, notes: '', supervisedWalks: 0 },
    })!
    expect(real.esEjemplo).toBeUndefined()
  })
})

describe('«N paseadores»: nunca cuenta gente inventada como real', () => {
  const real = { ...WALKERS[0], id: 'real-1', esEjemplo: undefined } as Walker
  it('cero, uno y varios', () => {
    expect(textoPaseadores([])).toBe('0 paseadores')
    expect(textoPaseadores([real])).toBe('1 paseador')
    expect(textoPaseadores([real, { ...real, id: 'real-2' }])).toBe('2 paseadores')
  })
  it('si todos son de ejemplo, lo dice', () => {
    expect(textoPaseadores([WALKERS[0]])).toBe('1 paseador de ejemplo')
    expect(textoPaseadores(WALKERS.slice(0, 2))).toBe('2 paseadores de ejemplo')
  })
  it('si hay mezcla, dice cuántos son de ejemplo', () => {
    expect(textoPaseadores([WALKERS[0], real, { ...real, id: 'real-2' }])).toBe('3 paseadores (1 de ejemplo)')
  })
})

describe('los datos de ejemplo ya no se contradicen', () => {
  it('cada paseo anterior es de un paseador que acepta ese tamaño de perro', () => {
    for (const p of PAST_WALKS) {
      const w = WALKERS.find((x) => x.name === p.walker)
      const perro = DEMO_DOGS.find((d) => d.name === p.dog)
      expect(w, `paseador ${p.walker}`).toBeDefined()
      expect(perro, `perro ${p.dog}`).toBeDefined()
      expect(w!.accepts, `${p.dog} (${perro!.size}) con ${p.walker}`).toContain(perro!.size)
    }
  })

  it('Carlos: los paseos que ve el dueño son los mismos que ve el paseador (no «127» contra «10 de 10»)', () => {
    const carlos = WALKERS.find((w) => w.id === 'carlos')!
    const app = appFromWalker(carlos)
    expect(app.review.paseosHechos).toBe(carlos.walks)
    expect(app.review.supervisedWalks).toBeLessThanOrEqual(10)
    expect(app.review.paseosHechos!).toBeGreaterThanOrEqual(app.review.supervisedWalks)
  })

  it('ningún paseador de ejemplo con la etiqueta «Nuevo» tiene más de 10 paseos', () => {
    for (const w of WALKERS) if (w.probation) expect(w.walks, w.name).toBeLessThanOrEqual(10)
  })

  it('el perro de la demostración cabe con el paseador de la demostración (Carlos)', () => {
    expect(WALKERS[0].accepts).toContain(DEMO_DOGS[0].size)
  })
})

describe('«Mostrar ejemplos»', () => {
  it('encendido en la demostración y sin cuenta; apagado en una cuenta real', () => {
    expect(mostrarEjemplosPorDefecto(DEMO_ACCOUNT)).toBe(true)
    expect(mostrarEjemplosPorDefecto(null)).toBe(true)
    expect(mostrarEjemplosPorDefecto({ ...DEMO_ACCOUNT, firstName: 'Lucía', phone: '912 345 678', createdAt: '2026-10-10' })).toBe(false)
  })

  it('lo que eligió la persona manda sobre el valor por defecto', () => {
    const real = { ...DEMO_ACCOUNT, firstName: 'Lucía', phone: '912 345 678', createdAt: '2026-10-10' }
    expect(resolverMostrarEjemplos(true, real)).toBe(true)
    expect(resolverMostrarEjemplos(false, DEMO_ACCOUNT)).toBe(false)
    expect(resolverMostrarEjemplos(null, real)).toBe(false)
    expect(resolverMostrarEjemplos(undefined, DEMO_ACCOUNT)).toBe(true)
  })

  it('apagado, solo quedan los paseadores reales; encendido, todos', () => {
    const real = { ...WALKERS[0], id: 'nuevo-1', esEjemplo: undefined } as Walker
    const todos = [real, ...WALKERS]
    expect(paseadoresVisibles(todos, false).map((w) => w.id)).toEqual(['nuevo-1'])
    expect(paseadoresVisibles(todos, true)).toHaveLength(todos.length)
    expect(paseadoresVisibles(WALKERS, false)).toEqual([])
  })

  it('reconoce a los paseadores y los casos de ejemplo', () => {
    expect(esPaseadorDeEjemplo('carlos')).toBe(true)
    expect(esPaseadorDeEjemplo('nuevo-PAT-1')).toBe(false)
    expect(esPaseadorDeEjemplo(undefined)).toBe(false)
    expect(casoEsDeEjemplo({ paseador: 'Carlos' })).toBe(true) // caso viejo, sin marca: por el nombre
    expect(casoEsDeEjemplo({ paseador: 'Lucía Q.', ejemplo: false })).toBe(false)
    expect(casoEsDeEjemplo({ paseador: 'Carlos', ejemplo: false })).toBe(false)
  })
})

describe('guardia: nadie muestra un dato de ejemplo sin la etiqueta', () => {
  /**
   * Cualquier pantalla que escriba el nombre completo de un paseador, sus reseñas o los paseos anteriores inventados
   * tiene que usar `EtiquetaEjemplo` (o mirar `esEjemplo`). Si una pantalla nueva lee esos datos y no la usa, esta
   * prueba falla. Las excepciones llevan su razón.
   */
  const EXCEPCIONES = new Map<string, string>([
    ['components/PatitasApp.tsx', 'Solo pasa los datos a las pantallas (que ponen la etiqueta) y guarda las reseñas PROPIAS de la persona.'],
    ['components/walker/WalkerApp.tsx', 'Arma la app de demostración con un paseador de ejemplo; la etiqueta sale en WalkerHome (cuando es demostración).'],
  ])
  const LEE_EJEMPLOS = /\.reviews\b|\bPAST_WALKS\b|\bWALKERS\b|\bwalker\.name\b|\bw\.name\b|\.walker\.name\b/

  it('cada pantalla que lee paseadores, reseñas o paseos de ejemplo usa la etiqueta', () => {
    const sin: string[] = []
    for (const f of FUENTES.filter((x) => x.startsWith('components') || x.startsWith('app'))) {
      const src = leer(f)
      if (!LEE_EJEMPLOS.test(src)) continue
      const key = f.split(path.sep).join('/')
      if (/EtiquetaEjemplo|esEjemplo/.test(src) || EXCEPCIONES.has(key)) continue
      sin.push(key)
    }
    expect(sin).toEqual([])
  })

  it('las excepciones siguen siendo necesarias (si una ya usa la etiqueta, se quita de la lista)', () => {
    for (const f of EXCEPCIONES.keys()) {
      expect(fs.existsSync(path.join(RAIZ, f)), f).toBe(true)
    }
  })
})
