import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { CONFIG } from './config'
import { detalleDeRespuesta, etiquetaDeExamen, marcasDeRevision, PREGUNTAS_EXAMEN, resultadoDeExamenEscrito, TEXTO_RESPUESTA } from './respuestasEscritas'

const buena = (i: number) => `Primero me calmo, miro alrededor y avisaría a la familia y a Patitas (${i}). Después sigo con cuidado.`
const todas = () => Object.fromEntries(PREGUNTAS_EXAMEN.map((p, i) => [p.id, buena(i)]))

describe('examen escrito: largo de cada respuesta', () => {
  it('vacía, corta, bien y larga, con el largo mínimo y máximo de lib/config.ts', () => {
    expect(detalleDeRespuesta('').estado).toBe('vacia')
    expect(detalleDeRespuesta('a'.repeat(CONFIG.respuestaMinima - 1)).estado).toBe('corta')
    expect(detalleDeRespuesta('a'.repeat(CONFIG.respuestaMinima)).estado).toBe('ok')
    expect(detalleDeRespuesta('a'.repeat(CONFIG.respuestaMaxima)).estado).toBe('ok')
    expect(detalleDeRespuesta('a'.repeat(CONFIG.respuestaMaxima + 1)).estado).toBe('larga')
  })
  it('los espacios de los bordes no cuentan', () => {
    expect(detalleDeRespuesta(`   ${'a'.repeat(10)}   `).largo).toBe(10)
  })
  it('un mensaje amable cuando es corta o larga, y ninguno cuando está bien', () => {
    const corta = detalleDeRespuesta('a'.repeat(30))
    expect(corta.faltan).toBe(CONFIG.respuestaMinima - 30)
    expect(corta.mensaje).toBe(TEXTO_RESPUESTA.corta(corta.faltan))
    expect(corta.mensaje).toMatch(/Cuéntanos un poquito más/)
    expect(detalleDeRespuesta('a'.repeat(CONFIG.respuestaMaxima + 3)).mensaje).toMatch(/quita 3 letras/)
    expect(detalleDeRespuesta('a'.repeat(CONFIG.respuestaMinima)).mensaje).toBe('')
    expect(TEXTO_RESPUESTA.corta(1)).toMatch(/1 letra\./)
  })
  it('los largos de la migración SQL son los de lib/config.ts', () => {
    const sql = fs.readFileSync(path.resolve(__dirname, '..', 'supabase', 'migrations', '20261016200000_respuestas_escritas.sql'), 'utf8')
    expect(sql).toContain(`between ${CONFIG.respuestaMinima} and ${CONFIG.respuestaMaxima}`)
    expect(sql).toContain(`char_length(v_t) < ${CONFIG.respuestaMinima}`)
    expect(sql).toContain(`char_length(v_t) > ${CONFIG.respuestaMaxima}`)
  })
})

describe('examen escrito: preguntas y resultado', () => {
  it('son 7 preguntas con ids estables y válidos para la base', () => {
    expect(PREGUNTAS_EXAMEN.map((p) => p.id)).toEqual(['q1', 'q2', 'q3', 'q5', 'q10', 'o1', 'o2'])
    for (const p of PREGUNTAS_EXAMEN) expect(p.id).toMatch(/^[a-z0-9_-]{1,40}$/)
  })
  it('no hay puntaje: siempre lo lee una persona', () => {
    const r = resultadoDeExamenEscrito(todas(), 600, new Date('2026-10-10T10:00:00Z'))
    expect(r).toMatchObject({ points: 0, max: 0, pct: 0, verdict: 'review', durationSec: 600, takenAt: '2026-10-10T10:00:00.000Z' })
    expect(Object.keys(r.open)).toEqual(PREGUNTAS_EXAMEN.map((p) => p.id))
    expect(etiquetaDeExamen(r)).toBe('Examen enviado')
    expect(etiquetaDeExamen({ ...r, max: 20, pct: 85 })).toBe('Examen: 85 %')
  })
  it('limpia los espacios de los bordes', () => {
    expect(resultadoDeExamenEscrito({ ...todas(), q1: `  ${buena(0)}  ` }, 600).open.q1).toBe(buena(0))
  })
})

describe('examen escrito: cosas para mirar (no deciden solas)', () => {
  it('una persona que escribe con cuidado y tarda lo normal no tiene marcas', () => {
    expect(marcasDeRevision(todas(), 600)).toEqual([])
  })
  it('respuestas iguales entre sí', () => {
    const m = marcasDeRevision({ ...todas(), q2: buena(0) }, 600)
    expect(m).toContain('q2: igual a la respuesta de q1')
  })
  it('enunciado copiado', () => {
    const m = marcasDeRevision({ ...todas(), q2: PREGUNTAS_EXAMEN[1].texto }, 600)
    expect(m).toContain('q2: copió el enunciado')
  })
  it('letras repetidas y poco cuidado', () => {
    expect(marcasDeRevision({ ...todas(), q3: 'jajajaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }, 600)).toContain('q3: letras repetidas')
    expect(marcasDeRevision({ ...todas(), q5: '12345 67890 12345 67890 12345 67890 12345' }, 600)).toContain('q5: casi no tiene letras')
  })
  it('terminar demasiado rápido y respuestas vacías', () => {
    expect(marcasDeRevision(todas(), 60)).toContain('Terminó demasiado rápido (menos de 2 minutos)')
    expect(marcasDeRevision({ ...todas(), o2: '' }, 600)).toContain('o2: sin respuesta')
  })
})
