/**
 * La verificación en vivo (DNI y consultas oficiales) es solo entre el paseador y el equipo, coordinada por WhatsApp
 * (decisión de la usuaria, 26 de octubre de 2026: ya no se agenda una videollamada con horario fijo; el equipo escribe
 * por WhatsApp para coordinar). No hay forma de traer o invitar a otras personas (acompañantes, invitados ni
 * referencias): ni en la pantalla, ni en el almacén, ni en los textos. Sin red, sin cuentas.
 */
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { WALKERS } from '@/lib/data'
import { WALKER_BLOCKS } from '@/lib/legal'
import { migrarPostulacion, EMPTY_APP, appFromWalker, type WalkerApplication } from '@/lib/walkerStore'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => undefined, replace: () => undefined, refresh: () => undefined }) }))

import { firstOpenStep, postulacionCompleta, WalkerOnboarding } from './WalkerOnboarding'

const RAIZ = path.resolve(__dirname, '..', '..')
const sinComentarios = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')

/** Una postulación que llegó hasta el paso 6 (falta elegir la hora de la videollamada). */
function enElPaso6(extra: Partial<WalkerApplication> = {}): WalkerApplication {
  return {
    ...appFromWalker(WALKERS[0]),
    status: 'borrador',
    photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ',
    consent: Object.fromEntries(WALKER_BLOCKS.map((b) => [b.id, true])),
    cobro: { metodo: 'yape', telefono: '987 654 321', titular: 'Ana Rojas' },
    curso: { aciertos: 5, total: 5, pct: 100, aprobado: true, takenAt: '2026-10-13T10:00:00.000Z' },
    quiz: { points: 10, max: 10, pct: 100, danger: [], open: {}, openFlags: [], durationSec: 120, verdict: 'auto', takenAt: '2026-10-13T10:05:00.000Z' },
    review: { comprobaciones: {}, notes: '', supervisedWalks: 0 },
    consults: { consent: false },
    videoSlot: '',
    ...extra,
  }
}

const pintar = (app: WalkerApplication) => renderToStaticMarkup(createElement(WalkerOnboarding, { app, onChange: () => undefined, onSubmit: () => undefined, onExit: () => undefined }))

describe('el paso de verificación en vivo: ya no se agenda un horario', () => {
  it('la postulación llega al paso 6 y se detiene ahí hasta dar la autorización (no hace falta elegir hora)', () => {
    expect(firstOpenStep(enElPaso6())).toBe(6)
    expect(firstOpenStep(enElPaso6({ consults: { consent: true } }))).toBe(7)
    expect(postulacionCompleta(enElPaso6({ consults: { consent: true } }))).toBe(true)
  })

  it('se titula «Verificación en vivo», no pide horario y dice que se coordina por WhatsApp', () => {
    const h = pintar(enElPaso6())
    expect(h).toContain('Verificación en vivo')
    expect(h).not.toContain('Elige tu horario de videollamada')
    expect(h).not.toContain('Lun 7:00 pm')
    expect(h).toMatch(/WhatsApp/)
  })

  it('NO ofrece traer ni invitar a nadie: sin referencias, invitados ni acompañantes (ni campos de nombre, relación o celular)', () => {
    const h = pintar(enElPaso6())
    expect(h).not.toMatch(/Referencia|referencia|invit|acompañante|Acompañante|Relación|Nombre completo|Dos personas que te conozcan/)
    expect(h).not.toMatch(/placeholder="(Nombre completo|Relación|Celular)"/)
  })

  it('con la autorización marcada basta para continuar: ya no hay referencias que completar o borrar', () => {
    const h = pintar(enElPaso6({ consults: { consent: true } }))
    // Se abre en el paso 7 («Revisa y envía»): la lista no menciona referencias ni un horario de videollamada.
    expect(h).toContain('Revisa y envía')
    expect(h).not.toMatch(/Videollamada ·/)
    expect(h).not.toMatch(/Referencias|referencia/)
  })
})

describe('el almacén de datos ya no guarda referencias', () => {
  it('una postulación nueva no tiene `refs`', () => {
    expect(Object.keys(EMPTY_APP)).not.toContain('refs')
    expect(Object.keys(appFromWalker(WALKERS[0]))).not.toContain('refs')
  })

  it('una postulación guardada antes, con referencias, las pierde al leerse (no se vuelven a mostrar ni a mandar)', () => {
    const vieja = { ...EMPTY_APP, person: { ...EMPTY_APP.person, firstName: 'Lucía' }, refs: [{ name: 'Marisol', relation: 'Profesora', phone: '987 111 222' }], videoSlot: 'Lun 7:00 pm' }
    const leida = migrarPostulacion(vieja)!
    expect(Object.keys(leida)).not.toContain('refs')
    expect(JSON.stringify(leida)).not.toContain('Marisol')
    // Lo demás se conserva, incluida la hora que eligió.
    expect(leida.person.firstName).toBe('Lucía')
    expect(leida.videoSlot).toBe('Lun 7:00 pm')
  })
})

describe('el código y los textos no ofrecen invitar a nadie a la videollamada', () => {
  const archivos = ['components/walker/WalkerOnboarding.tsx', 'components/walker/WalkerApp.tsx', 'components/walker/WalkerHome.tsx', 'components/admin/AdminPanel.tsx', 'lib/servidor/postulacionesMapeo.ts', 'lib/legal.ts', 'lib/equipoTextos.ts', 'lib/verificacion.ts']
  it('lib/walkerStore.ts no define `refs` (solo las descarta al leer lo guardado antes)', () => {
    const codigo = sinComentarios(fs.readFileSync(path.join(RAIZ, 'lib/walkerStore.ts'), 'utf8'))
    expect(codigo).not.toMatch(/refs:\s*(Array|\[)|invitad|acompañante/i)
  })
  it.each(archivos)('%s no tiene referencias ni invitados', (rel) => {
    const codigo = sinComentarios(fs.readFileSync(path.join(RAIZ, rel), 'utf8'))
    expect(codigo).not.toMatch(/\brefs\b|referenciasOk|refCompleta|Referencias \(opcional\)|Referencia \$\{|invitad|acompañante/i)
  })
})
