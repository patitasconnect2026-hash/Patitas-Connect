import { describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import type { ClienteAcceso, UsuarioServidor } from '@/lib/servidor/tipos'
import type { EstadoSesion } from '@/lib/servidor/sesion'
import { TEXTO_ADMIN, TEXTO_ENTRADA_ADMIN } from '@/lib/adminTextos'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => undefined, refresh: () => undefined }) }))

import { PuertaAdmin, type OpcionesPanel } from './AdminAcceso'
import { AvisoAdmin } from './AvisoAdmin'

const RAIZ = path.resolve(__dirname, '..', '..')
const leer = (rel: string) => fs.readFileSync(path.join(RAIZ, rel), 'utf8')
const palabras = (t: string) => t.split(/\s+/).filter(Boolean).length
const cliente = {} as ClienteAcceso
const usuario: UsuarioServidor = { id: 'u1', email: 'a@b.pe' }
const conRol = (rol: string): EstadoSesion => ({ estado: 'con_sesion', usuario, perfil: { rol, nombre_pila: 'Ana' } })

/** Muestra la puerta con un «panel» espía: si se pide, queda anotado y deja una marca en la pantalla. */
function ver(sesion: EstadoSesion, extra: { fallo?: boolean; cliente?: ClienteAcceso | null } = {}) {
  const panel = vi.fn<(o: OpcionesPanel) => React.ReactNode>(() => createElement('div', null, 'MARCA-DEL-PANEL'))
  const html = renderToStaticMarkup(
    createElement(PuertaAdmin, {
      sesion,
      cliente: extra.cliente === undefined ? cliente : extra.cliente,
      fallo: extra.fallo,
      onSalir: async () => undefined,
      onEntro: () => undefined,
      onReintentar: () => undefined,
      panel,
    }),
  )
  return { html, panel }
}

describe('/admin con servidor: sin sesión no se carga nada', () => {
  it('muestra la entrada corta y no pide el panel', () => {
    const { html, panel } = ver({ estado: 'sin_sesion' })
    expect(panel).not.toHaveBeenCalled()
    expect(html).not.toContain('MARCA-DEL-PANEL')
    expect(html).toContain(TEXTO_ENTRADA_ADMIN.titulo)
    expect(html).toContain('type="email"')
    expect(html).toContain('type="password"')
    expect(html).toContain(TEXTO_ENTRADA_ADMIN.boton)
  })
  it('la entrada no ofrece crear cuenta ni recuperar contraseña (las cuentas del equipo se crean a mano)', () => {
    const { html } = ver({ estado: 'sin_sesion' })
    expect(html).not.toMatch(/Crear cuenta|Olvidé|Soy familia|Soy paseador|registr/i)
  })
  it('mientras carga, tampoco', () => {
    const { html, panel } = ver({ estado: 'cargando' })
    expect(panel).not.toHaveBeenCalled()
    expect(html).not.toContain('MARCA-DEL-PANEL')
    expect(html).toContain(TEXTO_ENTRADA_ADMIN.espera)
  })
})

describe('/admin con servidor: con sesión pero sin rol «equipo»', () => {
  it.each(['familia', 'paseador', 'Equipo', 'admin'])('rol «%s»: «Esta cuenta no tiene acceso» y nada más', (rol) => {
    const { html, panel } = ver(conRol(rol))
    expect(panel).not.toHaveBeenCalled()
    expect(html).not.toContain('MARCA-DEL-PANEL')
    expect(html).toContain('Esta cuenta no tiene acceso')
    expect(html).toContain('Salir')
    expect(html).not.toMatch(/Postulaciones|Pagos|Casos|Panel del equipo|type="password"/)
  })
  it('una cuenta sin perfil tampoco entra', () => {
    const { html, panel } = ver({ estado: 'con_sesion', usuario, perfil: null })
    expect(panel).not.toHaveBeenCalled()
    expect(html).toContain('Esta cuenta no tiene acceso')
  })
})

describe('/admin con servidor: rol «equipo»', () => {
  it('pide el panel una vez, con «Salir»', () => {
    const { html, panel } = ver(conRol('equipo'))
    expect(panel).toHaveBeenCalledTimes(1)
    expect(panel.mock.calls[0][0].equipo).toBeDefined()
    expect(html).toContain('MARCA-DEL-PANEL')
    expect(html).not.toContain('Esta cuenta no tiene acceso')
  })
  it('si la base no respondió, no se sabe el rol: no se muestra el panel y se ofrece reintentar', () => {
    const { html, panel } = ver({ estado: 'con_sesion', usuario, perfil: null, perfilNoLeido: true })
    expect(panel).not.toHaveBeenCalled()
    expect(html).not.toContain('MARCA-DEL-PANEL')
    expect(html).toContain(TEXTO_ENTRADA_ADMIN.noSePudo)
    expect(html).toContain(TEXTO_ENTRADA_ADMIN.reintentar)
  })
  it('si ni se pudo preparar la conexión, tampoco', () => {
    const { html, panel } = ver({ estado: 'cargando' }, { fallo: true, cliente: null })
    expect(panel).not.toHaveBeenCalled()
    expect(html).toContain(TEXTO_ENTRADA_ADMIN.noSePudo)
  })
})

