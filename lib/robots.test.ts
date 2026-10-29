import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const RAIZ = path.resolve(__dirname, '..')

describe('la app no debe salir en los buscadores (es un piloto)', () => {
  it('el layout de toda la app pide «noindex» y «nofollow»', () => {
    const src = fs.readFileSync(path.join(RAIZ, 'app', 'layout.tsx'), 'utf8')
    expect(src).toMatch(/robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/)
  })

  it('las páginas internas siguen pidiendo noindex por su cuenta', () => {
    for (const f of ['app/admin/page.tsx', 'app/afiche/page.tsx', 'app/p/[id]/page.tsx']) {
      const src = fs.readFileSync(path.join(RAIZ, f), 'utf8')
      expect(src, f).toMatch(/robots:\s*\{\s*index:\s*false/)
    }
  })
})
