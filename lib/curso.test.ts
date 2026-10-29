import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { CONFIG } from './config'
import { TEXTO_ADMIN } from './adminTextos'
import { estadoDelCurso, MAX_INTENTOS_CURSO, PASS_PCT, puntuarCurso, TEST_CURSO, type CursoResult } from './quiz'
import { ESCENAS_CURSO } from './cursoEscenas'
import { CursoStep, TEXTO_CURSO } from '../components/walker/CursoStep'

const RAIZ = path.resolve(__dirname, '..')
const T0 = new Date('2026-10-14T12:00:00Z')
const todasBien = Object.fromEntries(TEST_CURSO.map((q) => [q.id, q.correcta]))
const mal = (n: number) => Object.fromEntries(TEST_CURSO.map((q, i) => [q.id, i < n ? (q.correcta + 1) % q.options.length : q.correcta]))
const fallo = (cuando = T0): CursoResult => puntuarCurso(mal(5), cuando)

describe('mini curso: contenido (ocho escenas «¿Qué harías si…?»)', () => {
  it('son 8 escenas de las que pidió el equipo, cada una con 3 opciones y una correcta', () => {
    expect(ESCENAS_CURSO.map((e) => e.id)).toEqual(['correa', 'se-suelta', 'no-camina', 'pelea', 'fuera-de-lo-acordado', 'clima', 'cansancio', 'sin-senal'])
    expect(TEST_CURSO).toHaveLength(8)
    for (const e of ESCENAS_CURSO) {
      expect(e.opciones).toHaveLength(3)
      expect([0, 1, 2]).toContain(e.correcta)
      expect(e.situacion).toMatch(/¿Qué harías si te pasa\?/)
      expect(e.queHacer.length).toBeGreaterThanOrEqual(2)
      expect(e.queHacer.length).toBeLessThanOrEqual(3)
    }
  })

  it('mensajes cortos: títulos de hasta 5 palabras, cada mensaje de 2 a 4 líneas (hasta 40 palabras) y cada punto hasta 12', () => {
    const palabras = (t: string) => t.split(/\s+/).length
    for (const e of ESCENAS_CURSO) {
      expect(palabras(e.titulo), e.titulo).toBeLessThanOrEqual(5)
      expect(palabras(e.situacion), e.id).toBeLessThanOrEqual(40)
      expect(palabras(e.explicacion), e.id).toBeLessThanOrEqual(40)
      for (const t of e.queHacer) expect(palabras(t), t).toBeLessThanOrEqual(12)
    }
  })

  it('no promete nada ni habla de veterinarios, remedios o diagnósticos: nunca «capacitado», «certificado», «seguro», «100 %» ni «garantizado»', () => {
    const fuentes = [
      JSON.stringify(ESCENAS_CURSO),
      JSON.stringify(TEXTO_CURSO),
      fs.readFileSync(path.join(__dirname, '..', 'components', 'walker', 'CursoStep.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''),
    ].join(' ')
    expect(fuentes).not.toMatch(/capacitad|certificad|preparad|\bseguro\b|100\s?%|garantiz|verificad|\bmg\b|\bml\b|miligram|pastilla|dosis|diagn[oó]stic/i)
    expect(fuentes).not.toMatch(/veterinari|veterinario|remedio|medicin/i)
  })

  it('ante una emergencia: calma, avisar a la familia por chat o llamada y escribir a Patitas', () => {
    const todo = JSON.stringify(ESCENAS_CURSO)
    expect(todo).toMatch(/Avisa a la familia por chat o llamada/)
    expect(todo).toMatch(/Escribe a Patitas/)
    expect(todo).toMatch(/calma/i)
  })
})

describe('mini curso: puntaje', () => {
  it('todo bien: 100 % y aprobado', () => {
    const r = puntuarCurso(todasBien, T0)
    expect([r.aciertos, r.total, r.pct, r.aprobado]).toEqual([8, 8, 100, true])
  })
  it('7 de 8 = 88 %: llega a PASS_PCT; 6 de 8 = 75 % no', () => {
    expect(PASS_PCT).toBe(80)
    expect(puntuarCurso(mal(1), T0)).toMatchObject({ aciertos: 7, pct: 88, aprobado: true })
    expect(puntuarCurso(mal(2), T0)).toMatchObject({ aciertos: 6, pct: 75, aprobado: false })
  })
  it('sin responder, 0 %', () => {
    expect(puntuarCurso({}, T0).pct).toBe(0)
  })
})

describe('mini curso: intentos y reintento a los 3 meses', () => {
  it('sin intentos está pendiente; aprobado cierra', () => {
    expect(estadoDelCurso(undefined, 0, T0)).toEqual({ estado: 'pendiente', intento: 1 })
    expect(estadoDelCurso(puntuarCurso(todasBien, T0), 1, T0).estado).toBe('aprobado')
  })
  it('un primer fallo deja reintentar (intento 2 de 2)', () => {
    expect(estadoDelCurso(fallo(), 1, T0)).toEqual({ estado: 'reintentar', intento: 2 })
    expect(MAX_INTENTOS_CURSO).toBe(2)
  })
  it('agotados los 2 intentos hay que esperar 3 meses desde el último', () => {
    const e = estadoDelCurso(fallo(), 2, new Date('2027-01-10T00:00:00Z'))
    expect(e.estado).toBe('espera')
    if (e.estado === 'espera') expect(e.desde.slice(0, 10)).toBe('2027-01-14')
    expect(estadoDelCurso(fallo(), 2, new Date('2027-01-14T12:00:00Z')).estado).toBe('pendiente')
  })
})

describe('mini curso: el contenido sin revisar NO bloquea al paseador (decisión de la usuaria)', () => {
  it('la bandera sigue en false: es un recordatorio para el equipo, no un freno', () => {
    expect(CONFIG.cursoRevisado).toBe(false)
  })
  const verCurso = (o: { demostracion?: boolean; curso?: CursoResult; intentos?: number } = {}) =>
    renderToStaticMarkup(createElement(CursoStep, { intentos: o.intentos ?? 0, curso: o.curso, demostracion: o.demostracion, onDone: () => undefined, onContinue: () => undefined }))
  it('con una cuenta real el paseador ve el curso y puede empezar, aunque el contenido no esté revisado', () => {
    const h = verCurso()
    expect(h).toContain('Empezar')
    expect(h).toContain('Ocho escenas')
  })
  it('al paseador NUNCA se le muestra que el contenido falta revisar (ni en la cuenta real ni en la demostración)', () => {
    for (const h of [verCurso(), verCurso({ demostracion: true })]) {
      expect(h).not.toMatch(/Falta revisar|Aún no puedes avanzar|sin revisión veterinaria|formación lo revisa|Borrador/i)
    }
  })
  it('el paseador que aprobó el curso puede continuar', () => {
    const aprobado: CursoResult = { aprobado: true, pct: 100, aciertos: 8, total: 8, takenAt: '2026-10-10T10:00:00.000Z' }
    const h = verCurso({ curso: aprobado, intentos: 1 })
    expect(h).toContain('Continuar')
  })
  it('la demostración se ve completa con el rótulo «Demostración»', () => {
    const h = verCurso({ demostracion: true })
    expect(h).toContain('Demostración')
    expect(h).toContain('Empezar')
  })
  it('el recordatorio queda SOLO para el equipo: lo dice /admin y no lo dice ninguna pantalla del paseador', () => {
    expect(TEXTO_ADMIN.cursoSinRevisar).toMatch(/equipo/)
    expect(TEXTO_ADMIN.cursoSinRevisar).not.toMatch(/veterinari/i)
    for (const f of ['components/walker/CursoStep.tsx', 'components/walker/WalkerOnboarding.tsx', 'components/walker/WalkerApp.tsx', 'components/walker/WalkerHome.tsx']) {
      // Sin comentarios: los comentarios del código sí pueden explicar el porqué.
      const codigo = fs.readFileSync(path.join(RAIZ, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
      expect(codigo, f).not.toMatch(/Falta revisar este contenido|Aún no puedes avanzar|cursoRevisado|cursoSinRevisar/)
    }
    expect(fs.readFileSync(path.join(RAIZ, 'components/admin/AdminPanel.tsx'), 'utf8')).toMatch(/cursoSinRevisar/)
  })
})
