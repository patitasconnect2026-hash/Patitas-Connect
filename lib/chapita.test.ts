import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { TEXTO_CHAPITA } from './chapitaTextos'

const RAIZ = path.resolve(__dirname, '..')
const leer = (f: string) => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const sinComentarios = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')

describe('el QR de la chapita', () => {
  it('apunta a una ruta que existe (/p/<id> → app/p/[id]/page.tsx)', () => {
    const dog = sinComentarios(leer('components/DogSheets.tsx'))
    expect(dog).toMatch(/\$\{origin\}\/p\/\$\{dog\.id\}/)
    expect(fs.existsSync(path.join(RAIZ, 'app', 'p', '[id]', 'page.tsx'))).toBe(true)
  })

  it('la dirección sale de donde está abierta la app: no hay ningún dominio escrito a mano en la chapita', () => {
    const dog = sinComentarios(leer('components/DogSheets.tsx'))
    expect(dog).not.toMatch(/https?:\/\/[a-z0-9.-]+\.[a-z]{2,}/i)
    expect(dog).not.toMatch(/vercel\.app/)
  })

  it('la página no lee datos del perro ni de la familia, pide noindex y dice su límite', () => {
    const pagina = leer('app/p/[id]/page.tsx')
    expect(pagina).toMatch(/robots:\s*\{\s*index:\s*false/)
    expect(sinComentarios(pagina)).not.toMatch(/params|localStorage|lib\/datos|useDato/)
    expect(TEXTO_CHAPITA.limite).toMatch(/no muestra los datos de la familia/)
  })

  it('los textos no prometen nada y son cortos', () => {
    const todo = JSON.stringify(TEXTO_CHAPITA)
    expect(todo).not.toMatch(/seguro|100\s?%|garantiz|24\s*\/\s*7/i)
    for (const p of TEXTO_CHAPITA.pasos) expect(p.split(/\s+/).length, p).toBeLessThanOrEqual(16)
  })
})
