import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import fs from 'node:fs'
import path from 'node:path'
import { NOMBRE_APP, NOMBRE_CORTO } from './config'
import { Logo } from '@/components/ui/Logo'

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

/** El código sin comentarios (los comentarios no se ven en pantalla). */
const sinComentarios = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')

/**
 * Archivos donde el nombre viejo puede quedar (por ejemplo, una hoja del diseñador que él mismo actualizará).
 * Cada excepción debe llevar la razón. Hoy no hay ninguna.
 */
const EXCEPCIONES: Array<{ archivo: string; razon: string }> = []

describe('nombre de la app', () => {
  it('el nombre es «Patitas Connect» (como el logo) y sale de una sola constante', () => {
    expect(NOMBRE_APP).toBe('Patitas Connect')
  })

  it('el nombre corto es la primera palabra del nombre y cabe bajo el ícono del celular', () => {
    expect(NOMBRE_APP.startsWith(NOMBRE_CORTO)).toBe(true)
    expect(NOMBRE_CORTO.length).toBeLessThanOrEqual(12)
  })

  /**
   * El nombre anterior («Patitas Conectadas», del 10 al 29 de octubre de 2026), escrito de cualquier manera que se vea
   * en pantalla. Se mira el archivo ENTERO (no línea por línea): «Patitas\n conectadas», «Patitas&nbsp;conectadas»,
   * «Patitas{' '}conectadas» y «Patitas <span>conectadas</span>».
   */
  const NOMBRE_VIEJO: Array<{ nombre: string; patron: RegExp }> = [
    { nombre: 'Patitas conectadas (con espacio, salto de línea, &nbsp; o {\' \'})', patron: /patitas(?:\s|&nbsp;|&#160;|\u00a0|\{\s*(['"`])\s*\1\s*\})+conectadas\b/i },
    { nombre: 'Patitas <span>conectadas</span>', patron: /patitas\s*(?:<[^>]*>\s*)+conectadas\b/i },
    { nombre: '«conectadas» solo, como palabra del logo', patron: /(?:>\s*|['"`])conectadas(?:\s*<|['"`])/i },
  ]

  it('el nombre viejo no aparece en ningún texto visible (el código sin comentarios)', () => {
    const permitidos = new Set(EXCEPCIONES.map((e) => path.normalize(e.archivo)))
    const malos: string[] = []
    for (const f of [...archivos('app'), ...archivos('components'), ...archivos('lib')]) {
      if (permitidos.has(path.normalize(f))) continue
      const src = sinComentarios(fs.readFileSync(path.join(RAIZ, f), 'utf8'))
      for (const { nombre, patron } of NOMBRE_VIEJO) {
        const m = patron.exec(src)
        if (m) malos.push(`${f}:${src.slice(0, m.index).split('\n').length}  ${nombre}`)
      }
    }
    expect(malos).toEqual([])
  })

  it('la prueba sabe ver el nombre viejo escrito de las formas difíciles', () => {
    const casos = ['Patitas Conectadas', 'patitas  conectadas', 'Patitas\n      conectadas', 'Patitas&nbsp;conectadas', "Patitas{' '}conectadas", 'Patitas <span class="x">conectadas</span>', '<i>conectadas</i>']
    for (const c of casos) expect(NOMBRE_VIEJO.some((n) => n.patron.test(c)), JSON.stringify(c)).toBe(true)
    // el nombre interno y el actual no deben saltar
    for (const c of ['patitas-connect', 'patitas-connect.vercel.app', 'Patitas Connect', 'Patitas <span>Connect</span>']) {
      expect(NOMBRE_VIEJO.some((n) => n.patron.test(c)), JSON.stringify(c)).toBe(false)
    }
  })

  it('el logotipo escribe «Patitas» y «Connect» y se anuncia con el nombre completo', () => {
    const html = renderToStaticMarkup(Logo({ tone: 'orange', size: 36 }))
    expect(html).toContain('Patitas')
    expect(html).toContain('Connect')
    expect(html).toContain(`aria-label="${NOMBRE_APP}"`)
    expect(html).not.toMatch(/conectadas/i)
  })

  it('el mensaje de WhatsApp del SOS usa el nombre nuevo', async () => {
    const { mensajeSos } = await import('./sos')
    const m = mensajeSos({ quien: 'paseador', perro: 'Max', paseador: 'Carlos', posicion: null })
    expect(m).toContain(NOMBRE_APP)
    expect(m).not.toMatch(/patitas conectadas/i)
  })
})