describe('/admin en modo local no cambia', () => {
  it('pide el panel tal cual, sin «Salir» y sin entrada', () => {
    const { html, panel } = ver({ estado: 'local' }, { cliente: null })
    expect(panel).toHaveBeenCalledTimes(1)
    expect(panel.mock.calls[0][0]).toEqual({})
    expect(html).toBe('<div>MARCA-DEL-PANEL</div>')
  })
  it('el aviso sigue diciendo que no tiene contraseña ni inicio de sesión', () => {
    const html = renderToStaticMarkup(createElement(AvisoAdmin))
    expect(html).toContain(TEXTO_ADMIN.avisoTitulo)
    for (const l of TEXTO_ADMIN.aviso) expect(html).toContain(l)
    expect(html).toContain(TEXTO_ADMIN.avisoMas)
    expect(html).not.toContain(TEXTO_ADMIN.avisoTituloEquipo)
  })
  it('con una cuenta del equipo el aviso dice lo verdadero: los pagos, las postulaciones y los reportes vienen del servidor', () => {
    const html = renderToStaticMarkup(createElement(AvisoAdmin, { conSesion: true }))
    expect(html).toContain(TEXTO_ADMIN.avisoTituloEquipo)
    expect(html).toContain('Los pagos, las postulaciones y los reportes ya vienen del servidor.')
    expect(html).toContain('La foto del postulante sigue en su teléfono.')
    expect(html).not.toContain(TEXTO_ADMIN.avisoTitulo)
  })
})

describe('/admin: el panel solo se descarga cuando se muestra', () => {
  const sinComentarios = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
  it('la puerta carga el panel con import perezoso y nunca con import estático', () => {
    const src = sinComentarios(leer('components/admin/AdminAcceso.tsx'))
    expect(src).toMatch(/lazy\(\(\) => import\('\.\/AdminPanel'\)/)
    expect(src).not.toMatch(/^import .* from '\.\/AdminPanel'/m)
  })
  it('la página /admin pasa por la puerta, no por el panel', () => {
    const src = leer('app/admin/page.tsx')
    expect(src).toMatch(/AdminAcceso/)
    expect(src).not.toMatch(/import \{ AdminPanel \}/)
  })
  it('la lectura de datos (hooks) vive dentro del panel, no de la puerta ni de la entrada', () => {
    for (const f of ['components/admin/AdminAcceso.tsx', 'components/admin/EntradaAdmin.tsx', 'components/admin/BotonSalir.tsx']) {
      expect(sinComentarios(leer(f)), f).not.toMatch(/@\/lib\/datos|usePostulacion|useFotosPaseo|localStorage/)
    }
  })
  it('ni una contraseña ni una clave escritas en el código nuevo', () => {
    for (const f of ['lib/servidor/admin.ts', 'components/admin/AdminAcceso.tsx', 'components/admin/EntradaAdmin.tsx']) {
      const src = sinComentarios(leer(f))
      expect(src, f).not.toMatch(/process\.env\.\w*(PASS|SECRET|TOKEN|SERVICE)\w*/i)
      expect(src, f).not.toMatch(/\.upsert\(|signUp\(/)
    }
  })
})

describe('los textos nuevos de /admin no prometen protección que no existe', () => {
  const nuevos: Record<string, string> = {
    ...Object.fromEntries(Object.entries(TEXTO_ENTRADA_ADMIN)),
    eyebrowEquipo: TEXTO_ADMIN.eyebrowEquipo,
    avisoTituloEquipo: TEXTO_ADMIN.avisoTituloEquipo,
    avisoEquipo: TEXTO_ADMIN.avisoEquipo.join(' '),
    avisoMasAbrirEquipo: TEXTO_ADMIN.avisoMasAbrirEquipo,
    avisoMasEquipo: TEXTO_ADMIN.avisoMasEquipo,
  }
  it('sin «seguro», «protegido», «privado», «cifrado», «garantizado», «100 %» ni «verificado»', () => {
    for (const [k, t] of Object.entries(nuevos)) {
      expect(t, k).not.toMatch(/segur|protegid|a salvo|privad|cifrad|encript|blind|inviolable|infalible|garantiz|100\s*%|verificad|24\s*\/\s*7/i)
    }
  })
  it('lo que sí dice: los pagos, las postulaciones y los reportes vienen del servidor; solo la foto y un ajuste siguen en el teléfono', () => {
    expect(TEXTO_ADMIN.avisoEquipo.join(' ')).toMatch(/pagos, las postulaciones y los reportes ya vienen del servidor/)
    expect(TEXTO_ADMIN.avisoEquipo.join(' ')).toMatch(/foto del postulante sigue en su teléfono/)
    expect(TEXTO_ADMIN.avisoMasEquipo).toMatch(/navegador/)
    expect(TEXTO_ADMIN.avisoMasEquipo).toMatch(/los reportes/)
  })
  it('títulos hasta 5 palabras y líneas hasta 12', () => {
    for (const t of [TEXTO_ENTRADA_ADMIN.titulo, TEXTO_ENTRADA_ADMIN.sinAcceso, TEXTO_ENTRADA_ADMIN.noSePudo, TEXTO_ADMIN.avisoTituloEquipo]) {
      expect(palabras(t), t).toBeLessThanOrEqual(5)
    }
    for (const l of [TEXTO_ENTRADA_ADMIN.apoyo, TEXTO_ENTRADA_ADMIN.noSePudoApoyo, ...TEXTO_ADMIN.avisoEquipo]) {
      expect(palabras(l), l).toBeLessThanOrEqual(12)
    }
  })
  it('«Esta cuenta no tiene acceso» es exactamente el texto pedido', () => {
    expect(TEXTO_ENTRADA_ADMIN.sinAcceso).toBe('Esta cuenta no tiene acceso')
  })
})
