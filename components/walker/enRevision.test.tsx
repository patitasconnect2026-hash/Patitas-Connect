/**
 * La pantalla «En revisión» del paseador sale SOLO cuando la postulación pasó todos los pasos (con el curso y el
 * examen) y se envió. Sin red, sin cuentas: funciones puras y la pantalla pintada con una postulación de mentira.
 */
import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { WALKERS } from '@/lib/data'
import { WALKER_BLOCKS } from '@/lib/legal'
import { appFromWalker, estadoVisible, type WalkerApplication } from '@/lib/walkerStore'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => undefined, replace: () => undefined, refresh: () => undefined }) }))

import { debeVerLosPasos, firstOpenStep, postulacionCompleta } from './WalkerOnboarding'
import { Status } from './WalkerApp'

/** Una postulación con TODOS los pasos hechos y sin enviar. */
function completa(extra: Partial<WalkerApplication> = {}): WalkerApplication {
  const base = appFromWalker(WALKERS[0])
  return {
    ...base,
    status: 'borrador',
    photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ',
    consent: Object.fromEntries(WALKER_BLOCKS.map((b) => [b.id, true])),
    cobro: { metodo: 'yape', telefono: '987 654 321', titular: 'Ana Rojas' },
    curso: { aciertos: 5, total: 5, pct: 100, aprobado: true, takenAt: '2026-10-13T10:00:00.000Z' },
    quiz: { points: 10, max: 10, pct: 100, danger: [], open: {}, openFlags: [], durationSec: 120, verdict: 'auto', takenAt: '2026-10-13T10:05:00.000Z' },
    review: { comprobaciones: {}, notes: '', supervisedWalks: 0 },
    ...extra,
  }
}

describe('«En revisión» solo después de pasar todos los pasos y enviar', () => {
  it('la postulación de prueba está completa (si no, el resto de la prueba no dice nada)', () => {
    expect(firstOpenStep(completa())).toBe(6)
    expect(postulacionCompleta(completa())).toBe(true)
  })

  it('terminada pero SIN enviar: se quedan los pasos (el botón de enviar), no «En revisión»', () => {
    const a = completa({ status: 'borrador' })
    expect(debeVerLosPasos(a)).toBe(true)
  })

  it('al enviarla: «En revisión»', () => {
    const a = completa({ status: 'enviada' })
    expect(estadoVisible(a)).toBe('enviada')
    expect(debeVerLosPasos(a)).toBe(false)
  })

  it('«enviada» pero sin haber hecho el curso: vuelve a los pasos, no «En revisión»', () => {
    const a = completa({ status: 'enviada', curso: undefined })
    expect(firstOpenStep(a)).toBe(5)
    expect(debeVerLosPasos(a)).toBe(true)
  })

  it('«enviada» pero sin el examen, o con el examen no aprobado: vuelve a los pasos', () => {
    expect(debeVerLosPasos(completa({ status: 'enviada', quiz: undefined }))).toBe(true)
    const reprobado = completa({ status: 'enviada' })
    expect(debeVerLosPasos({ ...reprobado, quiz: { ...reprobado.quiz!, verdict: 'fail' } })).toBe(true)
  })

  it('«enviada» pero con un paso anterior sin hacer (términos, datos, perfil, verificación en vivo): vuelve a ese paso', () => {
    expect(debeVerLosPasos(completa({ status: 'enviada', phone: '' }))).toBe(true)
    expect(debeVerLosPasos(completa({ status: 'enviada', consent: {} }))).toBe(true)
    expect(debeVerLosPasos(completa({ status: 'enviada', consults: { consent: false } }))).toBe(true)
  })

  it('una postulación vacía (cuenta nueva) no es «enviada» ni completa', () => {
    const vacia = completa({ status: 'borrador', phone: '', consent: {}, curso: undefined, quiz: undefined })
    expect(postulacionCompleta(vacia)).toBe(false)
    expect(debeVerLosPasos(vacia)).toBe(true)
  })
})

describe('el texto de «En revisión»', () => {
  const html = (conDemo: boolean) => renderToStaticMarkup(createElement(Status, { app: completa({ status: 'enviada' }), conDemo, onDelete: () => undefined, onSalir: () => undefined }))

  it('dice que la revisa una persona administradora del equipo, sin plazos ni promesas', () => {
    const h = html(false)
    expect(h).toContain('Revisaremos tu postulación con cuidado')
    expect(h).toContain('administradora del equipo')
    expect(h).not.toMatch(/\d+\s*a\s*\d+\s*días/)
    expect(h).not.toMatch(/\bseguro\b/i)
    expect(h).not.toMatch(/verificad[oa]/i)
    expect(h).not.toContain('Tu postulación está en revisión')
  })

  it('con una cuenta de verdad no ofrece «Demo: abrir panel interno y aprobar»; en la demostración sí', () => {
    expect(html(false)).not.toContain('Demo: abrir panel interno')
    expect(html(true)).toContain('Demo: abrir panel interno y aprobar')
  })
})
