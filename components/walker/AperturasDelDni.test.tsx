import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { TEXTO_REVISION_SERVIDOR } from '@/lib/servidor/paseosTextos'
import { AperturasDelDni } from './AperturasDelDni'

const una = [{ walkerId: 'carlos', at: '2026-10-12T15:30:00.000Z' }]
const vista = (conServidor: boolean, views = una) => renderToStaticMarkup(<AperturasDelDni conServidor={conServidor} views={views} />)

describe('«Quién abrió tu DNI» del paseador', () => {
  it('en el teléfono: nadie lo abrió, o la lista de aperturas, como siempre', () => {
    expect(vista(false, [])).toContain('Nadie lo ha abierto todavía.')
    const h = vista(false)
    expect(h).toContain('Un cliente vio los últimos 4 dígitos')
    expect(h).toContain('Cada apertura queda aquí.')
    expect(h).not.toContain(TEXTO_REVISION_SERVIDOR.dniAperturasAviso)
  })

  it('con servidor: dice que todavía no se puede avisar, y NO muestra una lista vacía que parezca «nadie lo abrió»', () => {
    for (const views of [[], una]) {
      const h = vista(true, views)
      expect(h).toContain(TEXTO_REVISION_SERVIDOR.dniAperturasAviso)
      expect(h).toContain(TEXTO_REVISION_SERVIDOR.dniAperturasApoyo)
      expect(h).not.toContain('Nadie lo ha abierto todavía.')
      expect(h).not.toContain('Cada apertura queda aquí.')
      // No decide cuántos dígitos: ese número sigue sin decidirse (la base entrega 3 y la app dice 4).
      expect(h).not.toMatch(/\b[34] dígitos/)
    }
  })
})
