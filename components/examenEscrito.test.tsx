import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CONFIG } from '@/lib/config'
import { PREGUNTAS_EXAMEN, resultadoDeExamenEscrito } from '@/lib/respuestasEscritas'
import { RespuestasDelExamen, TEXTO_RESPUESTAS_ADMIN } from './admin/RespuestasDelExamen'
import { QuizStep, TEXTO_EXAMEN } from './walker/QuizStep'
import { CursoStep } from './walker/CursoStep'
import { ESCENAS_CURSO } from '@/lib/cursoEscenas'

const nada = () => undefined
const respuestas = Object.fromEntries(PREGUNTAS_EXAMEN.map((p, i) => [p.id, `Respuesta escrita número ${i} con mis propias palabras, con cuidado y avisando.`]))

describe('examen escrito: pantallas', () => {
  it('la entrada dice que se escribe con palabras propias, el largo permitido y que no hay puntaje', () => {
    const h = renderToStaticMarkup(<QuizStep onDone={nada} onContinue={nada} />)
    expect(h).toContain(TEXTO_EXAMEN.titulo)
    expect(h).toContain(`entre ${CONFIG.respuestaMinima} y ${CONFIG.respuestaMaxima} letras`)
    expect(h).toContain('No hay puntaje')
    expect(h).toContain(TEXTO_EXAMEN.privacidad)
    expect(h).not.toMatch(/\d+ %/)
  })
  it('con el examen ya enviado muestra «Pasa a revisión» y deja continuar', () => {
    const h = renderToStaticMarkup(<QuizStep result={resultadoDeExamenEscrito(respuestas, 600)} onDone={nada} onContinue={nada} />)
    expect(h).toContain(TEXTO_EXAMEN.resultadoTitulo)
    expect(h).toContain('Continuar')
  })
  it('el equipo ve, por pregunta, lo que escribió la persona', () => {
    const h = renderToStaticMarkup(<RespuestasDelExamen quiz={resultadoDeExamenEscrito(respuestas, 600)} intento={1} />)
    for (const p of PREGUNTAS_EXAMEN) expect(h).toContain(p.texto.slice(0, 30).replace(/«/g, '«'))
    expect(h).toContain('Respuesta escrita número 3')
    expect(h).toContain(TEXTO_RESPUESTAS_ADMIN.lectura)
  })
  it('sin examen, el equipo ve «Aún no la rindió»; con respuestas vacías, «Sin respuesta»', () => {
    expect(renderToStaticMarkup(<RespuestasDelExamen intento={0} />)).toContain(TEXTO_RESPUESTAS_ADMIN.aun)
    expect(renderToStaticMarkup(<RespuestasDelExamen quiz={{ ...resultadoDeExamenEscrito({}, 600) }} intento={1} />)).toContain(TEXTO_RESPUESTAS_ADMIN.sinRespuesta)
  })
})

describe('mini curso: pantallas', () => {
  it('la entrada cuenta las escenas y no promete nada', () => {
    const h = renderToStaticMarkup(<CursoStep intentos={0} onDone={nada} onContinue={nada} />)
    expect(h).toContain(`${ESCENAS_CURSO.length} escenas`)
    expect(h).toContain('Empezar')
  })
  it('el cierre trae qué hacer en una emergencia y el contacto de Patitas (o «Falta configurar»)', () => {
    const h = renderToStaticMarkup(<CursoStep curso={{ aprobado: true, pct: 100, aciertos: 8, total: 8, takenAt: '2026-10-10T10:00:00.000Z' }} intentos={1} onDone={nada} onContinue={nada} />)
    expect(h).toContain('calma, avisa a la familia por chat o llamada y escribe a Patitas')
    expect(h).toMatch(/Falta configurar el contacto de Patitas|tel:/)
  })
})
