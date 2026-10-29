import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { TEXTO_ADMIN } from './adminTextos'

const RAIZ = path.resolve(__dirname, '..')
const palabras = (t: string) => t.split(/\s+/).filter(Boolean).length
const leer = (rel: string) => fs.readFileSync(path.join(RAIZ, rel), 'utf8')

describe('/admin dice la verdad: hoy no está protegido', () => {
  it('lo primero que se lee es que no tiene contraseña ni inicio de sesión y que solo ve este navegador', () => {
    // El título solo ya dice lo verdadero: quien lee solo el título no debe creer que está protegido.
    expect(TEXTO_ADMIN.avisoTitulo).toMatch(/sin contraseña/i)
    expect(TEXTO_ADMIN.aviso.join(' ')).toMatch(/no tiene inicio de sesión/i)
    expect(TEXTO_ADMIN.aviso.join(' ')).toMatch(/solo para el equipo/)
    expect(TEXTO_ADMIN.aviso.join(' ')).toMatch(/un solo navegador/)
  })

  it('deja anotado qué hace falta para protegerlo: servidor e inicio de sesión', () => {
    const t = TEXTO_ADMIN.proteger.join(' ')
    expect(t).toMatch(/servidor/i)
    expect(t).toMatch(/inicio de sesión/i)
  })

  it('el título y el apoyo son cortos (5 y 12 palabras) y sin palabras prohibidas', () => {
    expect(palabras(TEXTO_ADMIN.titulo)).toBeLessThanOrEqual(5)
    expect(palabras(TEXTO_ADMIN.avisoTitulo)).toBeLessThanOrEqual(5)
    for (const l of [...TEXTO_ADMIN.aviso, ...TEXTO_ADMIN.proteger, TEXTO_ADMIN.faltanCasillas]) expect(palabras(l), l).toBeLessThanOrEqual(12)
    expect(palabras(TEXTO_ADMIN.paraAprobar(['DNI a la vista', 'Examen aprobado']))).toBeLessThanOrEqual(12)
    const todo = [TEXTO_ADMIN.eyebrow, TEXTO_ADMIN.titulo, TEXTO_ADMIN.avisoTitulo, ...TEXTO_ADMIN.aviso, TEXTO_ADMIN.avisoMas, ...TEXTO_ADMIN.proteger, TEXTO_ADMIN.faltanCasillas].join(' ')
    expect(todo).not.toMatch(/seguro|prueba|tiempo real|24\s*\/\s*7|100\s*%|garantiz|verificad/i)
  })

  it('el eyebrow ya no dice «solo fundadores» (sonaba a protegido) y se marca como demostración', () => {
    expect(TEXTO_ADMIN.eyebrow).toMatch(/Demostración/)
    expect(TEXTO_ADMIN.eyebrow).not.toMatch(/fundadores/i)
  })

  it('no hay ninguna contraseña ni campo de contraseña en el código del panel (no protegería nada)', () => {
    for (const f of ['components/admin/AdminPanel.tsx', 'components/admin/AvisoAdmin.tsx', 'components/admin/ColaDeCasos.tsx', 'app/admin/page.tsx']) {
      const src = leer(f)
      expect(src, f).not.toMatch(/type=["']password["']/i)
      expect(src, f).not.toMatch(/(ADMIN_|PANEL_)?(PASSWORD|PASSWD|CONTRASE[ÑN]A)\s*[=:]/)
      expect(src, f).not.toMatch(/process\.env\.[A-Z_]*(PASS|SECRET|TOKEN)/)
    }
  })
})
